import { api } from "../client";

// TODO: confirm endpoint paths and shapes with backend.
export interface FlashcardDeck {
  id: string;
  title: string;
  description?: string;
  cardCount: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
}

export const flashcardsService = {
  // TODO: GET /flashcards/decks
  listDecks: (): Promise<FlashcardDeck[]> => api.get<FlashcardDeck[]>("/flashcards/decks"),
  // TODO: GET /flashcards/decks/:deckId
  getDeck: (deckId: string): Promise<FlashcardDeck> =>
    api.get<FlashcardDeck>(`/flashcards/decks/${deckId}`),
  // TODO: GET /flashcards/decks/:deckId/cards
  listCards: (deckId: string): Promise<Flashcard[]> =>
    api.get<Flashcard[]>(`/flashcards/decks/${deckId}/cards`),
  // TODO: POST /flashcards/decks
  createDeck: (input: Partial<FlashcardDeck>): Promise<FlashcardDeck> =>
    api.post<FlashcardDeck>("/flashcards/decks", input),
  // TODO: POST /flashcards/decks/:deckId/cards
  createCard: (deckId: string, input: Partial<Flashcard>): Promise<Flashcard> =>
    api.post<Flashcard>(`/flashcards/decks/${deckId}/cards`, input),
  // TODO: POST /flashcards/decks/:deckId/review
  submitReview: (deckId: string, payload: { cardId: string; rating: number }): Promise<void> =>
    api.post(`/flashcards/decks/${deckId}/review`, payload, { responseType: "void" }),
};