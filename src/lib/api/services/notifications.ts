import { api } from "../client";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsService = {
  async list(filters: { type?: string; isRead?: boolean } = {}): Promise<Notification[]> {
    const res = await api.get<{ notifications: Notification[] }>("/api/notifications", { query: filters });
    return res.notifications;
  },
  async markRead(id: string): Promise<Notification> {
    const res = await api.put<{ notification: Notification }>(`/api/notifications/${id}/read`);
    return res.notification;
  },
  async create(input: { title: string; message: string; type?: string }): Promise<Notification> {
    const res = await api.post<{ notification: Notification }>("/api/notifications", input);
    return res.notification;
  },
};