import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTasks, fetchRecommendation, fetchTags, fetchSettings, fetchStats,
  createTask, updateTask, patchTaskStatus, deleteTask,
  archiveCompleted, setDependencies, fetchActivity,
  createSubtask, updateSubtask, deleteSubtask,
  createTag, deleteTag, updateSettings,
} from "../api/client.js";

export const KEYS = {
  tasks: (tagId, showArchived) => ["tasks", tagId ?? null, showArchived ?? false],
  recommend: ["recommend"],
  tags: ["tags"],
  settings: ["settings"],
  stats: ["stats"],
  activity: (taskId) => ["activity", taskId],
};

export function useTasks(tagId, showArchived = false) {
  return useQuery({
    queryKey: KEYS.tasks(tagId, showArchived),
    queryFn: () => fetchTasks(tagId, showArchived),
  });
}

export function useRecommendation() {
  return useQuery({
    queryKey: KEYS.recommend,
    queryFn: fetchRecommendation,
  });
}

export function useTags() {
  return useQuery({ queryKey: KEYS.tags, queryFn: fetchTags });
}

export function useSettings() {
  return useQuery({ queryKey: KEYS.settings, queryFn: fetchSettings });
}

export function useStats() {
  return useQuery({ queryKey: KEYS.stats, queryFn: fetchStats });
}

export function useActivity(taskId) {
  return useQuery({
    queryKey: KEYS.activity(taskId),
    queryFn: () => fetchActivity(taskId),
    enabled: !!taskId,
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: KEYS.recommend });
    qc.invalidateQueries({ queryKey: KEYS.stats });
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: createTask, onSuccess: invalidate });
}

export function useUpdateTask() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, data }) => updateTask(id, data),
    onSuccess: invalidate,
  });
}

export function usePatchStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, status, column_order }) => patchTaskStatus(id, status, column_order),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: deleteTask, onSuccess: invalidate });
}

export function useArchiveCompleted() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: archiveCompleted, onSuccess: invalidate });
}

export function useSetDependencies() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, depends_on_ids }) => setDependencies(id, depends_on_ids),
    onSuccess: invalidate,
  });
}

export function useSubtaskMutations(taskId) {
  const qc = useQueryClient();
  const invalidateAll = useInvalidateAll();
  const refetch = () => {
    invalidateAll();
    if (taskId) qc.invalidateQueries({ queryKey: KEYS.activity(taskId) });
  };
  const add = useMutation({
    mutationFn: (data) => createSubtask(taskId, data),
    onSuccess: refetch,
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => updateSubtask(taskId, id, data),
    onSuccess: refetch,
  });
  const remove = useMutation({
    mutationFn: (id) => deleteSubtask(taskId, id),
    onSuccess: refetch,
  });
  return { add, update, remove };
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tags }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tags });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.settings });
      invalidate();
    },
  });
}
