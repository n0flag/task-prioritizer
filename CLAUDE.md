# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

**Run the full stack (production mode):**
```bash
docker compose up --build
```

**Run with hot-reload for development:**
```bash
docker compose -f docker-compose.dev.yml up
```

**Frontend only (outside Docker):**
```bash
cd frontend && npm run dev      # dev server on :5173
cd frontend && npm run build    # production build
```

There are no automated tests in this project.

To enable the FastAPI interactive docs (disabled in production), set `SHOW_DOCS=true` in the backend environment.

---

## Architecture

### Request flow
Browser → nginx (:3000) → serves `/` as SPA static files, proxies `/api/*` → FastAPI backend (:8000) → SQLite via SQLAlchemy.

### Backend (`backend/`)
- **FastAPI** app with seven routers: `tasks`, `subtasks`, `tags`, `settings`, `stats`, `time_entries`, `projects`
- **SQLite** database at `/data/tasks.db` (volume-mounted). Schema migrations are applied as raw SQL strings in the `MIGRATIONS` list in `main.py` inside the `lifespan` handler, before `Base.metadata.create_all()`. Add new migrations there — they are wrapped in try/except so they are safe to re-run.
- **`scoring.py`** is the single source of truth for the priority score: `base = urgency * w + importance * (1-w)`, plus a due-date bonus (0–3) and an age bonus (0–3, +0.5/week). Both `tasks.py` and `stats.py` call this directly.
- **`_enrich()`** in `routers/tasks.py` wraps every `Task` ORM object into a `TaskOut` schema, injecting `score`, `age_bonus`, `blocked_by_ids`, and `is_blocked`. All read endpoints pass through this function.
- **Settings** are a singleton row (`id=1`) in the `settings` table, storing `urgency_weight`, `importance_weight`, and `auto_archive_days`. Retrieved with `db.get(Settings, 1)` throughout.
- Fixed-path routes (`/recommend`, `/archive-completed` in `tasks.py`; `/report`, `/export` in `time_entries.py`) are declared **before** `/{id}` parameterised routes to avoid routing conflicts — this ordering must be preserved.

### Frontend (`frontend/src/`)
- **No client-side router.** View state (`kanban` / `focus` / `matrix`) and all modal visibility are plain `useState` in `App.jsx`.
- **All API calls** go through `api/client.js` (axios instance with `baseURL: "/api"`). Every endpoint is wrapped in a custom hook in `hooks/useTasks.js` using TanStack Query.
- **Cache invalidation pattern:** `useInvalidateAll()` in `useTasks.js` invalidates `["tasks"]`, `["recommend"]`, and `["stats"]` together. Every task-mutating hook calls this on success. Tag and settings mutations invalidate their own keys only.
- **Drag-and-drop** (Kanban) uses `@dnd-kit`. `KanbanBoard` owns the `DndContext`; `KanbanColumn` is the droppable; `TaskCard` is the sortable. Dropping calls `patchStatus` which updates both `status` and `column_order`.
- **Dynamic tag colours** use inline `style` attributes (e.g. `style={{ backgroundColor: tag.color }}`). The CSP in `nginx.conf` includes `style-src 'unsafe-inline'` specifically because of this.
- **Tailwind** is configured with the Inter font family. No custom colour tokens — all colours use Tailwind's built-in palette.
