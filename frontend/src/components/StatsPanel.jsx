import React from "react";
import { CheckCircle2, TrendingUp, Archive, LayoutList } from "lucide-react";
import { useStats } from "../hooks/useTasks.js";

const STATUS_META = {
  backlog:     { label: "Backlog",     color: "bg-slate-500",   text: "text-slate-300" },
  ready:       { label: "Ready",       color: "bg-blue-500",    text: "text-blue-300" },
  in_progress: { label: "In Progress", color: "bg-amber-500",   text: "text-amber-300" },
  completed:   { label: "Completed",   color: "bg-emerald-500", text: "text-emerald-300" },
  archived:    { label: "Archived",    color: "bg-gray-600",    text: "text-gray-400" },
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
          <h2 className="text-lg font-bold mb-5">Stats</h2>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Top stat cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <StatCard
                  icon={<CheckCircle2 size={18} className="text-indigo-400" />}
                  value={stats.total_completed}
                  label="Completed"
                  valueColor="text-indigo-400"
                />
                <StatCard
                  icon={<TrendingUp size={18} className="text-amber-400" />}
                  value={stats.avg_score_completed.toFixed(1)}
                  label="Avg Score"
                  valueColor="text-amber-400"
                />
                <StatCard
                  icon={<Archive size={18} className="text-gray-400" />}
                  value={stats.by_status.archived ?? 0}
                  label="Archived"
                  valueColor="text-gray-400"
                />
              </div>

              {/* Status breakdown */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <LayoutList size={14} />
                  Tasks by Status
                </h3>
                <StatusBreakdown byStatus={stats.by_status} />
              </div>

              {/* Completions chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
                  Completed per Day
                  <span className="text-gray-600 font-normal ml-1">(last 30 days)</span>
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

function StatCard({ icon, value, label, valueColor }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {icon}
        <span className={`text-2xl font-black tabular-nums ${valueColor}`}>{value}</span>
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function StatusBreakdown({ byStatus }) {
  const order = ["backlog", "ready", "in_progress", "completed", "archived"];
  const total = order.reduce((sum, key) => sum + (byStatus[key] ?? 0), 0);

  return (
    <div className="space-y-2">
      {order.map((key) => {
        const meta = STATUS_META[key];
        const count = byStatus[key] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span className={`w-24 shrink-0 text-xs ${meta.text}`}>{meta.label}</span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${meta.color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-6 text-right tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ data }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-32 bg-gray-800 rounded-lg px-3 pt-2 pb-5 overflow-x-auto relative">
      {data.map((d) => {
        const heightPct = (d.count / maxCount) * 100;
        return (
          <div
            key={d.day}
            className="flex flex-col items-center justify-end gap-0 shrink-0 flex-1 min-w-[14px] max-w-[28px] h-full"
          >
            <div
              className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-t transition-all cursor-default"
              style={{ height: `${heightPct}%`, minHeight: heightPct > 0 ? "3px" : "0" }}
              title={`${d.day}: ${d.count} completed`}
            />
          </div>
        );
      })}
      {/* X-axis date labels — show only first, middle, last */}
      <div className="absolute bottom-1 left-3 right-3 flex justify-between pointer-events-none">
        <span className="text-[9px] text-gray-600">{data[0]?.day.slice(5)}</span>
        <span className="text-[9px] text-gray-600">{data[Math.floor(data.length / 2)]?.day.slice(5)}</span>
        <span className="text-[9px] text-gray-600">{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}
