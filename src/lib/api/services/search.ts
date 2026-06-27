import { api } from "../client";

export interface GlobalSearchResults {
  notes: Array<{ id: string; title: string; content: string; updated_at: string }>;
  chats: Array<{ id: string; title: string; updated_at: string }>;
  planner: Array<{ id: string; title: string; description: string; due_date: string | null; status: string }>;
  flashcards: Array<{ id: string; front: string; back: string }>;
  quizzes: Array<{ id: string; title: string; description: string; difficulty: string }>;
}

export const searchService = {
  async global(q: string): Promise<GlobalSearchResults> {
    const res = await api.get<{ results: GlobalSearchResults }>("/api/search", { query: { q } });
    return res.results;
  },
};