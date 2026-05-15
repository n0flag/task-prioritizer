import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import KanbanColumn from "./KanbanColumn.jsx";
import TaskCard from "./TaskCard.jsx";
import { useTasks, usePatchStatus } from "../hooks/useTasks.js";

const COLUMNS = [
  { id: "backlog",     label: "Backlog" },
  { id: "ready",      label: "Ready" },
  { id: "in_progress",label: "In Progress" },
  { id: "completed",  label: "Completed" },
];

export default function KanbanBoard({ selectedTagId, onEditTask, searchQuery, sortByScore, showArchived }) {
  const { data: tasks = [], isLoading } = useTasks(selectedTagId, showArchived);
  const patchStatus = usePatchStatus();
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filtered = searchQuery?.trim()
    ? tasks.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks;

  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    let colTasks = filtered.filter((t) => t.status === col.id);
    if (sortByScore) {
      colTasks = [...colTasks].sort((a, b) => b.score - a.score);
    } else {
      colTasks = colTasks.sort((a, b) => a.column_order - b.column_order);
    }
    acc[col.id] = colTasks;
    return acc;
  }, {});

  function handleDragStart(event) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const targetStatus = overTask ? overTask.status : String(over.id);
    const targetColumnTasks = tasksByColumn[targetStatus] || [];

    let newOrder;
    if (overTask && overTask.id !== dragged.id) {
      newOrder = overTask.column_order;
    } else if (!overTask) {
      newOrder = targetColumnTasks.length;
    } else {
      return;
    }

    if (dragged.status === targetStatus && dragged.column_order === newOrder) return;

    patchStatus.mutate({ id: dragged.id, status: targetStatus, column_order: newOrder });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="h-64 rounded-xl bg-gray-900 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByColumn[col.id] || []}
            onEditTask={onEditTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCard task={activeTask} onEdit={() => {}} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
