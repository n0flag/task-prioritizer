import React from "react";
import { useTasks } from "../hooks/useTasks.js";

const QUADRANTS = [
  {
    key: "do_now",
    label: "Do Now",
    sub: "Urgent & important",
    urgHigh: true,
    impHigh: true,
    border: "border-red-800/60",
    bg: "bg-red-950/30",
    badge: "bg-red-900 text-red-200",
    dot: "bg-red-500",
  },
  {
    key: "schedule",
    label: "Schedule",
    sub: "Important, not urgent",
    urgHigh: false,
    impHigh: true,
    border: "border-blue-800/60",
    bg: "bg-blue-950/30",
    badge: "bg-blue-900 text-blue-200",
    dot: "bg-blue-500",
  },
  {
    key: "delegate",
    label: "Delegate",
    sub: "Urgent, not important",
    urgHigh: true,
    impHigh: false,
    border: "border-amber-800/60",
    bg: "bg-amber-950/30",
    badge: "bg-amber-900 text-amber-200",
    dot: "bg-amber-500",
  },
  {
    key: "eliminate",
    label: "Eliminate",
    sub: "Neither urgent nor important",
    urgHigh: false,
    impHigh: false,
    border: "border-gray-700/60",
    bg: "bg-gray-900",
    badge: "bg-gray-700 text-gray-300",
    dot: "bg-gray-500",
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

  // Layout: [delegate top-left, do_now top-right, eliminate bottom-left, schedule bottom-right]
  const layout = [
    QUADRANTS.find((q) => q.key === "delegate"),
    QUADRANTS.find((q) => q.key === "do_now"),
    QUADRANTS.find((q) => q.key === "eliminate"),
    QUADRANTS.find((q) => q.key === "schedule"),
  ];

  return (
    <div>
      {/* Axis label — importance (horizontal) */}
      <div className="flex items-center justify-center mb-1 gap-2 text-xs text-gray-600">
        <span>Low importance</span>
        <div className="flex-1 max-w-xs h-px bg-gray-700 relative">
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2">→</span>
        </div>
        <span>High importance</span>
      </div>

      <div className="flex gap-2">
        {/* Axis label — urgency (vertical) */}
        <div className="flex items-center justify-center w-6 shrink-0">
          <div className="flex flex-col items-center gap-1 text-xs text-gray-600">
            <span className="text-[10px] whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Low urgency ↓ · ↑ High urgency
            </span>
          </div>
        </div>

        {/* 2×2 grid */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2" style={{ height: "560px" }}>
          {layout.map((q) => {
            const quadTasks = visible.filter(
              (t) => (t.urgency > 5) === q.urgHigh && (t.importance > 5) === q.impHigh
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
            <span className={`w-2 h-2 rounded-full ${q.dot}`} />
            <span className="font-medium text-gray-400">{q.label}</span>
            <span className="text-gray-600">— {q.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Quadrant({ q, tasks, onEditTask }) {
  return (
    <div className={`relative rounded-xl border ${q.border} ${q.bg} overflow-hidden`}>
      {/* Quadrant label */}
      <div className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded z-10 ${q.badge}`}>
        {q.label}
      </div>
      <div className="absolute bottom-1.5 right-2 text-[10px] text-gray-700 z-10">
        {tasks.length} task{tasks.length !== 1 ? "s" : ""}
      </div>

      {/* Center crosshair reference lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-700/20" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-700/20" />
      </div>

      {/* Task bubbles */}
      {tasks.map((task) => {
        const impBase = q.impHigh ? task.importance - 5 : task.importance;
        const urgBase = q.urgHigh ? task.urgency - 5 : task.urgency;
        const jitter = ((task.id * 7) % 5) - 2;
        const left = Math.min(83, Math.max(7, 10 + ((impBase - 1) / 4) * 73 + jitter));
        const top  = Math.min(83, Math.max(18, 83 - ((urgBase - 1) / 4) * 68 + jitter));

        return (
          <button
            key={task.id}
            onClick={() => onEditTask(task)}
            style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}
            className="absolute max-w-[96px] truncate text-xs px-2 py-1 rounded-full bg-indigo-700/90 hover:bg-indigo-500 text-white border border-indigo-500/60 transition-colors z-10 shadow-sm hover:shadow-md hover:z-20"
            title={`${task.title} (U:${task.urgency} I:${task.importance} Score:${task.score.toFixed(1)})`}
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
