import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CircleCheck,
  Eye,
  FileText,
  GitCommit,
  Gavel,
  ListChecks,
  MessageSquareText,
  OctagonAlert,
} from "lucide-react";

// One structured record, fed by many activity sources. Atlas is the memory/alignment layer.
export type PulseCategory = "progress" | "watching" | "blocker" | "nextStep" | "decision";
export type ProjectType = "technical" | "non-technical";

// Structurally compatible with the dashboard's logged updates.
export type LoggedUpdate = { id: number; loggedAt: string; entries: { label: string; text: string }[] };

export type ActivitySource = {
  group: string;
  icon: LucideIcon;
  connectors: string;
  detects: string;
  types: ProjectType[];
  native?: boolean; // already part of this platform (no connector needed)
};

export type ActivitySignal = {
  id: string;
  type: ProjectType;
  icon: LucideIcon;
  source: string;
  actor?: string;
  detail: string;
  summary: string;
  proposed: { category: PulseCategory; text: string }[];
};

export const PULSE_GROUPS: { key: PulseCategory; label: string; icon: LucideIcon; tone: string }[] = [
  { key: "progress", label: "Progress", icon: CircleCheck, tone: "green" },
  { key: "watching", label: "Watching", icon: Eye, tone: "amber" },
  { key: "blocker", label: "Blockers", icon: OctagonAlert, tone: "red" },
  { key: "nextStep", label: "Next steps", icon: ArrowRight, tone: "blue" },
  { key: "decision", label: "Decisions", icon: Gavel, tone: "slate" },
];

export const CATEGORY_LABEL: Record<PulseCategory, string> = {
  progress: "Progress",
  watching: "Risk",
  blocker: "Blocker",
  nextStep: "Next step",
  decision: "Decision",
};

// Map a logged-update entry label back to a pulse category for the timeline.
export function labelToCategory(label: string): PulseCategory | null {
  const value = label.toLowerCase();
  if (value.includes("progress")) return "progress";
  if (value.includes("risk") || value.includes("watch")) return "watching";
  if (value.includes("block")) return "blocker";
  if (value.includes("next")) return "nextStep";
  if (value.includes("decision") || value.includes("change")) return "decision";
  return null;
}

export const ACTIVITY_SOURCES: ActivitySource[] = [
  {
    group: "Code",
    icon: GitCommit,
    connectors: "GitHub",
    detects: "Commits, PRs, builds, deployments",
    types: ["technical"],
  },
  {
    group: "Tasks & Milestones",
    icon: ListChecks,
    connectors: "Native to this platform",
    detects: "Completed, delayed, and overdue tasks",
    types: ["technical", "non-technical"],
    native: true,
  },
  {
    group: "Documents",
    icon: FileText,
    connectors: "Google Drive",
    detects: "Changes and their impact",
    types: ["technical", "non-technical"],
  },
  {
    group: "Manual",
    icon: MessageSquareText,
    connectors: "Tell Atlas",
    detects: "Anything else, in your own words",
    types: ["technical", "non-technical"],
  },
];

export const SEEDED_SIGNALS: ActivitySignal[] = [
  {
    id: "sig-git",
    type: "technical",
    icon: GitCommit,
    source: "farmflow-api",
    actor: "Sarah",
    detail: "5 commits today — added authentication, fixed API validation, updated database migration",
    summary:
      "Backend authentication work is complete. Database migration was updated. Frontend integration is next.",
    proposed: [
      { category: "progress", text: "Backend authentication complete" },
      { category: "progress", text: "Database migration updated" },
      { category: "nextStep", text: "Frontend integration" },
    ],
  },
  {
    id: "sig-tasks",
    type: "non-technical",
    icon: ListChecks,
    source: "Tasks & Milestones",
    detail: "12 tasks completed, 2 delayed, 1 overdue this week",
    summary: "Checkout redesign shipped. Testing is running behind and may slip.",
    proposed: [
      { category: "progress", text: "Checkout redesign completed" },
      { category: "watching", text: "Testing timeline may slip" },
    ],
  },
  {
    id: "sig-doc",
    type: "non-technical",
    icon: FileText,
    source: "Proposal.docx",
    detail: "Proposal updated — pricing model changed",
    summary: "Pricing model updated; sales materials need revision.",
    proposed: [
      { category: "decision", text: "Pricing model updated" },
      { category: "nextStep", text: "Sales materials need revision" },
    ],
  },
];
