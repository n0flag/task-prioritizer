import React from "react";
import { Zap, Target, CalendarClock, Clock, Ban, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDeleteTask } from "../hooks/useTasks.js";

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: "text-red-400" };
  if (diff === 0) return { label: "Today", cls: "text-amber-400" };
  if (diff === 1) return { label: "Tomorrow", cls: "text-amber-400" };
  if (diff <= 7) return { label: `${diff}d`, cls: "text-amber-500" };
  return {
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    cls: "text-gray-400",
  };
}

export default function TaskCard({ task, onEdit, isDragging = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const deleteTask = useDeleteTask();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
  };

  const scoreColor =
    task.score >= 8 ? "text-red-400" :
    task.score >= 5 ? "text-amber-400" :
    "text-emerald-400";

  const doneSubs = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const totalSubs = task.subtasks?.length ?? 0;
  const subPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

  function handleDelete() {
    if (window.confirm(`Delete "${task.title}"?`)) {
      deleteTask.mutate(task.id);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg p-3 border transition-colors select-none ${
        task.archived
          ? "bg-gray-800/50 border-gray-800 opacity-60"
          : "bg-gray-800 border-gray-700 hover:border-gray-500"
      } ${isDragging ? "shadow-2xl rotate-1 cursor-grabbing" : "cursor-grab"}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-snug line-clamp-2 flex-1">
          {task.title}
        </p>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className={`text-xs font-bold tabular-nums ${scoreColor}`}>
            {task.score.toFixed(1)}
          </span>
          {task.age_bonus > 0 && (
            <span
              className="flex items-center gap-0.5 text-[10px] text-orange-400"
              title={`+${task.age_bonus} urgency creep bonus`}
            >
              <Clock size={9} />+{task.age_bonus}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 mt-1.5 text-[11px] text-gray-500">
        <span className="flex items-center gap-0.5">
          <Zap size={10} className="text-amber-500" />
          {task.urgency}
        </span>
        <span className="flex items-center gap-0.5">
          <Target size={10} className="text-blue-400" />
          {task.importance}
        </span>
        {task.due_date && task.status !== "completed" && (() => {
          const due = formatDueDate(task.due_date);
          return (
            <span className={`flex items-center gap-0.5 ${due.cls}`}>
              <CalendarClock size={10} />
              {due.label}
            </span>
          );
        })()}
        {task.archived && (
          <span className="text-gray-600 italic">archived</span>
        )}
      </div>

      {task.is_blocked && (
        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-900/30 border border-red-800/60 rounded px-1.5 py-0.5">
          <Ban size={10} /> Blocked
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              style={{
                backgroundColor: tag.color + "22",
                color: tag.color,
                borderColor: tag.color + "55",
              }}
              className="text-[10px] px-1.5 py-0.5 rounded border"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {totalSubs > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
            <span>{doneSubs}/{totalSubs} subtasks</span>
            <span>{subPct}%</span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full">
            <div
              className="h-1 bg-indigo-500 rounded-full transition-all"
              style={{ width: `${subPct}%` }}
            />
          </div>
        </div>
      )}

      <div
        className="flex gap-1 mt-2 pt-2 border-t border-gray-700/60"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onEdit(task)}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"
        >
          <Pencil size={11} /> Edit
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 hover:bg-red-900/20 px-2 py-1 rounded transition-colors ml-auto"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </div>
  );
}
