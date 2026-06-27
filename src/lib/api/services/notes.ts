import { api } from "../client";

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  summary: string;
  subject_id: string | null;
  folder_id: string | null;
  is_pinned: boolean;
  is_favourite: boolean;
  is_archived: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  subjects?: { name: string; color: string } | null;
  folders?: { name: string } | null;
}

export interface Subject { id: string; name: string; color: string; user_id: string }
export interface Folder { id: string; name: string; subject_id: string | null; user_id: string }

export interface NoteFilters {
  subjectId?: string;
  folderId?: string;
  isPinned?: boolean;
  isFavourite?: boolean;
  isArchived?: boolean;
  tag?: string;
  search?: string;
  recent?: boolean;
}

export interface NoteInput {
  title: string;
  content?: string;
  summary?: string;
  subjectId?: string | null;
  folderId?: string | null;
  isPinned?: boolean;
  isFavourite?: boolean;
  tags?: string[];
}

export const notesService = {
  /** GET /api/notes → { notes } */
  async list(filters: NoteFilters = {}): Promise<Note[]> {
    const res = await api.get<{ notes: Note[] }>("/api/notes", {
      query: filters as Record<string, string | number | boolean | undefined>,
    });
    return res.notes;
  },
  /** GET /api/notes/:id → { note } */
  async get(id: string): Promise<Note> {
    const res = await api.get<{ note: Note }>(`/api/notes/${id}`);
    return res.note;
  },
  /** POST /api/notes */
  async create(input: NoteInput): Promise<Note> {
    const res = await api.post<{ note: Note }>("/api/notes", input);
    return res.note;
  },
  /** PUT /api/notes/:id */
  async update(id: string, patch: Partial<NoteInput> & { isArchived?: boolean }): Promise<Note> {
    const res = await api.put<{ note: Note }>(`/api/notes/${id}`, patch);
    return res.note;
  },
  /** DELETE /api/notes/:id */
  remove: (id: string): Promise<void> =>
    api.delete(`/api/notes/${id}`, { responseType: "void" }),

  /** GET /api/notes/subjects → { subjects } */
  async listSubjects(): Promise<Subject[]> {
    const res = await api.get<{ subjects: Subject[] }>("/api/notes/subjects");
    return res.subjects;
  },
  /** POST /api/notes/subjects */
  async createSubject(input: { name: string; color?: string }): Promise<Subject> {
    const res = await api.post<{ subject: Subject }>("/api/notes/subjects", input);
    return res.subject;
  },
  /** GET /api/notes/folders → { folders } */
  async listFolders(subjectId?: string): Promise<Folder[]> {
    const res = await api.get<{ folders: Folder[] }>("/api/notes/folders", { query: { subjectId } });
    return res.folders;
  },
  /** POST /api/notes/folders */
  async createFolder(input: { name: string; subjectId?: string }): Promise<Folder> {
    const res = await api.post<{ folder: Folder }>("/api/notes/folders", input);
    return res.folder;
  },
  /** GET /api/notes/tags → { tags } */
  async listTags(): Promise<string[]> {
    const res = await api.get<{ tags: string[] }>("/api/notes/tags");
    return res.tags;
  },
};