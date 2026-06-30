import type { MilestoneItem, TacDashboardData } from "./types";

// A logged documentation update, structurally matching the ProjectUpdate shape in
// TacDashboard. `id` is a Date.now() stamp, so it doubles as the "logged at" time.
export type CertUpdate = {
  id: number;
  loggedAt: string;
  entries: { label: string; text: string }[];
};

export type DashboardView = "overview" | "milestones" | "pulse" | "reporting";

export type CriterionId = "evidence" | "outcome-health" | "ownership-blockers";

export type Criterion = {
  id: CriterionId;
  label: string;
  passed: boolean;
  detail: string; // current value, e.g. "2 milestones unassigned"
  hint: string; // how to close the gap
  targetView: DashboardView;
};

export type CertStatus =
  | "not-eligible" // rubric not fully passing, no sign-off
  | "ready" // rubric passes, awaiting a lead's sign-off
  | "certified" // signed off, rubric passes, within validity window
  | "expiring" // certified but within EXPIRING_MS of validUntil
  | "expired" // signed off, past validUntil
  | "lapsed"; // signed off but a criterion has since regressed

// A lead's manual vouch. The rubric is always recomputed live; only this record persists.
export type CertSignOff = {
  certifiedBy: string;
  certifiedAt: number;
  validUntil: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const VALIDITY_MS = 7 * DAY_MS; // certification re-validates weekly
export const EXPIRING_MS = 2 * DAY_MS; // warn within 2 days of expiry
export const FRESHNESS_MS = 7 * DAY_MS; // evidence must be logged within a week
export const HEALTH_THRESHOLD = 70; // delivery-health bar for certification

function describeAge(ms: number): string {
  const days = Math.floor(ms / DAY_MS);
  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "1 day ago";
  }
  return `${days} days ago`;
}

// Evaluate the live alignment-hygiene rubric. Pure — safe to call in render/useMemo.
export function evaluateRubric(
  data: TacDashboardData,
  milestones: MilestoneItem[],
  updates: CertUpdate[],
  now: number,
): Criterion[] {
  // 1. Evidence is current — a documentation update logged within the freshness window.
  const latest = updates.at(-1);
  const evidenceFresh = latest !== undefined && now - latest.id <= FRESHNESS_MS;
  const evidenceDetail = !latest
    ? "No documentation updates logged yet"
    : evidenceFresh
      ? `Last update ${describeAge(now - latest.id)}`
      : `Last update ${describeAge(now - latest.id)} (needs ≤ 7 days)`;

  // 2. Outcome & health — business outcome defined and delivery health above the bar.
  const outcomeDefined =
    data.businessOutcome.title.trim() !== "" &&
    data.businessOutcome.columns.some((column) => column.body.trim() !== "");
  const healthOk = data.healthScore >= HEALTH_THRESHOLD;
  const outcomeHealthDetail = !outcomeDefined
    ? healthOk
      ? "Business outcome not defined"
      : `Outcome undefined · health ${data.healthScore}% (needs ${HEALTH_THRESHOLD}%)`
    : healthOk
      ? `Outcome defined · health ${data.healthScore}%`
      : `Health ${data.healthScore}% (needs ${HEALTH_THRESHOLD}%)`;

  // 3. Ownership & blockers — every milestone owned and open blockers acknowledged.
  const unassigned = milestones.filter(
    (milestone) => milestone.owner.trim() === "" || /unassigned/i.test(milestone.owner),
  ).length;
  const blockersAcknowledged =
    /no open blockers/i.test(data.operational.blockerStatus) ||
    updates.some((update) => update.entries.some((entry) => /blocker/i.test(entry.label)));
  const ownershipDetail =
    unassigned > 0
      ? `${unassigned} milestone${unassigned === 1 ? "" : "s"} unassigned`
      : !blockersAcknowledged
        ? "Open blockers not acknowledged"
        : "All milestones owned · blockers acknowledged";

  return [
    {
      id: "evidence",
      label: "Evidence is current",
      passed: evidenceFresh,
      detail: evidenceDetail,
      hint: "Log a project update via “Share a project update” or Tell Atlas.",
      targetView: "overview",
    },
    {
      id: "outcome-health",
      label: "Outcome & health",
      passed: outcomeDefined && healthOk,
      detail: outcomeHealthDetail,
      hint: `Define the business outcome and lift delivery health to ${HEALTH_THRESHOLD}%+.`,
      targetView: "overview",
    },
    {
      id: "ownership-blockers",
      label: "Ownership & blockers",
      passed: unassigned === 0 && blockersAcknowledged,
      detail: ownershipDetail,
      hint: "Assign an owner to every milestone and acknowledge open blockers in an update.",
      targetView: "milestones",
    },
  ];
}

export function rubricPasses(rubric: Criterion[]): boolean {
  return rubric.every((criterion) => criterion.passed);
}

// Combine the live rubric with the persisted sign-off into a single display status.
export function deriveStatus(
  rubric: Criterion[],
  signOff: CertSignOff | null,
  now: number,
): CertStatus {
  const allPass = rubricPasses(rubric);
  if (!signOff) {
    return allPass ? "ready" : "not-eligible";
  }
  if (!allPass) {
    return "lapsed";
  }
  if (now > signOff.validUntil) {
    return "expired";
  }
  if (now > signOff.validUntil - EXPIRING_MS) {
    return "expiring";
  }
  return "certified";
}

// ── Persistence (sign-off only; the rubric is always recomputed live) ──
const KEY_PREFIX = "tac.certification:";

export function projectKey(project: string): string {
  const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || "project";
}

export function loadSignOff(project: string): CertSignOff | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + projectKey(project));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CertSignOff;
    if (typeof parsed?.certifiedAt === "number" && typeof parsed?.validUntil === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSignOff(project: string, signOff: CertSignOff | null): void {
  try {
    const key = KEY_PREFIX + projectKey(project);
    if (signOff) {
      localStorage.setItem(key, JSON.stringify(signOff));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable — in-memory state still drives the UI this session.
  }
}
