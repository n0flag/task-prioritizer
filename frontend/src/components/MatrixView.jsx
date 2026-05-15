import React from "react";
import { useTasks } from "../hooks/useTasks.js";

const QUADRANTS = [
  {
    key: "do_now",
    label: "Do Now",
    sub: "High urgency, high importance",
    urgHigh: true,
    impHigh: true,
    border: "border-red-700",
    bg: "bg-red-950/40",
    badge: "bg-red-900 text-red-200",
  },
  {
    key: "schedule",
    label: "Schedule",
    sub: "Low urgency, high importance",
    urgHigh: false,
    impHigh: true,
    border: "border-blue-700",
    bg: "bg-blue-950/40",
    badge: "bg-blue-900 text-blue-200",
  },
  {
    key: "delegate",
    label: "Delegate",
    sub: "High urgency, low importance",
    urgHigh: true,
    impHigh: false,
    border: "border-amber-700",
    bg: "bg-amber-950/40",
    badge: "bg-amber-900 text-amber-200",
  },
  {
    key: "eliminate",
    label: "Eliminate",
    sub: "Low urgency, low importance",
    urgHigh: false,
    impHigh: false,
    border: "border-gray-700",
    bg: "bg-gray-900",
    badge: "bg-gray-700 text-gray-300",
  },
];

export default function MatrixView({ onEditTask, selectedTagId, searchQuery }) {
  const { data: tasks = [] } = useTasks(selectedTagId, false);

  const visible = tasks.filter((t) => {
    if (t.archived || t.status === "completed") return false;
    if (searchQuery?.trim()) {
      return t.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-center mb-1 text-xs text-gray-500">
        Importance →
      </div>
      <div className="flex gap-1">
        <div className="flex items-center justify-center w-5 shrink-0">
          <span
            className="text-xs text-gray-500 whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Urgency ↑
          </span>
        </div>

        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 h-[560px]">
          {[
            QUADRANTS.find((q) => q.key === "delegate"),   // top-left
            QUADRANTS.find((q) => q.key === "do_now"),     // top-right
            QUADRANTS.find((q) => q.key === "eliminate"),  // bottom-left
            QUADRANTS.find((q) => q.key === "schedule"),   // bottom-right
          ].map((q) => {
            const quadTasks = visible.filter(
              (t) => t.urgency > 5 === q.urgHigh && t.importance > 5 === q.impHigh
            );
            return (
              <Quadrant
                key={q.key}
                q={q}
                tasks={quadTasks}
                onEditTask={onEditTask}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {QUADRANTS.map((q) => (
          <div key={q.key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${q.badge}`}>{q.label}</span>
            <span>{q.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Quadrant({ q, tasks, onEditTask }) {
  return (
    <div className={`relative rounded-xl border-2 ${q.border} ${q.bg} overflow-hidden`}>
      <div className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded z-10 ${q.badge}`}>
        {q.label}
      </div>
      <div className="absolute bottom-1 right-2 text-xs text-gray-700">{tasks.length} tasks</div>

      {tasks.map((task) => {
        // Map each dimension to 10–85% within the quadrant
        const impBase = q.impHigh ? task.importance - 5 : task.importance;   // 1–5
        const urgBase = q.urgHigh ? task.urgency - 5 : task.urgency;         // 1–5
        // Jitter based on task ID to reduce overlap
        const jitter = ((task.id * 7) % 5) - 2;
        const left = Math.min(85, Math.max(5, 10 + ((impBase - 1) / 4) * 75 + jitter));
        const top  = Math.min(85, Math.max(15, 85 - ((urgBase - 1) / 4) * 70 + jitter));

        return (
          <button
            key={task.id}
            onClick={() => onEditTask(task)}
            style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}
            className="absolute max-w-[90px] truncate text-xs px-2 py-1 rounded-full bg-indigo-700 hover:bg-indigo-500 text-white border border-indigo-500 transition-colors z-10 shadow-sm"
            title={`${task.title} (U:${task.urgency} I:${task.importance} Score:${task.score})`}
          >
            {task.title}
          </button>
        );
      })}

      {tasks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-700">
          No tasks
        </div>
      )}
    </div>
  );
}
