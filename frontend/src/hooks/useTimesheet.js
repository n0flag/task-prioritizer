import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProjects, createProject, updateProject, deleteProject,
  fetchTimeEntries, fetchTimesheetReport,
  createTimeEntry, updateTimeEntry, deleteTimeEntry,
} from "../api/client.js";

export const TS_KEYS = {
  projects: ["projects"],
  entries: (params) => ["time-entries", params],
  report: (dateFrom, dateTo) => ["timesheet-report", dateFrom ?? null, dateTo ?? null],
};

// --- Projects ---

export function useProjects() {
  return useQuery({ queryKey: TS_KEYS.projects, queryFn: fetchProjects });
}

export function useProjectMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: TS_KEYS.projects });

  const add = useMutation({ mutationFn: createProject, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, data }) => updateProject(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteProject, onSuccess: invalidate });
  return { add, update, remove };
}

// --- Time Entries ---

export function useTimeEntries(params = {}) {
  return useQuery({
    queryKey: TS_KEYS.entries(params),
    queryFn: () => fetchTimeEntries(params),
  });
}

export function useTimesheetReport(dateFrom, dateTo) {
  return useQuery({
    queryKey: TS_KEYS.report(dateFrom, dateTo),
    queryFn: () => fetchTimesheetReport(dateFrom, dateTo),
    enabled: !!(dateFrom && dateTo),
  });
}

function useInvalidateTimesheet() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["time-entries"] });
    qc.invalidateQueries({ queryKey: ["timesheet-report"] });
  };
}

export function useTimeEntryMutations() {
  const invalidate = useInvalidateTimesheet();
  const add = useMutation({ mutationFn: createTimeEntry, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, data }) => updateTimeEntry(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteTimeEntry, onSuccess: invalidate });
  return { add, update, remove };
}
