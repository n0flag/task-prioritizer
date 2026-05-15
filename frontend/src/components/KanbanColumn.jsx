import React from "react";
import { ArrowDown } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskCard from "./TaskCard.jsx";

const COLUMN_STYLES = {
  backlog: { border: "border-t-slate-500", badge: "bg-slate-700 text-slate-300" },
  ready: { border: "border-t-blue-500", badge: "bg-blue-900 text-blue-300" },
  in_progress: { border: "border-t-amber-500", badge: "bg-amber-900 text-amber-300" },
  completed: { border: "border-t-emerald-500", badge: "bg-emerald-900 text-emerald-300" },
};

export default function KanbanColumn({ column, tasks, onEditTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const styles = COLUMN_STYLES[column.id] || COLUMN_STYLES.backlog;

  return (
    <div
      className={`flex flex-col rounded-xl border-t-4 bg-gray-900 ${styles.border} ${
        isOver ? "ring-2 ring-indigo-500 ring-opacity-60" : ""
      } transition-all`}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-400">
          {column.label}
        </h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
          {tasks.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 min-h-[120px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-20 gap-1 rounded-lg border border-dashed transition-colors ${
            isOver ? "border-indigo-500/60 bg-indigo-950/30 text-indigo-400" : "border-gray-700/60 text-gray-600"
          }`}>
            <ArrowDown size={14} />
            <span className="text-[11px]">Drop tasks here</span>
          </div>
        )}
      </div>
    </div>
  );
}
