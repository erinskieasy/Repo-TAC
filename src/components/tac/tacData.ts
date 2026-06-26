import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  Folder,
  LayoutGrid,
  MonitorPlay,
  OctagonAlert,
  PanelsTopLeft,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { MilestonesSectionData, NavItem, ProjectTab, TacDashboardData, TeamMember } from "./types";

// The project team roster — shared by the milestones assignee picker and the Atlas owner picker.
export const teamMembers: TeamMember[] = [
  { id: "tiffany", name: "Tiffany Tomlin", avatar: "person" },
  { id: "erinski", name: "Erinski Easy", avatar: "person" },
  { id: "mikale", name: "Mikale Meetoo", avatar: "person" },
];

export const sidebarItems: NavItem[] = [
  { label: "Profile", icon: UserRoundCheck },
  { label: "Projects", icon: Folder, active: true },
  { label: "Team", icon: UsersRound },
  { label: "Playback", icon: MonitorPlay },
  { label: "Calendar", icon: CalendarDays },
];

export const projectTabs: ProjectTab[] = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Team", icon: UsersRound, count: 9 },
  { label: "Milestones", icon: PanelsTopLeft, count: 4 },
  { label: "Blockers", icon: OctagonAlert },
  { label: "Reporting", icon: ClipboardList },
  { label: "Cadence", icon: CalendarDays, count: 1 },
  { label: "Notes", icon: FileText, count: 1 },
  { label: "Activity", icon: Activity, alignRight: true },
];

export const milestoneProjectTabs: ProjectTab[] = projectTabs.map((tab) => ({
  ...tab,
  active: tab.label === "Milestones",
}));

export const tacMilestones: MilestonesSectionData = {
  count: 4,
  items: [
    {
      id: "intro",
      title: "Introduction",
      status: "Completed",
      progressPercent: 100,
      progressLabel: "100% - 3/3",
      owner: "Tiffany Tomlin",
      ownerAvatar: "person",
      dueDate: "Jun 3",
      description:
        "Initial project alignment, starter documentation, and ownership framing are complete.",
      tasks: [
        {
          id: "intro-1",
          title: "Confirm TAC operating model",
          type: "Documentation",
          priority: "Low",
          status: "Done",
          owner: "Tiffany Tomlin",
          ownerAvatar: "person",
          dueDate: "Jun 1",
        },
        {
          id: "intro-2",
          title: "Publish launch overview",
          type: "Feature",
          priority: "Low",
          status: "Done",
          owner: "Tiffany +3",
          ownerAvatar: "team",
          dueDate: "Jun 2",
        },
      ],
    },
    {
      id: "day-30",
      title: "Day 30 - Adopt Gate",
      status: "In progress",
      progressPercent: 13,
      progressLabel: "13% - 1/8",
      owner: "Unassigned",
      ownerAvatar: "unknown",
      dueDate: "Jun 30",
      defaultExpanded: true,
      description:
        "Phase: Adopt. All three waves have completed their individual checkpoints. Every active project is on the page, current, with evidence. Accountability is live, Friday updates and weekly coaching are running, and blockers get help within 24 hours. Gate: every active project is on the page, current, with evidence - no parallel updates in chat.",
      tasks: [
        {
          id: "day-30-1",
          title: "Wave 1 - Day 5 - Leadership Demos Own Pages; Wave...",
          type: "Feature",
          priority: "Medium",
          status: "To do",
          owner: "Unassigned",
          ownerAvatar: "unknown",
          dueDate: "Jun 5",
        },
        {
          id: "day-30-2",
          title: "Wave 2 - Day 5 / Wave 3 - Day 1 - Leads: First Real Ca...",
          type: "Feature",
          priority: "Medium",
          status: "To do",
          owner: "Erinski Easy",
          ownerAvatar: "person",
          dueDate: "Jun 9",
        },
        {
          id: "day-30-3",
          title: "Leadership Kickoff: Apply TAC to all TAC Team projects",
          type: "Documentation",
          priority: "Low",
          status: "Done",
          owner: "Tiffany +3",
          ownerAvatar: "team",
          dueDate: "Jun 11",
        },
        {
          id: "day-30-4",
          title: "Wave 3 - Day 5 - Teams: Daily Rhythm Lands",
          type: "Feature",
          priority: "Medium",
          status: "To do",
          owner: "Unassigned",
          ownerAvatar: "unknown",
          dueDate: "Jun 13",
        },
        {
          id: "day-30-5",
          title: "Wave 1 - Day 15 - Leadership: Set the Tone, Open the ...",
          type: "Feature",
          priority: "Medium",
          status: "To do",
          owner: "Unassigned",
          ownerAvatar: "unknown",
          dueDate: "Jun 15",
        },
        {
          id: "day-30-6",
          title: "Wave 2 - Day 15 - Leads: Harden the Habit",
          type: "Feature",
          priority: "Medium",
          status: "To do",
          owner: "Unassigned",
          ownerAvatar: "unknown",
          dueDate: "Jun 19",
        },
        {
          id: "day-30-7",
          title: "Wave 3 - Day 15 - Teams: This Is Just How We Work",
          type: "Feature",
          priority: "Medium",
          status: "To do",
          owner: "Unassigned",
          ownerAvatar: "unknown",
          dueDate: "Jun 23",
        },
        {
          id: "day-30-8",
          title: "Wave 2 - Day 30 - Leads: Run the Full Loop Unaided",
          type: "Feature",
          priority: "Medium",
          status: "To do",
          owner: "Unassigned",
          ownerAvatar: "unknown",
          dueDate: "Jul 6",
        },
      ],
    },
    {
      id: "day-60",
      title: "Day 60 - Embed Gate",
      status: "Not started",
      progressPercent: 0,
      progressLabel: "0% - 0/4",
      owner: "Unassigned",
      ownerAvatar: "unknown",
      dueDate: "Jul 30",
      tasks: [],
    },
    {
      id: "day-90",
      title: "Day 90 - Prove and Scale Gate",
      status: "Not started",
      progressPercent: 0,
      progressLabel: "0% - 0/3",
      owner: "Unassigned",
      ownerAvatar: "unknown",
      dueDate: "Aug 28",
      tasks: [],
    },
  ],
};

export const tacDashboardData: TacDashboardData = {
  organization: "Intellibus Delivery",
  project: "T.A.C",
  pageTitle: "Overview",
  healthScore: 50,
  healthStatus: "Behind",
  healthDates: ["Jun 18", "Jun 19", "Jun 20", "Jun 21", "Jun 22", "Jun 23", "Jun 24"],
  operational: {
    blockerStatus: "No open blockers",
    items: [
      {
        title: "Milestones",
        detail: "6 late tasks",
        badge: "Behind",
        tone: "amber",
      },
      {
        title: "Reporting",
        detail: "0 of 6 filed today, 6 flagged",
        badge: "6 flagged",
        tone: "rose",
      },
    ],
  },
  momentum: [
    {
      label: "Milestones",
      detail: "1 of 4 milestones done",
      value: "1/4",
      tone: "amber",
    },
    {
      label: "Reports (7d)",
      detail: "Filed in the last 7 days",
      value: "0",
      tone: "neutral",
    },
    {
      label: "Compliance",
      detail: "Filed today",
      value: "0/6",
      tone: "rose",
    },
  ],
  businessOutcome: {
    title: "Business Outcome",
    prompt: "Capture the win condition for this project.",
    columns: [
      {
        eyebrow: "What are we doing?",
        body: "Building T.A.C. (Team Alignment Checkpoints), a standard operating system for how every project moves from idea to live",
      },
      {
        eyebrow: "Which problem are we solving?",
        body: "Project truth lives in scattered talk, so intent gets lost, demos drift, and blockers stay hidden.",
      },
      {
        eyebrow: "How are we solving it?",
        body: "Six phases, fixed checkpoints, one owner, evidence at each gate, and plain Green/Amber/Red status.",
      },
      {
        eyebrow: "Who are we solving for?",
        body: "Leadership gets trusted visibility; squads get clear expectations; QA and owners get proof to sign off.",
      },
    ],
  },
  team: {
    count: 9,
  },
  milestones: tacMilestones,
  reporting: {
    requiredToday: [
      { id: "erinski", name: "Erinski Easy", lastFiledAt: "Jun 23 at 18:22" },
      { id: "tiffany", name: "Tiffany Tomlin", lastFiledAt: "Jun 23 at 13:53" },
    ],
  },
};
