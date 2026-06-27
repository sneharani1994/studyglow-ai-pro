import { api } from "../client";

export interface DashboardStats {
  profile: {
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    level: number;
    xp: number;
    studyStreak: number;
    totalStudyHours: number;
  };
  recentNotes: Array<{
    id: string;
    title: string;
    updated_at: string;
    subject_id: string | null;
    subjects?: { name: string; color: string } | null;
  }>;
  recentChats: Array<{ id: string; title: string; updated_at: string }>;
  flashcardsCount: number;
  plannerProgress: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionPercentage: number;
  };
  quizStatistics: { totalAttempts: number; averageScorePercentage: number };
  aiUsageCount: number;
  weeklyGoalHours: number;
  weeklyActualHours: number;
}

export const dashboardService = {
  get: (): Promise<DashboardStats> => api.get<DashboardStats>("/api/dashboard"),
};