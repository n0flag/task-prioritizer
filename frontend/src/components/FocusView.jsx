import React from "react";
import { Zap, Target, CalendarClock } from "lucide-react";
import { useTasks, usePatchStatus } from "../hooks/useTasks.js";

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: "text-red-400" };
  if (diff === 0) return { label: "Due today", cls: "text-amber-400" };
  if (diff === 1) return { label: "Due tomorrow", cls: "text-amber-400" };
  if (diff <= 7) return { label: `Due in ${diff}d`, cls: "text-amber-500" };
  return {
    label: `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    cls: "text-gray-400",
  };
}

export default function FocusView({ onEditTask, searchQuery }) {
  const { data: tasks = [], isLoading } = useTasks(null, false);
  const patchStatus = usePatchStatus();

  const candidates = tasks
    .filter((t) => {
      const open = ["backlog", "ready", "in_progress"].includes(t.status);
      const notArchived = !t.archived;
      const matchesSearch = !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return open && notArchived && !t.is_blocked && matchesSearch;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-gray-900 animate-pulse" />
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
        <div className="text-4xl">🎉</div>
        <p className="text-sm">No open tasks — you&apos;re all caught up!</p>
      </div>
    );
  }

  const RANK_STYLES = [
    "border-indigo-600 bg-indigo-950/30",
    "border-gray-600 bg-gray-900",
    "border-gray-700 bg-gray-900",
  ];
  const RANK_BADGE = [
    "bg-indigo-600 text-white",
    "bg-gray-700 text-gray-300",
    "bg-gray-800 text-gray-400",
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 py-4">
      {candidates.map((task, index) => {
        const doneSubs = task.subtasks?.filter((s) => s.completed).length ?? 0;
        const totalSubs = task.subtasks?.length ?? 0;
        const scoreColor =
          task.score >= 8 ? "text-red-400" :
          task.score >= 5 ? "text-amber-400" :
          "text-emerald-400";
        const dueInfo = formatDueDate(task.due_date);

        return (
          <div
            key={task.id}
            className={`rounded-2xl border-2 p-5 flex flex-col gap-3 relative transition-shadow hover:shadow-lg hover:shadow-black/30 ${RANK_STYLES[index]}`}
          >
            {/* Rank badge */}
            <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${RANK_BADGE[index]}`}>
              {index + 1}
            </div>

            {/* Title + description */}
            <div className="pr-9">
              <h3 className="font-bold text-base leading-snug">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>

            {/* Score + meta */}
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-black tabular-nums ${scoreColor}`}>
                {task.score.toFixed(1)}
              </span>
              <div className="text-xs text-gray-500 leading-relaxed">
                <div className="flex items-center gap-1">
                  <Zap size={10} className="text-amber-500" />
                  Urgency {task.urgency}
                </div>
                <div className="flex items-center gap-1">
                  <Target size={10} className="text-blue-400" />
                  Importance {task.importance}
                </div>
              </div>
            </div>

            {/* Tags */}
            {task.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    style={{ backgroundColor: tag.color + "22", color: tag.color, borderColor: tag.color + "55" }}
                    className="text-[10px] px-1.5 py-0.5 rounded border font-medium"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Due date */}
            {dueInfo && (
              <p className={`text-xs flex items-center gap-1 ${dueInfo.cls}`}>
                <CalendarClock size={11} />
                {dueInfo.label}
              </p>
            )}

            {/* Subtask progress */}
            {totalSubs > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{doneSubs}/{totalSubs} subtasks</span>
                  <span>{Math.round((doneSubs / totalSubs) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-1.5 bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${(doneSubs / totalSubs) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-3 border-t border-gray-800/60">
              <button
                onClick={() =>
                  patchStatus.mutate({ id: task.id, status: "in_progress", column_order: task.column_order })
                }
                disabled={task.status === "in_progress"}
                className="flex-1 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium disabled:opacity-40 transition-colors"
              >
                {task.status === "in_progress" ? "In Progress ✓" : "Start"}
              </button>
              <button
                onClick={() => onEditTask(task)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-700/80 hover:bg-gray-700 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
