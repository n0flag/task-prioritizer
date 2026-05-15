from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Settings
from schemas import SettingsOut, SettingsUpdate

router = APIRouter()


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return db.get(Settings, 1)


@router.put("", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    settings = db.get(Settings, 1)
    settings.urgency_weight = payload.urgency_weight
    settings.importance_weight = payload.importance_weight
    settings.auto_archive_days = payload.auto_archive_days
    db.commit()
    db.refresh(settings)
    return settings
