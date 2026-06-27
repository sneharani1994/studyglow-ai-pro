import { api } from "../client";

/** Mirrors public.profiles row from backend. */
export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  study_streak: number;
  total_study_hours: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateProfileInput {
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  studyStreak?: number;
  totalStudyHours?: number;
  level?: number;
  xp?: number;
}

export const profileService = {
  /** GET /api/profile → { profile } */
  async get(): Promise<UserProfile> {
    const res = await api.get<{ profile: UserProfile }>("/api/profile");
    return res.profile;
  },
  /** PUT /api/profile */
  async update(patch: UpdateProfileInput): Promise<UserProfile> {
    const res = await api.put<{ profile: UserProfile }>("/api/profile", patch);
    return res.profile;
  },
  /** PUT /api/profile/password */
  updatePassword: (newPassword: string): Promise<void> =>
    api.put("/api/profile/password", { newPassword }, { responseType: "void" }),
  /** DELETE /api/profile */
  deleteAccount: (): Promise<void> =>
    api.delete("/api/profile", { responseType: "void" }),
};