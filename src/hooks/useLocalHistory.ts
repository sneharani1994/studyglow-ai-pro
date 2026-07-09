import { useState, useEffect } from "react";

export type HistoryEntry = {
  id: string; // unique identifier, e.g., timestamp string
  title: string; // document/file name
  markdown: string; // generated summary markdown
  timestamp: string; // ISO string
};

/**
 * useLocalHistory – a tiny client‑side history manager.
 *
 * Stores up to `maxEntries` recent entries in `localStorage` under the key
 * `localHistory`. Entries are kept in reverse‑chronological order (newest first).
 * The hook returns the current history array, an `addEntry` function to prepend a
 * new entry and automatically trim the list, and a `clearHistory` function.
 */
export function useLocalHistory(maxEntries: number = 10) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Initialise from localStorage once on mount.
  useEffect(() => {
    const stored = localStorage.getItem("localHistory");
    if (stored) {
      try {
        const parsed: HistoryEntry[] = JSON.parse(stored);
        setHistory(parsed);
      } catch (e) {
        console.warn("Failed to parse localHistory from localStorage", e);
      }
    }
  }, []);

  const persist = (entries: HistoryEntry[]) => {
    try {
      localStorage.setItem("localHistory", JSON.stringify(entries));
    } catch (e) {
      console.warn("Unable to write localHistory to localStorage", e);
    }
  };

  const addEntry = (entry: HistoryEntry) => {
    const updated = [entry, ...history].slice(0, maxEntries);
    setHistory(updated);
    persist(updated);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("localHistory");
  };

  return { history, addEntry, clearHistory };
}
