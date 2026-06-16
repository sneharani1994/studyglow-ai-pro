import { useEffect, useState } from "react";

export type User = { name: string; email: string };
const KEY = "studygpt_user";
const EVT = "studygpt-auth";

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function setUser(u: User) {
  localStorage.setItem(KEY, JSON.stringify(u));
  window.dispatchEvent(new Event(EVT));
}
export function clearUser() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}
export function useUser(): User | null {
  const [u, setU] = useState<User | null>(() => getUser());
  useEffect(() => {
    setU(getUser());
    const h = () => setU(getUser());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  return u;
}
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(s => s[0]?.toUpperCase() ?? "").join("") || "U";
}
