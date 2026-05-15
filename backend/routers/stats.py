from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Task, Settings, StatusEnum
from schemas import StatsOut, StatusCounts, DayCount
from scoring import calculate_score

router = APIRouter()


@router.get("", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    settings = db.get(Settings, 1)

    status_rows = (
        db.query(Task.status, func.count(Task.id))
        .filter(Task.archived == False)
        .group_by(Task.status)
        .all()
    )
    counts = {row[0]: row[1] for row in status_rows}
    archived_count = (
        db.query(func.count(Task.id)).filter(Task.archived == True).scalar() or 0
    )

    by_status = StatusCounts(
        backlog=counts.get(StatusEnum.backlog, 0),
        ready=counts.get(StatusEnum.ready, 0),
        in_progress=counts.get(StatusEnum.in_progress, 0),
        completed=counts.get(StatusEnum.completed, 0),
        archived=archived_count,
    )

    # Completed by day — last 30 days (requires completed_at to be set)
    cutoff = datetime.utcnow() - timedelta(days=30)
    recent_completed = (
        db.query(Task)
        .filter(
            Task.status == StatusEnum.completed,
            Task.completed_at != None,
            Task.completed_at >= cutoff,
        )
        .all()
    )
    day_map: dict[str, int] = defaultdict(int)
    for t in recent_completed:
        day_map[t.completed_at.date().isoformat()] += 1
    completed_by_day = [
        DayCount(day=k, count=v) for k, v in sorted(day_map.items())
    ]

    all_completed = (
        db.query(Task).filter(Task.status == StatusEnum.completed).all()
    )
    total_completed = len(all_completed)
    avg_score = 0.0
    if all_completed:
        scores = [
            calculate_score(
                t.urgency, t.importance,
                settings.urgency_weight, settings.importance_weight,
                t.due_date, t.created_at,
            )[0]
            for t in all_completed
        ]
        avg_score = round(sum(scores) / len(scores), 2)

    return StatsOut(
        by_status=by_status,
        completed_by_day=completed_by_day,
        avg_score_completed=avg_score,
        total_completed=total_completed,
    )
