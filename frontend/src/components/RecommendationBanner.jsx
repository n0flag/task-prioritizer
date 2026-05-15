import React from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { useRecommendation } from "../hooks/useTasks.js";

export default function RecommendationBanner() {
  const { data: task, isLoading } = useRecommendation();

  if (isLoading) return null;

  if (!task) {
    return (
      <div className="rounded-lg bg-gray-800 border border-gray-700 px-5 py-3 flex items-center gap-2.5 text-sm text-gray-400">
        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
        No open tasks — all caught up!
      </div>
    );
  }

  const scoreColor =
    task.score >= 8 ? "text-red-400" :
    task.score >= 5 ? "text-amber-400" :
    "text-emerald-400";

  return (
    <div className="rounded-lg bg-indigo-950 border border-indigo-700 px-5 py-4 flex items-center gap-4">
      <Star size={20} className="text-indigo-400 fill-indigo-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest text-indigo-400 mb-0.5">
          Recommended Focus
        </p>
        <p className="font-semibold text-lg text-white truncate">{task.title}</p>
        <div className="flex items-center gap-4 mt-0.5">
          <span className={`text-sm font-bold ${scoreColor}`}>
            Score: {task.score.toFixed(2)}
          </span>
          <span className="text-sm text-indigo-300">
            Urgency: {task.urgency} &middot; Importance: {task.importance}
          </span>
          {task.due_date && (
            <span className="text-sm text-amber-400">Due: {task.due_date}</span>
          )}
        </div>
      </div>
    </div>
  );
}
