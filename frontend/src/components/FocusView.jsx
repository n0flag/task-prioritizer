import React from "react";
import { useTasks, usePatchStatus } from "../hooks/useTasks.js";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
      {candidates.map((task, index) => {
        const doneSubs = task.subtasks?.filter((s) => s.completed).length ?? 0;
        const totalSubs = task.subtasks?.length ?? 0;
        const scoreColor =
          task.score >= 8 ? "text-red-400" :
          task.score >= 5 ? "text-amber-400" :
          "text-emerald-400";

        return (
          <div
            key={task.id}
            className="bg-gray-900 rounded-2xl border border-gray-700 p-6 flex flex-col gap-4 relative"
          >
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-300">
              #{index + 1}
            </div>

            <div className="pr-10">
              <h3 className="font-bold text-lg leading-snug">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className={`text-3xl font-black tabular-nums ${scoreColor}`}>
                {task.score.toFixed(1)}
              </span>
              <div className="text-sm text-gray-500 leading-tight">
                <div>Urgency: {task.urgency}</div>
                <div>Importance: {task.importance}</div>
              </div>
            </div>

            {task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    style={{ backgroundColor: tag.color + "22", color: tag.color, borderColor: tag.color + "55" }}
                    className="text-xs px-1.5 py-0.5 rounded border"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {task.due_date && (
              <p className="text-xs text-amber-400">Due: {task.due_date}</p>
            )}

            {totalSubs > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{doneSubs}/{totalSubs} subtasks</span>
                  <span>{Math.round((doneSubs / totalSubs) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full">
                  <div
                    className="h-1.5 bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${(doneSubs / totalSubs) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-800">
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
                className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
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
