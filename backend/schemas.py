from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from models import StatusEnum


# --- Tag ---

class TagBase(BaseModel):
    name: str = Field(..., max_length=50)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")

class TagCreate(TagBase):
    pass

class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")

class TagOut(TagBase):
    id: int
    model_config = {"from_attributes": True}


# --- SubTask ---

class SubTaskBase(BaseModel):
    title: str = Field(..., max_length=255)
    completed: bool = False
    order: int = 0

class SubTaskCreate(SubTaskBase):
    pass

class SubTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    completed: Optional[bool] = None
    order: Optional[int] = None

class SubTaskOut(SubTaskBase):
    id: int
    task_id: int
    model_config = {"from_attributes": True}


# --- Activity ---

class ActivityLogOut(BaseModel):
    id: int
    task_id: int
    action: str
    detail: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Task ---

class TaskBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=10_000)
    urgency: int = Field(default=5, ge=1, le=10)
    importance: int = Field(default=5, ge=1, le=10)
    status: StatusEnum = StatusEnum.backlog
    due_date: Optional[date] = None
    column_order: int = 0
    tag_ids: List[int] = []

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=10_000)
    urgency: Optional[int] = Field(None, ge=1, le=10)
    importance: Optional[int] = Field(None, ge=1, le=10)
    status: Optional[StatusEnum] = None
    due_date: Optional[date] = None
    column_order: Optional[int] = None
    tag_ids: Optional[List[int]] = None

class TaskStatusPatch(BaseModel):
    status: StatusEnum
    column_order: Optional[int] = None

class DependencyUpdate(BaseModel):
    depends_on_ids: List[int] = []

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    urgency: int
    importance: int
    status: StatusEnum
    due_date: Optional[date]
    column_order: int
    score: float = 0.0
    age_bonus: float = 0.0
    archived: bool = False
    archived_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    tags: List[TagOut] = []
    subtasks: List[SubTaskOut] = []
    blocked_by_ids: List[int] = []
    is_blocked: bool = False
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Settings ---

class SettingsOut(BaseModel):
    urgency_weight: float
    importance_weight: float
    auto_archive_days: int = 7
    model_config = {"from_attributes": True}

class SettingsUpdate(BaseModel):
    urgency_weight: float = Field(..., ge=0.0, le=1.0)
    importance_weight: float = Field(..., ge=0.0, le=1.0)
    auto_archive_days: int = Field(default=7, ge=0)

    @model_validator(mode="after")
    def weights_sum_to_one(self) -> SettingsUpdate:
        total = round(self.urgency_weight + self.importance_weight, 6)
        if abs(total - 1.0) > 0.001:
            raise ValueError(
                f"urgency_weight + importance_weight must equal 1.0, got {total}"
            )
        return self


# --- Project ---

class ProjectBase(BaseModel):
    name: str = Field(..., max_length=100)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")

class ProjectOut(ProjectBase):
    id: int
    model_config = {"from_attributes": True}


# --- Time Entry ---

class TimeEntryBase(BaseModel):
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    description: str = ""
    date: date
    start_time: Optional[str] = None   # "HH:MM"
    end_time: Optional[str] = None     # "HH:MM"
    duration_minutes: int = Field(..., ge=1)

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntryUpdate(BaseModel):
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    description: Optional[str] = None
    date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1)

class TimeEntryOut(BaseModel):
    id: int
    project_id: Optional[int]
    task_id: Optional[int]
    description: str
    date: date
    start_time: Optional[str]
    end_time: Optional[str]
    duration_minutes: int
    project: Optional[ProjectOut] = None
    task_title: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Timesheet report ---

class ProjectHours(BaseModel):
    project_id: Optional[int]
    project_name: str
    project_color: str
    total_minutes: int
    entry_count: int

class TimesheetReport(BaseModel):
    date_from: date
    date_to: date
    total_minutes: int
    by_project: List[ProjectHours]


# --- Stats ---

class StatusCounts(BaseModel):
    backlog: int = 0
    ready: int = 0
    in_progress: int = 0
    completed: int = 0
    archived: int = 0

class DayCount(BaseModel):
    day: str
    count: int

class StatsOut(BaseModel):
    by_status: StatusCounts
    completed_by_day: List[DayCount]
    avg_score_completed: float
    total_completed: int
