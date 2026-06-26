import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

export type ProjectTab = {
  label: string;
  icon: LucideIcon;
  count?: number;
  active?: boolean;
  alignRight?: boolean;
};

export type OperationalAttentionItem = {
  title: string;
  detail: string;
  badge?: string;
  tone: "amber" | "rose";
};

export type DeliveryMomentumItem = {
  label: string;
  detail: string;
  value: string;
  tone?: "amber" | "rose" | "neutral";
};

export type BusinessOutcomeColumn = {
  eyebrow: string;
  body: string;
};

export type TeamMember = {
  id: string;
  name: string;
  avatar: "person";
};

export type MilestoneStatus = "Completed" | "In progress" | "Not started";

export type TaskStatus = "To do" | "In progress" | "Done";

export type TaskPriority = "Low" | "Medium" | "High";

export type MilestoneTask = {
  id: string;
  title: string;
  type: string;
  priority: TaskPriority;
  status: TaskStatus;
  owner: string;
  ownerAvatar?: "person" | "team" | "unknown";
  dueDate: string;
};

export type MilestoneItem = {
  id: string;
  title: string;
  status: MilestoneStatus;
  progressPercent: number;
  progressLabel: string;
  owner: string;
  ownerAvatar?: "person" | "team" | "unknown";
  dueDate: string;
  description?: string;
  tasks: MilestoneTask[];
  defaultExpanded?: boolean;
};

export type MilestonesSectionData = {
  count: number;
  items: MilestoneItem[];
};

export type TacDashboardData = {
  organization: string;
  project: string;
  pageTitle: string;
  healthScore: number;
  healthStatus: string;
  healthDates: string[];
  operational: {
    blockerStatus: string;
    items: OperationalAttentionItem[];
  };
  momentum: DeliveryMomentumItem[];
  businessOutcome: {
    title: string;
    prompt: string;
    columns: BusinessOutcomeColumn[];
  };
  team: {
    count: number;
  };
  milestones: MilestonesSectionData;
};
