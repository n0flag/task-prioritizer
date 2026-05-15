from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Task, Tag, Settings, StatusEnum, TaskDependency, ActivityLog
from schemas import (
    TaskCreate, TaskUpdate, TaskOut, TaskStatusPatch,
    DependencyUpdate, ActivityLogOut,
)
from scoring import calculate_score

router = APIRouter()


def _get_settings(db: Session) -> Settings:
    return db.get(Settings, 1)


def _log(db: Session, task_id: int, action: str, detail: str = None):
    db.add(ActivityLog(task_id=task_id, action=action, detail=detail))


def _build_blocked_map(db: Session) -> dict[int, list[int]]:
    # Returns blockers only for tasks whose dependency is still incomplete.
    rows = (
        db.query(TaskDependency.task_id, TaskDependency.depends_on_id)
        .join(Task, Task.id == TaskDependency.depends_on_id)
        .filter(Task.status != StatusEnum.completed)
        .all()
    )
    result: dict[int, list[int]] = {}
    for task_id, dep_id in rows:
        result.setdefault(task_id, []).append(dep_id)
    return result


def _base_query(db: Session):
    return db.query(Task).options(
        selectinload(Task.tags),
        selectinload(Task.subtasks),
    )


def _enrich(task: Task, settings: Settings, blocked_map: dict) -> TaskOut:
    score, age_bonus = calculate_score(
        task.urgency,
        task.importance,
        settings.urgency_weight,
        settings.importance_weight,
        task.due_date,
        task.created_at,
    )
    out = TaskOut.model_validate(task)
    out.score = score
    out.age_bonus = age_bonus
    blockers = blocked_map.get(task.id, [])
    out.blocked_by_ids = blockers
    out.is_blocked = len(blockers) > 0
    return out


# Fixed paths must be declared before /{task_id} to avoid routing conflicts.

@router.get("", response_model=List[TaskOut])
def list_tasks(
    tag_id: Optional[int] = Query(None),
    show_archived: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = _base_query(db)
    if not show_archived:
        q = q.filter(Task.archived == False)
    if tag_id is not None:
        q = q.filter(Task.tags.any(Tag.id == tag_id))
    tasks = q.order_by(Task.status, Task.column_order).all()
    settings = _get_settings(db)
    blocked_map = _build_blocked_map(db)
    return [_enrich(t, settings, blocked_map) for t in tasks]


@router.get("/recommend", response_model=Optional[TaskOut])
def recommend(db: Session = Depends(get_db)):
    tasks = (
        _base_query(db)
        .filter(
            Task.status.in_([StatusEnum.backlog, StatusEnum.ready]),
            Task.archived == False,
        )
        .all()
    )
    if not tasks:
        return None
    settings = _get_settings(db)
    blocked_map = _build_blocked_map(db)
    enriched = [_enrich(t, settings, blocked_map) for t in tasks]
    unblocked = [t for t in enriched if not t.is_blocked]
    candidates = unblocked if unblocked else enriched
    return max(candidates, key=lambda t: t.score)


@router.post("/archive-completed", status_code=200)
def archive_completed(db: Session = Depends(get_db)):
    settings = _get_settings(db)
    days = settings.auto_archive_days
    if days == 0:
        return {"archived": 0}
    cutoff = datetime.utcnow() - timedelta(days=days)
    to_archive = (
        db.query(Task)
        .filter(
            Task.status == StatusEnum.completed,
            Task.archived == False,
            Task.completed_at != None,
            Task.completed_at <= cutoff,
        )
        .all()
    )
    now = datetime.utcnow()
    for t in to_archive:
        t.archived = True
        t.archived_at = now
        _log(db, t.id, "archived", f"auto-archived after {days} days")
    db.commit()
    return {"archived": len(to_archive)}


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = _base_query(db).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _enrich(task, _get_settings(db), _build_blocked_map(db))


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    tag_ids = payload.tag_ids or []
    task_data = payload.model_dump(exclude={"tag_ids"})
    task = Task(**task_data)
    if tag_ids:
        task.tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    db.add(task)
    db.flush()  # get task.id before logging
    _log(db, task.id, "created", task.title)
    db.commit()
    task = _base_query(db).filter(Task.id == task.id).first()
    return _enrich(task, _get_settings(db), _build_blocked_map(db))


@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = _base_query(db).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_urgency = task.urgency
    old_importance = task.importance
    update_data = payload.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in update_data.items():
        setattr(task, field, value)

    if payload.tag_ids is not None:
        task.tags = db.query(Tag).filter(Tag.id.in_(payload.tag_ids)).all()

    if payload.urgency is not None and payload.urgency != old_urgency:
        _log(db, task.id, "urgency_changed", f"{old_urgency} → {payload.urgency}")
    if payload.importance is not None and payload.importance != old_importance:
        _log(db, task.id, "importance_changed", f"{old_importance} → {payload.importance}")

    db.commit()
    task = _base_query(db).filter(Task.id == task_id).first()
    return _enrich(task, _get_settings(db), _build_blocked_map(db))


@router.patch("/{task_id}/status", response_model=TaskOut)
def update_status(task_id: int, payload: TaskStatusPatch, db: Session = Depends(get_db)):
    task = _base_query(db).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    task.status = payload.status
    if payload.column_order is not None:
        task.column_order = payload.column_order

    # Track completed_at for stats
    if payload.status == StatusEnum.completed and old_status != StatusEnum.completed:
        task.completed_at = datetime.utcnow()
    elif payload.status != StatusEnum.completed:
        task.completed_at = None

    _log(db, task.id, "status_changed", f"{old_status} → {payload.status}")
    db.commit()
    task = _base_query(db).filter(Task.id == task_id).first()
    return _enrich(task, _get_settings(db), _build_blocked_map(db))


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


@router.put("/{task_id}/dependencies", response_model=TaskOut)
def set_dependencies(task_id: int, payload: DependencyUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    ids = [i for i in payload.depends_on_ids if i != task_id]  # no self-deps
    if ids:
        found = db.query(Task.id).filter(Task.id.in_(ids)).count()
        if found != len(ids):
            raise HTTPException(status_code=400, detail="One or more dependency tasks not found")

    db.query(TaskDependency).filter(TaskDependency.task_id == task_id).delete()
    for dep_id in ids:
        db.add(TaskDependency(task_id=task_id, depends_on_id=dep_id))
    _log(db, task_id, "dependencies_changed", f"blocked by: {ids}" if ids else "no blockers")
    db.commit()

    task = _base_query(db).filter(Task.id == task_id).first()
    return _enrich(task, _get_settings(db), _build_blocked_map(db))


@router.get("/{task_id}/activity", response_model=List[ActivityLogOut])
def get_activity(task_id: int, db: Session = Depends(get_db)):
    if not db.get(Task, task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.task_id == task_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )
