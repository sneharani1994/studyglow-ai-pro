import { api } from "../client";

export interface UploadedFile {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  note_id: string | null;
  created_at: string;
}

export const uploadsService = {
  async list(noteId?: string): Promise<UploadedFile[]> {
    const res = await api.get<{ uploads: UploadedFile[] }>("/api/uploads", { query: { noteId } });
    return res.uploads;
  },
  async upload(file: File, noteId?: string): Promise<UploadedFile> {
    const fd = new FormData();
    fd.append("file", file);
    if (noteId) fd.append("noteId", noteId);
    const res = await api.post<{ file: UploadedFile }>("/api/uploads/upload", undefined, { rawBody: fd });
    return res.file;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/api/uploads/${id}`);
  },
  async rename(id: string, filename: string): Promise<UploadedFile> {
    const res = await api.put<{ file: UploadedFile }>(`/api/uploads/${id}`, { filename });
    return res.file;
  },
  async deleteAll(): Promise<void> {
    // Delete all by iterating over list
    const uploads = await uploadsService.list();
    await Promise.all(uploads.map((u) => uploadsService.delete(u.id)));
  },};