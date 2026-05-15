import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine, Base, SessionLocal
from models import Settings
from routers import tasks, tags, settings as settings_router, subtasks, stats

_show_docs = os.getenv("SHOW_DOCS", "false").lower() == "true"


# SQLite ALTER TABLE migrations — run before create_all so new columns exist
# when models are validated. Each statement is wrapped in try/except because
# SQLite raises OperationalError when the column already exists.
MIGRATIONS = [
    "ALTER TABLE tasks ADD COLUMN archived INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE tasks ADD COLUMN archived_at DATETIME",
    "ALTER TABLE tasks ADD COLUMN completed_at DATETIME",
    "ALTER TABLE settings ADD COLUMN auto_archive_days INTEGER NOT NULL DEFAULT 7",
    # Backfill completed_at for existing completed tasks so stats work correctly
    "UPDATE tasks SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run migrations for new columns on existing tables
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # Column already exists or table doesn't exist yet

    # Create all tables (idempotent — only creates missing tables)
    Base.metadata.create_all(bind=engine)

    # Ensure singleton Settings row exists
    db = SessionLocal()
    try:
        if not db.get(Settings, 1):
            db.add(Settings(id=1, urgency_weight=0.5, importance_weight=0.5, auto_archive_days=7))
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title="Task Prioritizer",
    lifespan=lifespan,
    docs_url="/docs" if _show_docs else None,
    redoc_url="/redoc" if _show_docs else None,
    openapi_url="/openapi.json" if _show_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Accept"],
)

app.include_router(tasks.router,            prefix="/api/tasks",    tags=["tasks"])
app.include_router(subtasks.router,         prefix="/api/tasks",    tags=["subtasks"])
app.include_router(tags.router,             prefix="/api/tags",     tags=["tags"])
app.include_router(settings_router.router,  prefix="/api/settings", tags=["settings"])
app.include_router(stats.router,            prefix="/api/stats",    tags=["stats"])


@app.get("/health")
def health():
    return {"status": "ok"}
