import csv
import io
from collections import defaultdict
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import TimeEntry, Project, Task
from schemas import (
    TimeEntryCreate, TimeEntryUpdate, TimeEntryOut,
    ProjectHours, TimesheetReport,
)

router = APIRouter()


def _entry_out(entry: TimeEntry) -> TimeEntryOut:
    out = TimeEntryOut.model_validate(entry)
    out.task_title = entry.task.title if entry.task else None
    return out


def _base_query(db: Session):
    return db.query(TimeEntry).options(
        selectinload(TimeEntry.project),
        selectinload(TimeEntry.task),
    )


# Fixed-path endpoints must be declared before /{entry_id}

@router.get("/report", response_model=TimesheetReport)
def get_report(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    if date_from and date_to:
        ws = date.fromisoformat(date_from)
        we = date.fromisoformat(date_to)
    else:
        today = date.today()
        ws = today - timedelta(days=today.weekday())
        we = ws + timedelta(days=6)

    entries = (
        _base_query(db)
        .filter(TimeEntry.date >= ws, TimeEntry.date <= we)
        .order_by(TimeEntry.date, TimeEntry.start_time)
        .all()
    )

    proj_map: dict = {}
    for entry in entries:
        key = entry.project_id
        if key not in proj_map:
            proj_map[key] = ProjectHours(
                project_id=key,
                project_name=entry.project.name if entry.project else "No Project",
                project_color=entry.project.color if entry.project else "#6b7280",
                total_minutes=0,
                entry_count=0,
            )
        proj_map[key].total_minutes += entry.duration_minutes
        proj_map[key].entry_count += 1

    by_project = sorted(proj_map.values(), key=lambda p: p.total_minutes, reverse=True)

    return TimesheetReport(
        date_from=ws,
        date_to=we,
        total_minutes=sum(e.duration_minutes for e in entries),
        by_project=by_project,
    )


@router.get("/export")
def export_csv(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = _base_query(db)
    if date_from:
        q = q.filter(TimeEntry.date >= date.fromisoformat(date_from))
    if date_to:
        q = q.filter(TimeEntry.date <= date.fromisoformat(date_to))
    if project_id is not None:
        q = q.filter(TimeEntry.project_id == project_id)
    entries = q.order_by(TimeEntry.date, TimeEntry.start_time).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Project", "Task", "Description", "Start", "End", "Hours"])
    for e in entries:
        writer.writerow([
            e.date.isoformat(),
            e.project.name if e.project else "",
            e.task.title if e.task else "",
            e.description,
            e.start_time or "",
            e.end_time or "",
            round(e.duration_minutes / 60, 2),
        ])

    output.seek(0)
    filename = f"timesheet_{date_from or 'all'}_{date_to or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("", response_model=List[TimeEntryOut])
def list_entries(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = _base_query(db)
    if date_from:
        q = q.filter(TimeEntry.date >= date.fromisoformat(date_from))
    if date_to:
        q = q.filter(TimeEntry.date <= date.fromisoformat(date_to))
    if project_id is not None:
        q = q.filter(TimeEntry.project_id == project_id)
    entries = q.order_by(TimeEntry.date.desc(), TimeEntry.start_time.desc()).all()
    return [_entry_out(e) for e in entries]


@router.post("", response_model=TimeEntryOut, status_code=201)
def create_entry(payload: TimeEntryCreate, db: Session = Depends(get_db)):
    if payload.project_id and not db.get(Project, payload.project_id):
        raise HTTPException(status_code=400, detail="Project not found")
    if payload.task_id and not db.get(Task, payload.task_id):
        raise HTTPException(status_code=400, detail="Task not found")
    entry = TimeEntry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    entry = _base_query(db).filter(TimeEntry.id == entry.id).first()
    return _entry_out(entry)


@router.put("/{entry_id}", response_model=TimeEntryOut)
def update_entry(entry_id: int, payload: TimeEntryUpdate, db: Session = Depends(get_db)):
    entry = db.get(TimeEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    entry = _base_query(db).filter(TimeEntry.id == entry_id).first()
    return _entry_out(entry)


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(TimeEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    db.delete(entry)
    db.commit()
