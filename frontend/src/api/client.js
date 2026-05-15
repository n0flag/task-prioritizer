import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// --- Tasks ---
export const fetchTasks = (tagId, showArchived = false) =>
  api.get("/tasks", {
    params: {
      ...(tagId ? { tag_id: tagId } : {}),
      ...(showArchived ? { show_archived: true } : {}),
    },
  }).then((r) => r.data);

export const fetchRecommendation = () =>
  api.get("/tasks/recommend").then((r) => r.data);

export const createTask = (data) =>
  api.post("/tasks", data).then((r) => r.data);

export const updateTask = (id, data) =>
  api.put(`/tasks/${id}`, data).then((r) => r.data);

export const patchTaskStatus = (id, status, column_order) =>
  api.patch(`/tasks/${id}/status`, { status, column_order }).then((r) => r.data);

export const deleteTask = (id) =>
  api.delete(`/tasks/${id}`);

export const archiveCompleted = () =>
  api.post("/tasks/archive-completed").then((r) => r.data);

export const setDependencies = (id, depends_on_ids) =>
  api.put(`/tasks/${id}/dependencies`, { depends_on_ids }).then((r) => r.data);

export const fetchActivity = (taskId) =>
  api.get(`/tasks/${taskId}/activity`).then((r) => r.data);

// --- Subtasks ---
export const createSubtask = (taskId, data) =>
  api.post(`/tasks/${taskId}/subtasks`, data).then((r) => r.data);

export const updateSubtask = (taskId, subtaskId, data) =>
  api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, data).then((r) => r.data);

export const deleteSubtask = (taskId, subtaskId) =>
  api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);

// --- Tags ---
export const fetchTags = () =>
  api.get("/tags").then((r) => r.data);

export const createTag = (data) =>
  api.post("/tags", data).then((r) => r.data);

export const deleteTag = (id) =>
  api.delete(`/tags/${id}`);

// --- Settings ---
export const fetchSettings = () =>
  api.get("/settings").then((r) => r.data);

export const updateSettings = (data) =>
  api.put("/settings", data).then((r) => r.data);

// --- Stats ---
export const fetchStats = () =>
  api.get("/stats").then((r) => r.data);
