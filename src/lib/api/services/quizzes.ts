import { api } from "../client";

// TODO: confirm endpoint paths and shapes with backend.
export interface Quiz {
  id: string;
  title: string;
  topic?: string;
  questionCount: number;
  durationMinutes?: number;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex?: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  total: number;
  completedAt: string;
}

export const quizzesService = {
  // TODO: GET /quizzes
  list: (): Promise<Quiz[]> => api.get<Quiz[]>("/quizzes"),
  // TODO: GET /quizzes/:id
  get: (id: string): Promise<Quiz> => api.get<Quiz>(`/quizzes/${id}`),
  // TODO: GET /quizzes/:id/questions
  questions: (id: string): Promise<QuizQuestion[]> =>
    api.get<QuizQuestion[]>(`/quizzes/${id}/questions`),
  // TODO: POST /quizzes/:id/attempts
  submit: (id: string, answers: { questionId: string; selectedIndex: number }[]): Promise<QuizAttempt> =>
    api.post<QuizAttempt>(`/quizzes/${id}/attempts`, { answers }),
  // TODO: GET /quizzes/attempts
  attempts: (): Promise<QuizAttempt[]> => api.get<QuizAttempt[]>("/quizzes/attempts"),
  // TODO: POST /quizzes/generate (AI-generated quiz)
  generate: (input: { topic: string; count?: number; difficulty?: "easy" | "medium" | "hard" }): Promise<Quiz> =>
    api.post<Quiz>("/quizzes/generate", input),
};