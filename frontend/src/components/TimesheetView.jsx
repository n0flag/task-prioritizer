import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Download, Plus, Pencil, Trash2 } from "lucide-react";
import {
  useTimesheetReport, useTimeEntryMutations, useProjects, useTimeEntries,
} from "../hooks/useTimesheet.js";
import { useTasks } from "../hooks/useTasks.js";
import { exportTimesheetCsv } from "../api/client.js";
import TimeEntryModal from "./TimeEntryModal.jsx";

// Format a Date as YYYY-MM-DD in LOCAL time (never use toISOString — it returns UTC
// which shifts the date for users in UTC+ timezones, causing infinite loops).
function localISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  return localISO(dt);
}

function addDays(isoDate, n) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return localISO(new Date(y, m - 1, d + n));
}

function fmtDate(isoDate) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long", month: "short", day: "numeric",
  });
}

function fmtWeekRange(ws, we) {
  const opts = { month: "short", day: "numeric" };
  const a = new Date(ws + "T00:00:00").toLocaleDateString(undefined, opts);
  const b = new Date(we + "T00:00:00").toLocaleDateString(undefined, { ...opts, year: "numeric" });
  return `${a} – ${b}`;
}

export function fmtHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getISOWeekNumber(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
}

const VIEW_MODES = [
  { key: "week",  label: "Week"  },
  { key: "month", label: "Month" },
  { key: "year",  label: "Year"  },
];

function initialPeriodForMode(mode) {
  const now = new Date();
  if (mode === "week")  return isoMonday(now);
  if (mode === "month") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return `${now.getFullYear()}-01-01`;
}

function computePeriod(viewMode, periodStart) {
  if (viewMode === "week") {
    const ws = periodStart;
    const we = addDays(ws, 6);
    const weekNum = getISOWeekNumber(ws);
    return { dateFrom: ws, dateTo: we, label: `Week ${weekNum} · ${fmtWeekRange(ws, we)}` };
  }
  if (viewMode === "month") {
    const [y, m] = periodStart.split("-").map(Number);
    const dateFrom = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const dateTo = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const label = new Date(dateFrom + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return { dateFrom, dateTo, label };
  }
  const y = periodStart.slice(0, 4);
  return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31`, label: y };
}

function navigatePeriod(viewMode, periodStart, direction) {
  if (viewMode === "week") return addDays(periodStart, direction * 7);
  if (viewMode === "month") {
    const [y, m] = periodStart.split("-").map(Number);
    const next = new Date(y, m - 1 + direction, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const y = parseInt(periodStart.slice(0, 4));
  return `${y + direction}-01-01`;
}

export default function TimesheetView() {
  const [viewMode, setViewMode]       = useState("week");
  const [periodStart, setPeriodStart] = useState(() => isoMonday(new Date()));
  const [modal, setModal]             = useState(null);

  const { dateFrom, dateTo, label } = computePeriod(viewMode, periodStart);

  const { data: report, isLoading: reportLoading } = useTimesheetReport(dateFrom, dateTo);
  const { data: entries = [], isLoading: entriesLoading } = useTimeEntries({ date_from: dateFrom, date_to: dateTo });
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] }    = useTasks(null, false);
  const entryMutations          = useTimeEntryMutations();

  const isLoading = reportLoading || entriesLoading;

  function navigate(dir) {
    setPeriodStart((ps) => navigatePeriod(viewMode, ps, dir));
  }

  function switchMode(newMode) {
    setViewMode(newMode);
    setPeriodStart(initialPeriodForMode(newMode));
  }

  function goToMonth(monthStart) {
    setViewMode("month");
    setPeriodStart(monthStart);
  }

  function handleDelete(entry) {
    if (window.confirm(`Delete "${entry.description || "this entry"}"?`)) {
      entryMutations.remove.mutate(entry.id);
    }
  }

  // Default date for new entries: today if it falls in range, otherwise first of period
  const today = new Date().toISOString().slice(0, 10);
  const defaultEntryDate = today >= dateFrom && today <= dateTo ? today : dateFrom;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-200 min-w-[230px] text-center">
            {label}
          </span>
          <button onClick={() => navigate(1)}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => { switchMode(viewMode); }}
            className="px-2.5 py-1 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 transition-colors"
          >
            Today
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex border border-gray-700 rounded-lg overflow-hidden text-xs">
          {VIEW_MODES.map(({ key, label: ml }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === key
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {ml}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {report && (
            <span className="text-sm text-gray-400">
              Total: <span className="font-bold text-white">{fmtHours(report.total_minutes)}</span>
            </span>
          )}
          <button
            onClick={() => exportTimesheetCsv({ date_from: dateFrom, date_to: dateTo })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
          >
            <Plus size={14} />
            Log Time
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="h-32 rounded-xl bg-gray-900 animate-pulse" />
      ) : viewMode === "year" ? (
        <YearView
          entries={entries}
          report={report}
          year={dateFrom.slice(0, 4)}
          onMonthClick={goToMonth}
          onEdit={(entry) => setModal(entry)}
          onDelete={handleDelete}
        />
      ) : (
        <>
          {report && report.by_project.length > 0 ? (
            <ProjectSummary report={report} />
          ) : (
            <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-10 text-center">
              <p className="text-gray-500 text-sm">No time logged this period.</p>
              <button
                onClick={() => setModal({})}
                className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 underline underline-offset-2"
              >
                Log your first entry
              </button>
            </div>
          )}
          {entries.length > 0 && (
            <DailyEntries
              entries={entries}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onEdit={(entry) => setModal(entry)}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {modal !== null && (
        <TimeEntryModal
          entry={modal}
          projects={projects}
          tasks={tasks}
          defaultDate={modal?.date || defaultEntryDate}
          onClose={() => setModal(null)}
          mutations={entryMutations}
        />
      )}
    </div>
  );
}

function ProjectSummary({ report, entries = [], onEdit = null, onDelete = null }) {
  const [expanded, setExpanded] = useState({ active: false, id: undefined });
  const isExpandable = entries.length > 0;
  const max = Math.max(...report.by_project.map((p) => p.total_minutes), 1);

  function toggleExpand(projectId) {
    setExpanded((prev) =>
      prev.active && prev.id === projectId
        ? { active: false, id: undefined }
        : { active: true, id: projectId }
    );
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400">Hours by Project</h3>
        <span className="text-xs text-gray-600">{fmtHours(report.total_minutes)} total</span>
      </div>
      <div className="space-y-3">
        {report.by_project.map((proj) => {
          const pct = (proj.total_minutes / max) * 100;
          const isExpanded = expanded.active && expanded.id === proj.project_id;
          const projEntries = isExpandable
            ? entries
                .filter((e) => (e.project?.id ?? null) === proj.project_id)
                .sort((a, b) => b.date.localeCompare(a.date))
            : [];

          return (
            <div key={proj.project_id ?? "none"}>
              <div
                onClick={() => isExpandable && toggleExpand(proj.project_id)}
                className={`flex items-center justify-between text-sm mb-1.5 rounded ${
                  isExpandable ? "cursor-pointer hover:opacity-80 select-none" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {isExpandable && (
                    <ChevronDown
                      size={14}
                      className={`text-gray-500 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
                    />
                  )}
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.project_color }} />
                  <span className="font-medium">{proj.project_name}</span>
                  <span className="text-gray-600 text-xs">
                    {proj.entry_count} {proj.entry_count === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <span className="font-bold tabular-nums text-gray-200">{fmtHours(proj.total_minutes)}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: proj.project_color }}
                />
              </div>
              {isExpanded && projEntries.length > 0 && (
                <div className="mt-2 rounded-lg border border-gray-800 overflow-hidden">
                  {projEntries.map((entry) => (
                    <ProjectEntryRow
                      key={entry.id}
                      entry={entry}
                      onEdit={onEdit ? () => onEdit(entry) : null}
                      onDelete={onDelete ? () => onDelete(entry) : null}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectEntryRow({ entry, onEdit, onDelete }) {
  const dateLabel = new Date(entry.date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/40 last:border-0 group hover:bg-gray-800/30 transition-colors">
      <span className="text-xs text-gray-500 w-28 shrink-0">{dateLabel}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          {entry.description || <span className="text-gray-600 italic">No description</span>}
        </p>
        {entry.task_title && (
          <span className="text-xs text-indigo-400 truncate">↳ {entry.task_title}</span>
        )}
        {entry.start_time && entry.end_time && (
          <span className="text-xs text-gray-600 ml-2">{entry.start_time}–{entry.end_time}</span>
        )}
      </div>
      <span className="text-sm font-bold tabular-nums text-gray-300 shrink-0">
        {fmtHours(entry.duration_minutes)}
      </span>
      {(onEdit || onDelete) && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button onClick={onEdit}
              className="p-1.5 rounded text-gray-500 hover:text-indigo-400 hover:bg-gray-700 transition-colors"
              title="Edit">
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete}
              className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
              title="Delete">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DailyEntries({ entries, dateFrom, dateTo, onEdit, onDelete }) {
  const days = [];
  let cur = dateFrom;
  while (cur <= dateTo) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const daysWithEntries = days.filter((d) => entries.some((e) => e.date === d));

  return (
    <div className="space-y-3">
      {daysWithEntries.map((day) => {
        const dayEntries = entries.filter((e) => e.date === day);
        const dayTotal = dayEntries.reduce((s, e) => s + e.duration_minutes, 0);
        return (
          <div key={day} className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/60 border-b border-gray-800">
              <span className="text-sm font-semibold text-gray-300">{fmtDate(day)}</span>
              <span className="text-xs font-medium text-gray-400">{fmtHours(dayTotal)}</span>
            </div>
            {dayEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function YearView({ entries, report, year, onMonthClick, onEdit, onDelete }) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthPrefix = `${year}-${String(i + 1).padStart(2, "0")}`;
    const monthStart  = `${monthPrefix}-01`;
    const monthEntries = entries.filter((e) => e.date.startsWith(monthPrefix));
    const total = monthEntries.reduce((s, e) => s + e.duration_minutes, 0);
    const monthLabel = new Date(monthStart + "T00:00:00").toLocaleDateString(undefined, { month: "long" });
    return { monthStart, monthLabel, total, entryCount: monthEntries.length };
  });

  const maxMinutes = Math.max(...months.map((m) => m.total), 1);
  const yearTotal  = months.reduce((s, m) => s + m.total, 0);

  return (
    <div className="space-y-5">
      {report && report.by_project.length > 0 && (
        <ProjectSummary report={report} entries={entries} onEdit={onEdit} onDelete={onDelete} />
      )}

      {yearTotal === 0 ? (
        <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-10 text-center">
          <p className="text-gray-500 text-sm">No time logged in {year}.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">{year} — Month by Month</span>
            <span className="text-xs text-gray-400">{fmtHours(yearTotal)} total</span>
          </div>
          <div className="divide-y divide-gray-800/40">
            {months.map(({ monthStart, monthLabel, total, entryCount }) => {
              const pct = (total / maxMinutes) * 100;
              const hasData = total > 0;
              return (
                <button
                  key={monthStart}
                  onClick={() => hasData && onMonthClick(monthStart)}
                  disabled={!hasData}
                  className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                    hasData
                      ? "hover:bg-gray-800/40 cursor-pointer"
                      : "cursor-default opacity-35"
                  }`}
                >
                  <span className="text-sm font-medium text-gray-300 w-24 shrink-0">{monthLabel}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    {hasData && (
                      <div
                        className="h-2 bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-200 w-16 text-right shrink-0">
                    {hasData ? fmtHours(total) : "—"}
                  </span>
                  <span className="text-xs text-gray-600 w-20 shrink-0 text-right">
                    {hasData ? `${entryCount} ${entryCount === 1 ? "entry" : "entries"}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/40 last:border-0 group hover:bg-gray-800/30 transition-colors">
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: entry.project?.color ?? "#6b7280" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {entry.description || <span className="text-gray-600 italic">No description</span>}
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-xs">
          {entry.project ? (
            <span style={{ color: entry.project.color }}>{entry.project.name}</span>
          ) : (
            <span className="text-gray-600">No project</span>
          )}
          {entry.task_title && (
            <span className="text-indigo-400 truncate">↳ {entry.task_title}</span>
          )}
          {entry.start_time && entry.end_time && (
            <span className="text-gray-600">{entry.start_time}–{entry.end_time}</span>
          )}
        </div>
      </div>
      <span className="text-sm font-bold tabular-nums text-gray-300 shrink-0">
        {fmtHours(entry.duration_minutes)}
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit}
          className="p-1.5 rounded text-gray-500 hover:text-indigo-400 hover:bg-gray-700 transition-colors"
          title="Edit">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete}
          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
          title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
