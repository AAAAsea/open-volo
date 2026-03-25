import { HISTORY_STORAGE_KEY, STATS_STORAGE_KEY } from "../constants";
import type { UsageStats, VoiceHistoryItem } from "../types";

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadHistory(): VoiceHistoryItem[] {
  return parseJson<VoiceHistoryItem[]>(localStorage.getItem(HISTORY_STORAGE_KEY), []);
}

export function saveHistory(history: VoiceHistoryItem[]) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export function pruneHistoryByLimit(history: VoiceHistoryItem[], limit: number): VoiceHistoryItem[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  if (history.length <= limit) return history;
  return history.slice(0, limit);
}

export function loadStats(): UsageStats {
  return parseJson<UsageStats>(localStorage.getItem(STATS_STORAGE_KEY), {
    sessionCount: 0,
    totalDurationMs: 0,
    totalChars: 0,
  });
}

export function saveStats(stats: UsageStats) {
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}
