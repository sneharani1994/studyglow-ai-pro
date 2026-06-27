import { api } from "../client";

export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description: string;
  subject_id: string | null;
  difficulty: "easy" | "medium" | "hard";
  created_at: string;
  subjects?: { name: string } | null;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  answers: Record<string, number>;
  completed_at: string;
  quizzes?: { title: string; difficulty: string; subjects?: { name: string } | null };
}

export interface QuizAttemptResult {
  message: string;
  attempt: QuizAttempt;
  score: number;
  totalQuestions: number;
  percentage: number;
  evaluationDetails: Array<{
    questionId: string;
    questionText: string;
    userChoice: number | null;
    correctChoice: number;
    isCorrect: boolean;
    explanation: string;
  }>;
  xpEarned: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  study_streak: number;
}

export const quizzesService = {
  /** GET /api/quizzes → { quizzes } */
  async list(filters: { subjectId?: string; difficulty?: string } = {}): Promise<Quiz[]> {
    const res = await api.get<{ quizzes: Quiz[] }>("/api/quizzes", { query: filters });
    return res.quizzes;
  },
  /** GET /api/quizzes/:id → { quiz, questions } */
  details: (id: string): Promise<{ quiz: Quiz; questions: QuizQuestion[] }> =>
    api.get<{ quiz: Quiz; questions: QuizQuestion[] }>(`/api/quizzes/${id}`),
  /** POST /api/quizzes */
  async create(input: {
    title: string;
    description?: string;
    subjectId?: string;
    difficulty?: "easy" | "medium" | "hard";
    questions: Array<{ questionText: string; options: string[]; correctOptionIndex: number; explanation?: string }>;
  }): Promise<{ quiz: Quiz; questions: QuizQuestion[] }> {
    return api.post(`/api/quizzes`, input);
  },
  /** POST /api/quizzes/:id/attempt — answers is map of questionId -> selectedIndex */
  submit: (id: string, answers: Record<string, number>): Promise<QuizAttemptResult> =>
    api.post<QuizAttemptResult>(`/api/quizzes/${id}/attempt`, { answers }),
  /** GET /api/quizzes/attempts → { attempts } */
  async attempts(): Promise<QuizAttempt[]> {
    const res = await api.get<{ attempts: QuizAttempt[] }>("/api/quizzes/attempts");
    return res.attempts;
  },
  /** GET /api/quizzes/leaderboard → { leaderboard } */
  async leaderboard(): Promise<LeaderboardEntry[]> {
    const res = await api.get<{ leaderboard: LeaderboardEntry[] }>("/api/quizzes/leaderboard");
    return res.leaderboard;
  },
};