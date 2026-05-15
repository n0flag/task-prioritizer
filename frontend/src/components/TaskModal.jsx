import React, { useState, useEffect, useRef } from "react";
import {
  useTags, useCreateTask, useUpdateTask,
  useSetDependencies, useSubtaskMutations,
  useTasks,
} from "../hooks/useTasks.js";
import ActivityTimeline from "./ActivityTimeline.jsx";

const URGENCY_GUIDE = [
  { max: 2,  label: "Negligible",  desc: "No deadline. Can wait months without consequence." },
  { max: 4,  label: "Low",         desc: "Should be done within a few weeks." },
  { max: 6,  label: "Moderate",    desc: "Should be done within days." },
  { max: 8,  label: "High",        desc: "Needs to be done today or tomorrow." },
  { max: 10, label: "Critical",    desc: "Must be done immediately — overdue or imminent deadline." },
];

const IMPORTANCE_GUIDE = [
  { max: 2,  label: "Negligible",  desc: "Minimal impact if skipped. Nice to have." },
  { max: 4,  label: "Low",         desc: "Small benefit. Won't significantly affect goals." },
  { max: 6,  label: "Moderate",    desc: "Meaningful impact on your work or objectives." },
  { max: 8,  label: "High",        desc: "Significant value. Clearly advances key goals." },
  { max: 10, label: "Critical",    desc: "Major consequences if not done. Top priority by impact." },
];

const LABEL_COLORS = {
  Negligible: "text-gray-400",
  Low:        "text-emerald-400",
  Moderate:   "text-blue-400",
  High:       "text-amber-400",
  Critical:   "text-red-400",
};

function getGuide(value, guide) {
  return guide.find((g) => value <= g.max) || guide[guide.length - 1];
}

function ScoreGuide({ value, guide }) {
  const entry = getGuide(value, guide);
  return (
    <div className="mt-1.5 flex items-start gap-2 text-xs">
      <span className={`font-semibold shrink-0 ${LABEL_COLORS[entry.label] || "text-gray-400"}`}>
        {entry.label}
      </span>
      <span className="text-gray-500">{entry.desc}</span>
    </div>
  );
}

export default function TaskModal({ task, onClose }) {
  const isNew = !task.id;
  const { data: allTags = [] } = useTags();
  const { data: allTasks = [] } = useTasks(null, false);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const setDeps = useSetDependencies();
  const subtaskMutations = useSubtaskMutations(task.id);

  const [form, setForm] = useState({
    title: task.title || "",
    description: task.description || "",
    urgency: task.urgency ?? 5,
    importance: task.importance ?? 5,
    status: task.status || "backlog",
    due_date: task.due_date || "",
    tag_ids: task.tags?.map((t) => t.id) || [],
    depends_on_ids: task.blocked_by_ids || [],
  });
  const [error, setError] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const subtaskInputRef = useRef(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleTag(tagId) {
    set("tag_ids",
      form.tag_ids.includes(tagId)
        ? form.tag_ids.filter((id) => id !== tagId)
        : [...form.tag_ids, tagId]
    );
  }

  function toggleDep(taskId) {
    set("depends_on_ids",
      form.depends_on_ids.includes(taskId)
        ? form.depends_on_ids.filter((id) => id !== taskId)
        : [...form.depends_on_ids, taskId]
    );
  }

  async function handleAddSubtask(e) {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    await subtaskMutations.add.mutateAsync({ title: newSubtaskTitle.trim() });
    setNewSubtaskTitle("");
    subtaskInputRef.current?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const payload = { ...form, due_date: form.due_date || null };
    const { depends_on_ids, ...taskPayload } = payload;
    try {
      if (isNew) {
        await createTask.mutateAsync(taskPayload);
      } else {
        await updateTask.mutateAsync({ id: task.id, data: taskPayload });
        // Update dependencies separately
        await setDeps.mutateAsync({ id: task.id, depends_on_ids });
      }
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || "An error occurred.");
    }
  }

  const isPending = createTask.isPending || updateTask.isPending;
  const otherTasks = allTasks.filter((t) => t.id !== task.id && !t.archived);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">{isNew ? "New Task" : "Edit Task"}</h2>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                maxLength={255}
                placeholder="What needs to be done?"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Additional context…"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Urgency <span className="text-gray-600 font-normal">(how time-sensitive?)</span></span>
                <span className="font-bold text-white">{form.urgency} / 10</span>
              </label>
              <input
                type="range" min="1" max="10" value={form.urgency}
                onChange={(e) => set("urgency", parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <ScoreGuide value={form.urgency} guide={URGENCY_GUIDE} />
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Importance / Impact <span className="text-gray-600 font-normal">(how much does it matter?)</span></span>
                <span className="font-bold text-white">{form.importance} / 10</span>
              </label>
              <input
                type="range" min="1" max="10" value={form.importance}
                onChange={(e) => set("importance", parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <ScoreGuide value={form.importance} guide={IMPORTANCE_GUIDE} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                <input
                  type="date" value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>

            {allTags.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const selected = form.tag_ids.includes(tag.id);
                    return (
                      <button
                        type="button" key={tag.id} onClick={() => toggleTag(tag.id)}
                        style={{
                          borderColor: tag.color,
                          backgroundColor: selected ? tag.color : "transparent",
                          color: selected ? "#fff" : tag.color,
                        }}
                        className="px-2.5 py-1 text-xs rounded border transition-colors"
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isNew && otherTasks.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Blocked by <span className="text-gray-600 font-normal">(this task can&apos;t start until these are done)</span>
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-800 rounded-lg p-2 border border-gray-700">
                  {otherTasks.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={form.depends_on_ids.includes(t.id)}
                        onChange={() => toggleDep(t.id)}
                        className="accent-indigo-500"
                      />
                      <span className={t.status === "completed" ? "line-through text-gray-500" : ""}>
                        {t.title}
                      </span>
                      {t.status === "completed" && (
                        <span className="text-emerald-600 text-[10px]">✓</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!isNew && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Subtasks</label>
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {task.subtasks.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 py-1 group">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() =>
                            subtaskMutations.update.mutate({ id: sub.id, data: { completed: !sub.completed } })
                          }
                          className="accent-indigo-500 shrink-0"
                        />
                        <span className={`text-sm flex-1 ${sub.completed ? "line-through text-gray-500" : ""}`}>
                          {sub.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => subtaskMutations.remove.mutate(sub.id)}
                          className="text-xs text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    ref={subtaskInputRef}
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask…"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim() || subtaskMutations.add.isPending}
                    className="px-3 py-1.5 text-xs rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
              <button
                type="button" onClick={onClose}
                className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={isPending}
                className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? "Saving…" : isNew ? "Create Task" : "Save Changes"}
              </button>
            </div>
          </form>

          {!isNew && <ActivityTimeline taskId={task.id} />}
        </div>
      </div>
    </div>
  );
}
