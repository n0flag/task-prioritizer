from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Task, SubTask
from schemas import SubTaskCreate, SubTaskUpdate, SubTaskOut

router = APIRouter()


@router.get("/{task_id}/subtasks", response_model=List[SubTaskOut])
def list_subtasks(task_id: int, db: Session = Depends(get_db)):
    if not db.get(Task, task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return (
        db.query(SubTask)
        .filter(SubTask.task_id == task_id)
        .order_by(SubTask.order)
        .all()
    )


@router.post("/{task_id}/subtasks", response_model=SubTaskOut, status_code=201)
def create_subtask(task_id: int, payload: SubTaskCreate, db: Session = Depends(get_db)):
    if not db.get(Task, task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    count = db.query(SubTask).filter(SubTask.task_id == task_id).count()
    subtask = SubTask(
        task_id=task_id,
        title=payload.title,
        completed=payload.completed,
        order=count,
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubTaskOut)
def update_subtask(
    task_id: int, subtask_id: int, payload: SubTaskUpdate, db: Session = Depends(get_db)
):
    subtask = (
        db.query(SubTask)
        .filter(SubTask.id == subtask_id, SubTask.task_id == task_id)
        .first()
    )
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(subtask, field, value)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=204)
def delete_subtask(task_id: int, subtask_id: int, db: Session = Depends(get_db)):
    subtask = (
        db.query(SubTask)
        .filter(SubTask.id == subtask_id, SubTask.task_id == task_id)
        .first()
    )
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(subtask)
    db.commit()
