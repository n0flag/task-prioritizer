import React, { useState } from "react";
import {
  BarChart2, Tag, SlidersHorizontal, Plus,
  ArrowUpDown, Archive, LayoutDashboard, Crosshair, LayoutGrid, Clock, FolderOpen,
} from "lucide-react";
import RecommendationBanner from "./components/RecommendationBanner.jsx";
import KanbanBoard from "./components/KanbanBoard.jsx";
import FocusView from "./components/FocusView.jsx";
import MatrixView from "./components/MatrixView.jsx";
import TimesheetView from "./components/TimesheetView.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import TagManager from "./components/TagManager.jsx";
import ProjectManager from "./components/ProjectManager.jsx";
import TaskModal from "./components/TaskModal.jsx";
import { useTags } from "./hooks/useTasks.js";

const VIEWS = ["kanban", "focus", "matrix", "timesheet"];

const VIEW_META = {
  kanban:    { label: "Kanban",    Icon: LayoutDashboard },
  focus:     { label: "Focus",     Icon: Crosshair },
  matrix:    { label: "Matrix",    Icon: LayoutGrid },
  timesheet: { label: "Timesheet", Icon: Clock },
};

export default function App() {
  const [view, setView]                   = useState("kanban");
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [modalTask, setModalTask]         = useState(null);
  const [showSettings, setShowSettings]   = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showStats, setShowStats]         = useState(false);
  const [showProjects, setShowProjects]   = useState(false);
  const [showArchived, setShowArchived]   = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [sortByScore, setSortByScore]     = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 shadow-md">
        <div className="flex items-center justify-between px-6 py-3 gap-4">
          <div className="shrink-0">
            <h1 className="text-lg font-bold tracking-tight">Task Prioritizer</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Focus on what matters most</p>
          </div>

          <div className="flex-1 max-w-xs">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="hidden sm:flex border border-gray-700 rounded-lg overflow-hidden text-sm">
            {VIEWS.map((v) => {
              const { label, Icon } = VIEW_META[v];
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-label={label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                    view === v
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowStats(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              <BarChart2 size={14} />
              <span className="hidden md:inline">Stats</span>
            </button>
            <button
              onClick={() => setShowProjects(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              <FolderOpen size={14} />
              <span className="hidden md:inline">Projects</span>
            </button>
            <button
              onClick={() => setShowTagManager(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              <Tag size={14} />
              <span className="hidden md:inline">Tags</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
            >
              <SlidersHorizontal size={14} />
              <span className="hidden md:inline">Settings</span>
            </button>
            {view !== "timesheet" && (
              <button
                onClick={() => setModalTask({})}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium transition-colors"
              >
                <Plus size={14} />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Toolbar row — kanban-specific controls */}
        {view === "kanban" && (
          <div className="flex items-center gap-3 px-6 pb-2 flex-wrap">
            <TagFilterBar selectedTagId={selectedTagId} onSelect={setSelectedTagId} />
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setSortByScore((s) => !s)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border transition-colors ${
                  sortByScore
                    ? "bg-amber-600 border-amber-600 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <ArrowUpDown size={11} />
                {sortByScore ? "Sorted by Score" : "Sort by Score"}
              </button>
              <button
                onClick={() => setShowArchived((a) => !a)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border transition-colors ${
                  showArchived
                    ? "bg-gray-600 border-gray-500 text-gray-200"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <Archive size={11} />
                {showArchived ? "Hide Archived" : "Show Archived"}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="px-6 py-5 max-w-screen-2xl mx-auto space-y-5">
        {(view === "kanban" || view === "focus") && <RecommendationBanner />}

        {view === "kanban" && (
          <KanbanBoard
            selectedTagId={selectedTagId}
            onEditTask={(task) => setModalTask(task)}
            searchQuery={searchQuery}
            sortByScore={sortByScore}
            showArchived={showArchived}
          />
        )}
        {view === "focus" && (
          <FocusView
            onEditTask={(task) => setModalTask(task)}
            searchQuery={searchQuery}
          />
        )}
        {view === "matrix" && (
          <MatrixView
            onEditTask={(task) => setModalTask(task)}
            selectedTagId={selectedTagId}
            searchQuery={searchQuery}
          />
        )}
        {view === "timesheet" && <TimesheetView />}
      </main>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex">
        {VIEWS.map((v) => {
          const { label, Icon } = VIEW_META[v];
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${
                view === v ? "text-indigo-400 font-semibold" : "text-gray-500"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {modalTask !== null && (
        <TaskModal task={modalTask} onClose={() => setModalTask(null)} />
      )}
      {showSettings    && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showTagManager  && <TagManager    onClose={() => setShowTagManager(false)} />}
      {showStats       && <StatsPanel       onClose={() => setShowStats(false)} />}
      {showProjects    && <ProjectManager   onClose={() => setShowProjects(false)} />}
    </div>
  );
}

function TagFilterBar({ selectedTagId, onSelect }) {
  const { data: tags = [] } = useTags();
  if (tags.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-xs text-gray-600">Filter:</span>
      <button
        onClick={() => onSelect(null)}
        className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
          selectedTagId === null
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "border-gray-600 text-gray-400 hover:border-gray-400"
        }`}
      >
        All
      </button>
      {tags.map((tag) => {
        const selected = selectedTagId === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() => onSelect(selected ? null : tag.id)}
            style={{
              borderColor: tag.color,
              color: selected ? "#fff" : tag.color,
              backgroundColor: selected ? tag.color : "transparent",
            }}
            className="px-2.5 py-0.5 text-xs rounded-full border transition-colors"
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
