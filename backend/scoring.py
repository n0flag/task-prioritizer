from datetime import date, datetime
from typing import Optional


def calculate_score(
    urgency: int,
    importance: int,
    urgency_weight: float,
    importance_weight: float,
    due_date: Optional[date] = None,
    created_at: Optional[datetime] = None,
) -> tuple[float, float]:
    """
    Returns (total_score, age_bonus).

    base_score is in [1.0, 10.0] (urgency/importance 1-10, weights sum to 1.0).
    due_bonus is additive — can push total above 10.
    age_bonus grows +0.5 per week the task has existed, capped at +3.0.
    """
    base_score = (urgency * urgency_weight) + (importance * importance_weight)

    due_bonus = 0.0
    if due_date is not None:
        days_until_due = (due_date - date.today()).days
        if days_until_due < 0:
            due_bonus = 3.0
        elif days_until_due < 2:
            due_bonus = 2.0
        elif days_until_due < 7:
            due_bonus = 1.0

    age_bonus = 0.0
    if created_at is not None:
        days_old = (datetime.utcnow() - created_at).days
        age_bonus = min(3.0, (days_old // 7) * 0.5)

    total = round(base_score + due_bonus + age_bonus, 4)
    return total, round(age_bonus, 4)
