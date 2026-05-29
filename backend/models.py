import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Boolean,
    ForeignKey, Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from database import Base


class StatusEnum(str, enum.Enum):
    backlog = "backlog"
    ready = "ready"
    in_progress = "in_progress"
    completed = "completed"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    urgency = Column(Integer, nullable=False, default=5)
    importance = Column(Integer, nullable=False, default=5)
    status = Column(SAEnum(StatusEnum), nullable=False, default=StatusEnum.backlog)
    due_date = Column(Date, nullable=True)
    column_order = Column(Integer, nullable=False, default=0)
    archived = Column(Boolean, nullable=False, default=False)
    archived_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tags = relationship("Tag", secondary="task_tags", back_populates="tasks")
    subtasks = relationship(
        "SubTask", back_populates="task",
        cascade="all, delete-orphan",
        order_by="SubTask.order",
    )
    activity_logs = relationship(
        "ActivityLog", back_populates="task",
        cascade="all, delete-orphan",
    )
    # Outgoing dependencies: tasks THIS task depends on
    dependencies = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.task_id",
        cascade="all, delete-orphan",
    )


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    color = Column(String(7), nullable=False, default="#6366f1")

    tasks = relationship("Task", secondary="task_tags", back_populates="tags")


class TaskTag(Base):
    __tablename__ = "task_tags"

    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    depends_on_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)


class SubTask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    completed = Column(Boolean, nullable=False, default=False)
    order = Column(Integer, nullable=False, default=0)

    task = relationship("Task", back_populates="subtasks")


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(100), nullable=False)
    detail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="activity_logs")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    urgency_weight = Column(Float, nullable=False, default=0.5)
    importance_weight = Column(Float, nullable=False, default=0.5)
    auto_archive_days = Column(Integer, nullable=False, default=7)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    color = Column(String(7), nullable=False, default="#6366f1")

    time_entries = relationship("TimeEntry", back_populates="project", cascade="all, delete-orphan")


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    description = Column(String, nullable=False, default="")
    date = Column(Date, nullable=False)
    start_time = Column(String(5), nullable=True)   # "HH:MM"
    end_time = Column(String(5), nullable=True)     # "HH:MM"
    duration_minutes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="time_entries")
    task = relationship("Task")
