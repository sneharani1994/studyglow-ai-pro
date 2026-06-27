import { api } from "../client";

/** Backend has a flat flashcards table (no decks). */
export interface Flashcard {
  id: string;
  user_id: string;
  front: string;
  back: string;
  subject_id: string | null;
  is_favourite: boolean;
  box: number;
  next_review: string | null;
  created_at: string;
  updated_at?: string;
  subjects?: { name: string } | null;
}

export interface FlashcardInput {
  front: string;
  back: string;
  subjectId?: string;
  isFavourite?: boolean;
}

export const flashcardsService = {
  /** GET /api/flashcards → { flashcards } */
  async list(filters: { subjectId?: string; isFavourite?: boolean; needsReview?: boolean } = {}): Promise<Flashcard[]> {
    const res = await api.get<{ flashcards: Flashcard[] }>("/api/flashcards", {
      query: filters as Record<string, string | boolean | undefined>,
    });
    return res.flashcards;
  },
  /** POST /api/flashcards */
  async create(input: FlashcardInput): Promise<Flashcard> {
    const res = await api.post<{ flashcard: Flashcard }>("/api/flashcards", input);
    return res.flashcard;
  },
  /** PUT /api/flashcards/:id */
  async update(id: string, patch: Partial<FlashcardInput> & { box?: number; nextReview?: string }): Promise<Flashcard> {
    const res = await api.put<{ flashcard: Flashcard }>(`/api/flashcards/${id}`, patch);
    return res.flashcard;
  },
  /** DELETE /api/flashcards/:id */
  remove: (id: string): Promise<void> =>
    api.delete(`/api/flashcards/${id}`, { responseType: "void" }),
  /** POST /api/flashcards/:id/review (Leitner spaced repetition) */
  async review(id: string, isCorrect: boolean): Promise<Flashcard> {
    const res = await api.post<{ flashcard: Flashcard }>(`/api/flashcards/${id}/review`, { isCorrect });
    return res.flashcard;
  },
};