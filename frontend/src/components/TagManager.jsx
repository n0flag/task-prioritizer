import React, { useState, useRef } from "react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "../hooks/useTasks.js";

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4",
];

export default function TagManager({ onClose }) {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [name, setName]   = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await createTag.mutateAsync({ name: name.trim(), color });
      setName("");
    } catch (err) {
      const d = err?.response?.data?.detail;
      setError(typeof d === "string" ? d : "Failed to create tag.");
    }
  }

  function handleDelete(tag) {
    if (window.confirm(`Delete tag "${tag.name}"? It will be removed from all tasks.`)) {
      deleteTag.mutate(tag.id);
    }
  }

  async function handleUpdate(id, data) {
    try {
      await updateTag.mutateAsync({ id, data });
    } catch (err) {
      const d = err?.response?.data?.detail;
      setError(typeof d === "string" ? d : "Failed to rename tag.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">Manage Tags</h2>

          <form onSubmit={handleCreate} className="flex gap-2 mb-4 flex-wrap">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tag name"
              maxLength={50}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-1 items-center">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? "border-white scale-110" : "border-transparent"
                  }`}
                />
              ))}
            </div>
            <button
              type="submit" disabled={createTag.isPending}
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

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No tags yet. Create one above.
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

function TagRow({ tag, onUpdate, onDelete }) {
  const [editing, setEditing]     = useState(false);
  const [editName, setEditName]   = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color);
  const inputRef = useRef(null);

  function startEdit() {
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function save() {
    if (!editName.trim()) return;
    onUpdate(tag.id, { name: editName.trim(), color: editColor });
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  function onKeyDown(e) {
    if (e.key === "Enter")  { e.preventDefault(); save(); }
    if (e.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <div className="px-3 py-2.5 bg-gray-800 rounded-lg space-y-2">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full shrink-0 mt-2" style={{ backgroundColor: editColor }} />
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={50}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
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
        <div className="flex gap-1.5 flex-wrap pl-5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c} type="button" onClick={() => setEditColor(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                editColor === c ? "border-white scale-110" : "border-transparent"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-800 rounded-lg group">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
        <span className="text-sm font-medium">{tag.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={startEdit}
          className="text-xs text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
        >
          Rename
        </button>
        <button
          onClick={() => onDelete(tag)}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
