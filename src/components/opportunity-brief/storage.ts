import type { OpportunityBrief } from "./types";

// Everything lives in the browser — no backend, no JSON export of raw data.
const BRIEFS_KEY = "tac.opportunityBriefs";
const API_KEY_KEY = "tac.openaiApiKey";

export function loadBriefs(): OpportunityBrief[] {
  try {
    const raw = localStorage.getItem(BRIEFS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OpportunityBrief[]) : [];
  } catch {
    return [];
  }
}

export function saveBriefs(briefs: OpportunityBrief[]): void {
  try {
    localStorage.setItem(BRIEFS_KEY, JSON.stringify(briefs));
  } catch {
    // Storage full or unavailable — fail silently; the in-memory state still works.
  }
}

export function loadApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveApiKey(apiKey: string): void {
  try {
    if (apiKey) {
      localStorage.setItem(API_KEY_KEY, apiKey);
    } else {
      localStorage.removeItem(API_KEY_KEY);
    }
  } catch {
    // ignore
  }
}
