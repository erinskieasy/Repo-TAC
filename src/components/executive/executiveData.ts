import { deriveHealthStatus, healthTone, type HealthTone } from "../tac/overview";

export type ExecCert = "certified" | "ready" | "expiring" | "not-certified" | "lapsed";

export type ExecProject = {
  id: string;
  name: string;
  org: string;
  lead: { name: string; photo?: string };
  healthScore: number; // 0–100
  trend: number[]; // 7-pt sparkline
  milestonesDone: number;
  milestonesTotal: number;
  tasksDone: number;
  tasksTotal: number;
  pushesThisWeek: number; // commits / pushes
  updatesThisWeek: number;
  cert: ExecCert;
  lastUpdated: string;
  updatedDaysAgo: number; // for staleness (≥ STALE_DAYS = needs attention)
  openBlockers: number;
  teamSize: number;
  milestonesThisWeek: number; // milestones completed this week
  activityDeltaPct: number; // activity change vs last week
};

// A spread of six projects so the rollups and rankings are meaningful.
export const executiveProjects: ExecProject[] = [
  {
    id: "tac",
    name: "T.A.C",
    org: "Intellibus Delivery",
    lead: { name: "Tiffany Tomlin", photo: "https://randomuser.me/api/portraits/women/68.jpg" },
    healthScore: 30,
    trend: [12, 14, 18, 20, 24, 27, 30],
    milestonesDone: 1,
    milestonesTotal: 4,
    tasksDone: 1,
    tasksTotal: 8,
    pushesThisWeek: 9,
    updatesThisWeek: 6,
    cert: "not-certified",
    lastUpdated: "2h ago",
    updatedDaysAgo: 0,
    openBlockers: 1,
    teamSize: 9,
    milestonesThisWeek: 0,
    activityDeltaPct: 0,
  },
  {
    id: "farmflow",
    name: "FarmFlow API",
    org: "Intellibus Delivery",
    lead: { name: "Sarah Okoye", photo: "https://randomuser.me/api/portraits/women/44.jpg" },
    healthScore: 84,
    trend: [62, 66, 70, 74, 78, 81, 84],
    milestonesDone: 5,
    milestonesTotal: 6,
    tasksDone: 38,
    tasksTotal: 45,
    pushesThisWeek: 41,
    updatesThisWeek: 11,
    cert: "certified",
    lastUpdated: "20m ago",
    updatedDaysAgo: 0,
    openBlockers: 0,
    teamSize: 7,
    milestonesThisWeek: 1,
    activityDeltaPct: 12,
  },
  {
    id: "checkout",
    name: "Checkout Redesign",
    org: "Northwind Retail",
    lead: { name: "Marcus Lee", photo: "https://randomuser.me/api/portraits/men/52.jpg" },
    healthScore: 64,
    trend: [48, 52, 55, 58, 60, 62, 64],
    milestonesDone: 3,
    milestonesTotal: 5,
    tasksDone: 22,
    tasksTotal: 34,
    pushesThisWeek: 18,
    updatesThisWeek: 7,
    cert: "ready",
    lastUpdated: "1h ago",
    updatedDaysAgo: 0,
    openBlockers: 0,
    teamSize: 5,
    milestonesThisWeek: 0,
    activityDeltaPct: 5,
  },
  {
    id: "atlas-mobile",
    name: "Atlas Mobile",
    org: "Northwind Retail",
    lead: { name: "Georgios Kalaitzakis", photo: "https://randomuser.me/api/portraits/men/76.jpg" },
    healthScore: 46,
    trend: [58, 55, 52, 50, 49, 47, 46],
    milestonesDone: 2,
    milestonesTotal: 6,
    tasksDone: 14,
    tasksTotal: 40,
    pushesThisWeek: 6,
    updatesThisWeek: 2,
    cert: "lapsed",
    lastUpdated: "8d ago",
    updatedDaysAgo: 8,
    openBlockers: 2,
    teamSize: 6,
    milestonesThisWeek: 0,
    activityDeltaPct: 0,
  },
  {
    id: "data-platform",
    name: "Data Platform",
    org: "Intellibus Delivery",
    lead: { name: "Priya Nair", photo: "https://randomuser.me/api/portraits/women/29.jpg" },
    healthScore: 91,
    trend: [80, 83, 85, 87, 88, 90, 91],
    milestonesDone: 7,
    milestonesTotal: 8,
    tasksDone: 56,
    tasksTotal: 61,
    pushesThisWeek: 33,
    updatesThisWeek: 9,
    cert: "certified",
    lastUpdated: "45m ago",
    updatedDaysAgo: 0,
    openBlockers: 0,
    teamSize: 8,
    milestonesThisWeek: 2,
    activityDeltaPct: 9,
  },
  {
    id: "billing",
    name: "Billing Revamp",
    org: "Meridian Finance",
    lead: { name: "Mateusz Ponitka", photo: "https://randomuser.me/api/portraits/men/41.jpg" },
    healthScore: 72,
    trend: [60, 63, 66, 68, 69, 71, 72],
    milestonesDone: 4,
    milestonesTotal: 6,
    tasksDone: 27,
    tasksTotal: 38,
    pushesThisWeek: 23,
    updatesThisWeek: 8,
    cert: "expiring",
    lastUpdated: "5h ago",
    updatedDaysAgo: 0,
    openBlockers: 0,
    teamSize: 6,
    milestonesThisWeek: 1,
    activityDeltaPct: 8,
  },
];

export function projectStatus(project: ExecProject): string {
  return deriveHealthStatus(project.healthScore);
}

export function projectTone(project: ExecProject): HealthTone {
  return healthTone(project.healthScore);
}

export function projectActivity(project: ExecProject): number {
  return project.pushesThisWeek + project.updatesThisWeek;
}

export type PortfolioKpis = {
  active: number;
  onTrack: number;
  certified: number;
  activity: number;
  avgHealth: number;
};

export function portfolioKpis(projects: ExecProject[]): PortfolioKpis {
  const active = projects.length;
  const onTrack = projects.filter((project) => project.healthScore >= 50).length;
  const certified = projects.filter((project) => project.cert === "certified").length;
  const activity = projects.reduce((sum, project) => sum + projectActivity(project), 0);
  const avgHealth =
    active === 0 ? 0 : Math.round(projects.reduce((sum, project) => sum + project.healthScore, 0) / active);
  return { active, onTrack, certified, activity, avgHealth };
}

export type HealthDistribution = { healthy: number; onTrack: number; behind: number };

export function healthDistribution(projects: ExecProject[]): HealthDistribution {
  return projects.reduce(
    (acc, project) => {
      if (project.healthScore >= 80) {
        acc.healthy += 1;
      } else if (project.healthScore >= 50) {
        acc.onTrack += 1;
      } else {
        acc.behind += 1;
      }
      return acc;
    },
    { healthy: 0, onTrack: 0, behind: 0 },
  );
}

export function byActivity(projects: ExecProject[]): ExecProject[] {
  return [...projects].sort((a, b) => projectActivity(b) - projectActivity(a));
}

// ── Risk / "needs attention" ──
export const STALE_DAYS = 7;

export function isStale(project: ExecProject): boolean {
  return project.updatedDaysAgo >= STALE_DAYS;
}

export function needsAttention(project: ExecProject): boolean {
  return project.healthScore < 50 || project.openBlockers > 0 || isStale(project);
}

export type AttentionSummary = { count: number; behind: number; blocked: number; stale: number };

export function attentionSummary(projects: ExecProject[]): AttentionSummary {
  return projects.reduce(
    (acc, project) => {
      if (needsAttention(project)) {
        acc.count += 1;
      }
      if (project.healthScore < 50) {
        acc.behind += 1;
      }
      if (project.openBlockers > 0) {
        acc.blocked += 1;
      }
      if (isStale(project)) {
        acc.stale += 1;
      }
      return acc;
    },
    { count: 0, behind: 0, blocked: 0, stale: 0 },
  );
}

// ── Trend direction (week-over-week health delta from the 7-pt trend) ──
export function healthDelta(project: ExecProject): number {
  if (project.trend.length < 2) {
    return 0;
  }
  return project.trend[project.trend.length - 1] - project.trend[0];
}

export function portfolioHealthDelta(projects: ExecProject[]): number {
  if (projects.length === 0) {
    return 0;
  }
  const now = projects.reduce((sum, p) => sum + p.trend[p.trend.length - 1], 0) / projects.length;
  const weekAgo = projects.reduce((sum, p) => sum + p.trend[0], 0) / projects.length;
  return Math.round(now - weekAgo);
}

// Average health trend across the portfolio (per 7-pt index) — for the hero chart.
export function portfolioTrend(projects: ExecProject[]): number[] {
  if (projects.length === 0) {
    return [];
  }
  const length = projects[0].trend.length;
  return Array.from({ length }, (_, index) =>
    Math.round(projects.reduce((sum, p) => sum + (p.trend[index] ?? 0), 0) / projects.length),
  );
}

export function milestonesThisWeekTotal(projects: ExecProject[]): number {
  return projects.reduce((sum, project) => sum + project.milestonesThisWeek, 0);
}

// Portfolio activity change vs last week (weighted by current activity).
export function portfolioActivityDelta(projects: ExecProject[]): number {
  const total = projects.reduce((sum, p) => sum + projectActivity(p), 0);
  if (total === 0) {
    return 0;
  }
  const weighted = projects.reduce((sum, p) => sum + projectActivity(p) * p.activityDeltaPct, 0);
  return Math.round(weighted / total);
}

// ── Certification breakdown ──
export type CertBreakdown = Record<ExecCert, number>;

export function certBreakdown(projects: ExecProject[]): CertBreakdown {
  const acc: CertBreakdown = { certified: 0, ready: 0, expiring: 0, lapsed: 0, "not-certified": 0 };
  for (const project of projects) {
    acc[project.cert] += 1;
  }
  return acc;
}
