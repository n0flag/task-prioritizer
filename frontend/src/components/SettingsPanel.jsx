import React, { useState, useEffect } from "react";
import { useSettings, useUpdateSettings, useArchiveCompleted } from "../hooks/useTasks.js";

export default function SettingsPanel({ onClose }) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const archiveCompleted = useArchiveCompleted();
  const [urgencyWeight, setUrgencyWeight] = useState(0.5);
  const [archiveDays, setArchiveDays] = useState(7);
  const [error, setError] = useState("");
  const [archiveResult, setArchiveResult] = useState(null);

  useEffect(() => {
    if (settings) {
      setUrgencyWeight(settings.urgency_weight);
      setArchiveDays(settings.auto_archive_days ?? 7);
    }
  }, [settings]);

  const importanceWeight = Math.round((1 - urgencyWeight) * 100) / 100;

  async function handleSave() {
    setError("");
    try {
      await updateSettings.mutateAsync({
        urgency_weight: urgencyWeight,
        importance_weight: importanceWeight,
        auto_archive_days: archiveDays,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save settings.");
    }
  }

  async function handleRunArchive() {
    setArchiveResult(null);
    try {
      const result = await archiveCompleted.mutateAsync();
      setArchiveResult(result.archived);
    } catch {
      setError("Archive failed.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm shadow-2xl">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-1">Settings</h2>
          <p className="text-sm text-gray-500 mb-5">Scoring weights and archive rules.</p>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Urgency Weight</span>
                <span className="text-white font-bold">{(urgencyWeight * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={urgencyWeight}
                onChange={(e) => setUrgencyWeight(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Importance Weight</span>
                <span className="text-white font-bold">{(importanceWeight * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={importanceWeight}
                onChange={(e) =>
                  setUrgencyWeight(Math.round((1 - parseFloat(e.target.value)) * 100) / 100)
                }
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="bg-gray-800 rounded-lg px-4 py-2.5 text-xs text-gray-400 font-mono">
              Score = (U × {(urgencyWeight * 100).toFixed(0)}%) + (I × {(importanceWeight * 100).toFixed(0)}%)
            </div>

            <div className="border-t border-gray-800 pt-4">
              <label className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Auto-archive completed tasks after</span>
                <span className="text-white font-bold">
                  {archiveDays === 0 ? "Disabled" : `${archiveDays} days`}
                </span>
              </label>
              <input
                type="range" min="0" max="90" step="1"
                value={archiveDays}
                onChange={(e) => setArchiveDays(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-xs text-gray-600 mt-1">Set to 0 to disable auto-archive.</p>
            </div>

            <button
              type="button"
              onClick={handleRunArchive}
              disabled={archiveCompleted.isPending}
              className="w-full py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {archiveCompleted.isPending ? "Archiving…" : "Run Archive Now"}
            </button>
            {archiveResult !== null && (
              <p className="text-xs text-center text-emerald-400">
                {archiveResult === 0
                  ? "Nothing to archive."
                  : `${archiveResult} task${archiveResult !== 1 ? "s" : ""} archived.`}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors disabled:opacity-50"
            >
              {updateSettings.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
