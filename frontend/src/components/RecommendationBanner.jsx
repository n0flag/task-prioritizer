import React from "react";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { useRecommendation, usePatchStatus } from "../hooks/useTasks.js";

export default function RecommendationBanner() {
  const { data: task, isLoading } = useRecommendation();
  const patchStatus = usePatchStatus();

  if (isLoading) return null;

  if (!task) {
    return (
      <div className="rounded-lg bg-gray-800/60 border border-gray-700 px-5 py-3 flex items-center gap-2.5 text-sm text-gray-400">
        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
        All caught up — no open tasks.
      </div>
    );
  }

  const scoreColor =
    task.score >= 8 ? "text-red-400" :
    task.score >= 5 ? "text-amber-400" :
    "text-emerald-400";

  const isInProgress = task.status === "in_progress";

  return (
    <div className="rounded-lg bg-indigo-950/70 border border-indigo-800/60 px-4 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-indigo-400 mb-0.5 font-medium">
          Next up
        </p>
        <p className="font-semibold text-base text-white truncate">{task.title}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className={`text-xs font-bold ${scoreColor}`}>
            {task.score.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500">
            U:{task.urgency} · I:{task.importance}
          </span>
          {task.due_date && (
            <span className="text-xs text-amber-400">Due {task.due_date}</span>
          )}
          {task.tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
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
        </div>
      </div>

      {isInProgress ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-indigo-300 shrink-0">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          In Progress
        </div>
      ) : (
        <button
          onClick={() =>
            patchStatus.mutate({ id: task.id, status: "in_progress", column_order: task.column_order })
          }
          disabled={patchStatus.isPending}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors shrink-0 disabled:opacity-50"
        >
          <PlayCircle size={14} />
          Start
        </button>
      )}
    </div>
  );
}
