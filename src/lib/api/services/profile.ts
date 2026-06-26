import { api } from "../client";

// TODO: confirm endpoint paths and shapes with backend.
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
  preferences?: Record<string, unknown>;
}

export const profileService = {
  // TODO: GET /profile
  get: (): Promise<UserProfile> => api.get<UserProfile>("/profile"),
  // TODO: PUT /profile
  update: (patch: Partial<UserProfile>): Promise<UserProfile> =>
    api.put<UserProfile>("/profile", patch),
  // TODO: POST /profile/avatar (multipart)
  uploadAvatar: (file: File): Promise<{ avatarUrl: string }> => {
    const fd = new FormData();
    fd.append("avatar", file);
    return api.post<{ avatarUrl: string }>("/profile/avatar", undefined, { rawBody: fd });
  },
};