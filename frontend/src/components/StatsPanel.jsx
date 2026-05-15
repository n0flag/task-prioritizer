import React from "react";
import { useStats } from "../hooks/useTasks.js";

const STATUS_LABELS = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_COLORS = {
  backlog: "text-slate-400",
  ready: "text-blue-400",
  in_progress: "text-amber-400",
  completed: "text-emerald-400",
  archived: "text-gray-500",
};

export default function StatsPanel({ onClose }) {
  const { data: stats, isLoading } = useStats();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-5">Stats Dashboard</h2>

          {isLoading ? (
            <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Total Completed", value: stats.total_completed, color: "text-indigo-400" },
                  { label: "Avg Score (Completed)", value: stats.avg_score_completed.toFixed(2), color: "text-amber-400" },
                  { label: "Archived", value: stats.by_status.archived, color: "text-gray-400" },
                ].map((card) => (
                  <div key={card.label} className="bg-gray-800 rounded-lg p-4 text-center">
                    <div className={`text-3xl font-black ${card.color}`}>{card.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{card.label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Tasks by Status</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <div key={key} className="bg-gray-800 rounded-lg p-3 text-center">
                      <div className={`text-xl font-bold ${STATUS_COLORS[key]}`}>
                        {stats.by_status[key]}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
                  Completed per Day <span className="text-gray-600 font-normal">(last 30 days)</span>
                </h3>
                {stats.completed_by_day.length === 0 ? (
                  <div className="text-xs text-gray-600 py-6 text-center border border-dashed border-gray-700 rounded-lg">
                    No completions in the last 30 days.
                  </div>
                ) : (
                  <BarChart data={stats.completed_by_day} />
                )}
              </div>
            </>
          ) : null}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-36 bg-gray-800 rounded-lg p-3 overflow-x-auto">
      {data.map((d) => {
        const heightPct = (d.count / maxCount) * 100;
        return (
          <div
            key={d.day}
            className="flex flex-col items-center justify-end gap-1 shrink-0 flex-1 min-w-[18px] max-w-[32px] h-full"
          >
            <div
              className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-t transition-all"
              style={{ height: `${heightPct}%` }}
              title={`${d.day}: ${d.count} completed`}
            />
            <span className="text-gray-600 text-[9px] truncate w-full text-center">
              {d.day.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
