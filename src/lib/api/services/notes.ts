import { api } from "../client";

// TODO: confirm endpoint paths and shapes with backend.
export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export const notesService = {
  // TODO: GET /notes
  list: (): Promise<Note[]> => api.get<Note[]>("/notes"),
  // TODO: GET /notes/:id
  get: (id: string): Promise<Note> => api.get<Note>(`/notes/${id}`),
  // TODO: POST /notes
  create: (input: Partial<Note>): Promise<Note> => api.post<Note>("/notes", input),
  // TODO: PUT /notes/:id
  update: (id: string, patch: Partial<Note>): Promise<Note> =>
    api.put<Note>(`/notes/${id}`, patch),
  // TODO: DELETE /notes/:id
  remove: (id: string): Promise<void> =>
    api.delete(`/notes/${id}`, { responseType: "void" }),
};