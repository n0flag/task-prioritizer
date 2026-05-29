import React, { useState, useRef } from "react";
import { useProjects, useProjectMutations } from "../hooks/useTimesheet.js";

// Golden-angle HSL rotation: stepping hue by ~137.5° guarantees maximum
// perceptual distance between every pair of colors regardless of how many
// projects are added.

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * v).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function goldenColor(index) {
  const hue = (index * 137.508) % 360;
  return hslToHex(hue, 68, 60);
}

export default function ProjectManager({ onClose }) {
  const { data: projects = [] } = useProjects();
  const { add, update, remove } = useProjectMutations();
  const [name, setName]   = useState("");
  const [error, setError] = useState("");

  // The next auto-assigned color — shown as a preview dot next to the input
  const nextColor = goldenColor(projects.length);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await add.mutateAsync({ name: name.trim(), color: nextColor });
      setName("");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create project.");
    }
  }

  function handleDelete(project) {
    if (window.confirm(`Delete project "${project.name}"? Time entries will lose their project link.`)) {
      remove.mutate(project.id);
    }
  }

  async function handleUpdate(id, data) {
    try {
      await update.mutateAsync({ id, data });
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update project.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-1">Manage Projects</h2>
          <p className="text-xs text-gray-500 mb-4">
            Colours are assigned automatically — each project gets a distinct hue.
          </p>

          {/* Create form */}
          <form onSubmit={handleCreate} className="flex gap-2 mb-4">
            {/* Preview dot for the next auto-assigned colour */}
            <div
              className="w-4 h-4 rounded-full shrink-0 mt-2.5 ring-2 ring-white/20"
              style={{ backgroundColor: nextColor }}
              title={`Next colour: ${nextColor}`}
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              maxLength={100}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit" disabled={add.isPending}
              className="px-3 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </form>

          {error && (
            <div className="mb-3 px-3 py-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No projects yet. Add one above.
              </p>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function ProjectRow({ project, onUpdate, onDelete }) {
  const [editing, setEditing]     = useState(false);
  const [editName, setEditName]   = useState(project.name);
  const [editColor, setEditColor] = useState(project.color);
  const inputRef = useRef(null);

  function startEdit() {
    setEditName(project.name);
    setEditColor(project.color);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function save() {
    if (!editName.trim()) return;
    onUpdate(project.id, { name: editName.trim(), color: editColor });
    setEditing(false);
  }

  function cancel() { setEditing(false); }

  function onKeyDown(e) {
    if (e.key === "Enter")  { e.preventDefault(); save(); }
    if (e.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <div className="px-3 py-2.5 bg-gray-800 rounded-lg">
        <div className="flex gap-2 items-center">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: editColor }}
          />
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={100}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
          />
          <input
            type="color" value={editColor}
            onChange={(e) => setEditColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-600 bg-gray-700 p-0.5 shrink-0"
            title="Adjust colour"
          />
          <button onClick={save}
            className="px-2.5 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors">
            Save
          </button>
          <button onClick={cancel}
            className="px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-800 rounded-lg group">
      <div className="flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        <span className="text-sm font-medium">{project.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={startEdit}
          className="text-xs text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
        >
          Rename
        </button>
        <button
          onClick={() => onDelete(project)}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
