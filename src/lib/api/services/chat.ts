import { api } from "../client";

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  is_favourite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: "user" | "ai";
  content: string;
  created_at: string;
}

export type ChatConversation = ChatSession;

export const chatService = {
  async listSessions(filters: { recent?: boolean; isPinned?: boolean; isFavourite?: boolean } = {}): Promise<ChatSession[]> {
    const res = await api.get<{ sessions: ChatSession[] }>("/api/chat/sessions", { query: filters });
    return res.sessions;
  },
  async createSession(title?: string): Promise<ChatSession> {
    const res = await api.post<{ session: ChatSession }>("/api/chat/sessions", { title });
    return res.session;
  },
  async updateSession(id: string, patch: { title?: string; isPinned?: boolean; isFavourite?: boolean }): Promise<ChatSession> {
    const res = await api.put<{ session: ChatSession }>(`/api/chat/sessions/${id}`, patch);
    return res.session;
  },
  deleteSession: (id: string): Promise<void> =>
    api.delete(`/api/chat/sessions/${id}`, { responseType: "void" }),
  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const res = await api.get<{ messages: ChatMessage[] }>(`/api/chat/sessions/${sessionId}/messages`);
    return res.messages;
  },
  sendMessage: (sessionId: string, content: string): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> =>
    api.post(`/api/chat/sessions/${sessionId}/messages`, { content }),
};