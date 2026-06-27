import { api } from "../client";

/** AI service — /api/ai/* — Gemini-backed. */
export const aiService = {
  summarize: (text: string, length: "short" | "medium" | "long" = "medium"): Promise<{ summary: string }> =>
    api.post("/api/ai/summarize", { text, length }),
  explain: (topic: string, level: "beginner" | "intermediate" | "advanced" = "intermediate"): Promise<{ explanation: string }> =>
    api.post("/api/ai/explain", { topic, level }),
  generateQuiz: (topic: string, questionCount = 5, difficulty: "easy" | "medium" | "hard" = "medium"): Promise<{
    questions: Array<{ question_text: string; options: string[]; correct_option_index: number; explanation: string }>;
  }> => api.post("/api/ai/generate-quiz", { topic, questionCount, difficulty }),
  generateFlashcards: (topic: string, cardCount = 8): Promise<{
    flashcards: Array<{ front: string; back: string }>;
  }> => api.post("/api/ai/generate-flashcards", { topic, cardCount }),
  generateStudyNotes: (topic: string, depth: "standard" | "deep dive" = "standard"): Promise<{ studyNotes: string }> =>
    api.post("/api/ai/generate-study-notes", { topic, depth }),
  homeworkSolver: (problem: string, subject?: string): Promise<{ solution: string }> =>
    api.post("/api/ai/homework-solver", { problem, subject }),
  doubtSolver: (doubt: string, context?: string): Promise<{ resolution: string }> =>
    api.post("/api/ai/doubt-solver", { doubt, context }),
  roadmap: (goal: string, timeframeWeeks = 4): Promise<{
    roadmap: { title: string; description: string; steps: Array<{ phase: string; topics: string[] }> };
  }> => api.post("/api/ai/roadmap", { goal, timeframeWeeks }),
  plannerGenerator: (focusArea: string, studyHoursPerDay = 2): Promise<{
    plannerTasks: Array<{ title: string; description: string; duration_minutes: number; priority: string }>;
  }> => api.post("/api/ai/planner-generator", { focusArea, studyHoursPerDay }),
  essay: (promptText: string, tone = "academic", lengthWords = 500): Promise<{ essay: string }> =>
    api.post("/api/ai/essay", { promptText, tone, lengthWords }),
  grammar: (text: string): Promise<unknown> => api.post("/api/ai/grammar", { text }),
  codeExplanation: (code: string, language?: string): Promise<unknown> =>
    api.post("/api/ai/code-explanation", { code, language }),
  codingAssistant: (prompt: string, language?: string): Promise<unknown> =>
    api.post("/api/ai/coding-assistant", { prompt, language }),
  history: (): Promise<{ history: Array<{ id: string; feature_type: string; prompt: string; response: string; created_at: string }> }> =>
    api.get("/api/ai/history"),
};