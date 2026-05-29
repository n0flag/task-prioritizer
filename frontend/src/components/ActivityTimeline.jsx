import React from "react";
import { useActivity } from "../hooks/useTasks.js";

const ACTION_META = {
  created:              { label: "Created",              color: "text-emerald-400", dot: "bg-emerald-500" },
  status_changed:       { label: "Status changed",       color: "text-blue-400",    dot: "bg-blue-500" },
  urgency_changed:      { label: "Urgency changed",      color: "text-amber-400",   dot: "bg-amber-500" },
  importance_changed:   { label: "Importance changed",   color: "text-amber-400",   dot: "bg-amber-500" },
  dependencies_changed: { label: "Dependencies updated", color: "text-purple-400",  dot: "bg-purple-500" },
  archived:             { label: "Archived",             color: "text-gray-400",    dot: "bg-gray-500" },
};

function fmt(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityTimeline({ taskId, standalone = false }) {
  const { data: logs = [], isLoading } = useActivity(taskId);

  const inner = (
    <>
      {isLoading ? (
        <p className="text-xs text-gray-500">Loading activity…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-gray-600">No activity recorded yet.</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {logs.map((log) => {
            const meta = ACTION_META[log.action] || { label: log.action, color: "text-gray-400", dot: "bg-gray-600" };
            return (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${meta.dot}`} />
                <div className="flex-1 min-w-0">
                  <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                  {log.detail && (
                    <span className="text-gray-500 ml-1 break-all">— {log.detail}</span>
                  )}
                </div>
                <span className="text-gray-600 shrink-0 whitespace-nowrap">{fmt(log.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (standalone) return inner;

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Activity</h3>
      {inner}
    </div>
  );
}
