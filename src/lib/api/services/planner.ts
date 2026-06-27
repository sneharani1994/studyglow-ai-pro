import { api } from "../client";

export type PlannerStatus = "todo" | "in_progress" | "completed";
export type PlannerPriority = "low" | "medium" | "high";
export type PlannerRecurrence = "none" | "daily" | "weekly" | "monthly";

export interface PlannerTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: PlannerStatus;
  priority: PlannerPriority;
  recurrence: PlannerRecurrence;
  created_at: string;
  updated_at?: string;
}

export type PlannerEvent = PlannerTask;

export interface PlannerTaskInput {
  title: string;
  description?: string;
  dueDate?: string | null;
  status?: PlannerStatus;
  priority?: PlannerPriority;
  recurrence?: PlannerRecurrence;
}

export const plannerService = {
  async list(filters: {
    timeFrame?: "daily" | "weekly" | "monthly";
    status?: PlannerStatus;
    priority?: PlannerPriority;
    recurrence?: PlannerRecurrence;
  } = {}): Promise<PlannerTask[]> {
    const res = await api.get<{ tasks: PlannerTask[] }>("/api/planner/tasks", { query: filters });
    return res.tasks;
  },
  async create(input: PlannerTaskInput): Promise<PlannerTask> {
    const res = await api.post<{ task: PlannerTask }>("/api/planner/tasks", input);
    return res.task;
  },
  async update(id: string, patch: Partial<PlannerTaskInput>): Promise<PlannerTask> {
    const res = await api.put<{ task: PlannerTask }>(`/api/planner/tasks/${id}`, patch);
    return res.task;
  },
  remove: (id: string): Promise<void> =>
    api.delete(`/api/planner/tasks/${id}`, { responseType: "void" }),
};