import React, { useState } from "react";

const DURATION_MODE = "duration";
const RANGE_MODE = "range";

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHM(minutes) {
  return { hours: Math.floor(minutes / 60), mins: minutes % 60 };
}

export default function TimeEntryModal({ entry, projects, tasks, defaultDate, onClose, mutations }) {
  const isNew = !entry.id;

  const initDuration = entry.duration_minutes
    ? minutesToHM(entry.duration_minutes)
    : { hours: 1, mins: 0 };

  const [mode, setMode] = useState(
    entry.start_time && entry.end_time ? RANGE_MODE : DURATION_MODE
  );
  const [form, setForm] = useState({
    date: entry.date || defaultDate || new Date().toISOString().slice(0, 10),
    project_id: entry.project_id ?? "",
    task_id: entry.task_id ?? "",
    description: entry.description || "",
    start_time: entry.start_time || "",
    end_time: entry.end_time || "",
    hours: initDuration.hours,
    mins: initDuration.mins,
  });
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Compute duration_minutes based on current mode
  function computeDuration() {
    if (mode === RANGE_MODE) {
      if (!form.start_time || !form.end_time) return null;
      const diff = timeToMinutes(form.end_time) - timeToMinutes(form.start_time);
      return diff > 0 ? diff : null;
    }
    return form.hours * 60 + form.mins;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const duration_minutes = computeDuration();
    if (!duration_minutes || duration_minutes < 1) {
      setError(
        mode === RANGE_MODE
          ? "End time must be after start time."
          : "Duration must be at least 1 minute."
      );
      return;
    }

    const payload = {
      date: form.date,
      project_id: form.project_id ? Number(form.project_id) : null,
      task_id: form.task_id ? Number(form.task_id) : null,
      description: form.description,
      start_time: mode === RANGE_MODE ? form.start_time || null : null,
      end_time: mode === RANGE_MODE ? form.end_time || null : null,
      duration_minutes,
    };

    try {
      if (isNew) {
        await mutations.add.mutateAsync(payload);
      } else {
        await mutations.update.mutateAsync({ id: entry.id, data: payload });
      }
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save entry.");
    }
  }

  const isPending = mutations.add.isPending || mutations.update.isPending;
  const previewDuration = computeDuration();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">{isNew ? "Log Time" : "Edit Entry"}</h2>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Project</label>
              <select
                value={form.project_id}
                onChange={(e) => set("project_id", e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">— No project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What did you work on?"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Task link (optional) */}
            {tasks.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Linked Task <span className="text-gray-600">(optional)</span>
                </label>
                <select
                  value={form.task_id}
                  onChange={(e) => set("task_id", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">— None —</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Duration mode toggle */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Duration</label>
              <div className="flex border border-gray-700 rounded-lg overflow-hidden text-xs mb-3">
                {[
                  { value: DURATION_MODE, label: "Enter duration" },
                  { value: RANGE_MODE,   label: "Start / End time" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`flex-1 py-1.5 transition-colors ${
                      mode === value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === DURATION_MODE ? (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Hours</label>
                    <input
                      type="number" min="0" max="24" value={form.hours}
                      onChange={(e) => set("hours", Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Minutes</label>
                    <input
                      type="number" min="0" max="59" value={form.mins}
                      onChange={(e) => set("mins", Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Start</label>
                    <input
                      type="time" value={form.start_time}
                      onChange={(e) => set("start_time", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-gray-600 mt-4">→</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">End</label>
                    <input
                      type="time" value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Live duration preview */}
              {previewDuration !== null && previewDuration > 0 && (
                <p className="text-xs text-indigo-400 mt-1.5">
                  = {Math.floor(previewDuration / 60)}h {previewDuration % 60}m
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isPending}
                className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors disabled:opacity-50">
                {isPending ? "Saving…" : isNew ? "Log Time" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
