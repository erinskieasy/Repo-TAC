import { projectKey } from "./certification";
import type { MilestoneItem, TacDashboardData } from "./types";

export type BusinessOutcome = TacDashboardData["businessOutcome"];
export type HealthTone = "green" | "amber" | "rose";

export const TREND_POINTS = 7;

// ── Delivery health — derived from milestone task completion ──

export function computeHealthScore(milestones: MilestoneItem[]): number {
  const totalTasks = milestones.reduce((sum, milestone) => sum + milestone.tasks.length, 0);
  if (totalTasks === 0) {
    return 0;
  }
  const doneTasks = milestones.reduce(
    (sum, milestone) => sum + milestone.tasks.filter((task) => task.status === "Done").length,
    0,
  );
  return Math.round((doneTasks / totalTasks) * 100);
}

export function deriveHealthStatus(score: number): string {
  if (score >= 80) {
    return "Healthy";
  }
  if (score >= 50) {
    return "On track";
  }
  return "Behind";
}

export function healthTone(score: number): HealthTone {
  if (score >= 70) {
    return "green";
  }
  if (score >= 50) {
    return "amber";
  }
  return "rose";
}

// A believable ascending series that ends exactly at the current score, used to seed
// the trend before any real history has accumulated.
export function seedHealthTrend(score: number): number[] {
  const start = Math.max(0, score - 18);
  const step = (score - start) / (TREND_POINTS - 1);
  return Array.from({ length: TREND_POINTS }, (_, index) => Math.round(start + step * index));
}

// Append the latest score, keeping the trailing TREND_POINTS window.
export function pushHealthPoint(trend: number[], score: number): number[] {
  if (trend.length > 0 && trend[trend.length - 1] === score) {
    return trend;
  }
  return [...trend, score].slice(-TREND_POINTS);
}

// ── Persistence (per project) ──

const HEALTH_KEY = "tac.healthTrend:";
const OUTCOME_KEY = "tac.businessOutcome:";

export function loadHealthTrend(project: string): number[] | null {
  try {
    const raw = localStorage.getItem(HEALTH_KEY + projectKey(project));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((value) => typeof value === "number")
      ? (parsed as number[])
      : null;
  } catch {
    return null;
  }
}

export function saveHealthTrend(project: string, trend: number[]): void {
  try {
    localStorage.setItem(HEALTH_KEY + projectKey(project), JSON.stringify(trend));
  } catch {
    // ignore storage failures — in-memory state still drives the UI
  }
}

export function loadBusinessOutcome(project: string): BusinessOutcome | null {
  try {
    const raw = localStorage.getItem(OUTCOME_KEY + projectKey(project));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as BusinessOutcome;
    if (parsed && typeof parsed.title === "string" && Array.isArray(parsed.columns)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBusinessOutcome(project: string, outcome: BusinessOutcome): void {
  try {
    localStorage.setItem(OUTCOME_KEY + projectKey(project), JSON.stringify(outcome));
  } catch {
    // ignore
  }
}
