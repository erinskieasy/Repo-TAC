import { projectKey } from "./certification";
import { escapeHtml, wrapHtmlDocument } from "./documentExport";
import { teamMembers } from "./tacData";
import type { MilestoneItem, TacDashboardData } from "./types";

// A logged documentation update, structurally matching the ProjectUpdate shape in TacDashboard.
export type CadenceUpdate = {
  id: number;
  loggedAt: string;
  entries: { label: string; text: string }[];
};

export type SprintReviewStatus = "upcoming" | "due" | "completed" | "missed";

export type ReviewAttendee = { id: string; name: string; present: boolean };

export type ReviewActionItem = {
  id: string;
  text: string;
  owner?: string;
  attachedMilestoneId?: string;
};

// The recorded weekly-demonstration voiceover. Only the transcript persists (audio is
// kept as an in-session blob URL); the transcript is the durable submitted deliverable.
export type Voiceover = {
  transcript: string;
  recordedAt: number;
  durationSec?: number;
};

export type SprintReview = {
  id: string; // "sprint-YYYYMMDD" (generated) or unique (manual)
  label: string; // "Sprint 4" — auto-numbered, editable
  scheduledAt: number; // date timestamp
  completedAt?: number; // set when marked complete → status "completed"
  attendees: ReviewAttendee[];
  decisions: string;
  actionItems: ReviewActionItem[];
  voiceover?: Voiceover; // weekly-demonstration voiceover + transcript
  seriesId?: string; // the recurring cadence this meeting belongs to (undefined for one-offs)
};

export type CadenceFrequency = "daily" | "weekly" | "biweekly" | "monthly";

// A recurring meeting cadence (e.g. a daily standup, a biweekly sprint review).
export type CadenceSeries = {
  id: string;
  name: string;
  frequency: CadenceFrequency;
  weekday: number; // 0 (Sun) – 6 (Sat); ignored for "daily" (every weekday)
  anchorDate: number;
};

export type CadenceState = { series: CadenceSeries[]; reviews: SprintReview[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Date helpers ──

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatReviewDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "Friday";
}

export function frequencyLabel(frequency: CadenceFrequency): string {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return "Every 4 weeks";
  }
}

function addDays(ms: number, days: number): number {
  const date = new Date(ms);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

// ── Status ──

export function deriveReviewStatus(review: SprintReview, now: number): SprintReviewStatus {
  if (review.completedAt) {
    return "completed";
  }
  const today = startOfDay(now);
  const day = startOfDay(review.scheduledAt);
  if (day < today) {
    return "missed";
  }
  if (day === today) {
    return "due";
  }
  return "upcoming";
}

// Reviews that need attention right now (drives the Cadence tab badge).
export function cadenceBadgeCount(reviews: SprintReview[], now: number): number {
  return reviews.filter((review) => {
    const status = deriveReviewStatus(review, now);
    return status === "due" || status === "missed";
  }).length;
}

// ── Generation ──

export function rosterAttendees(present = false): ReviewAttendee[] {
  return teamMembers.map((member) => ({ id: member.id, name: member.name, present }));
}

function dateStamp(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

// The dates a single series falls on, from its anchor through a forward horizon.
function seriesOccurrences(series: CadenceSeries, now: number): number[] {
  const start = startOfDay(series.anchorDate);
  const horizon = now + (series.frequency === "daily" ? 21 : 49) * DAY_MS;
  const occurrences: number[] = [];

  if (series.frequency === "daily") {
    let day = start;
    let guard = 0;
    while (day <= horizon && guard < 120) {
      const weekday = new Date(day).getDay();
      if (weekday !== 0 && weekday !== 6) {
        occurrences.push(day);
      }
      day = addDays(day, 1);
      guard += 1;
    }
    return occurrences;
  }

  const stepDays = series.frequency === "weekly" ? 7 : series.frequency === "biweekly" ? 14 : 28;
  const shift = (series.weekday - new Date(start).getDay() + 7) % 7;
  let day = addDays(start, shift);
  let guard = 0;
  while (day <= horizon && guard < 60) {
    occurrences.push(day);
    day = addDays(day, stepDays);
    guard += 1;
  }
  return occurrences;
}

// Generate dated meetings from every cadence series, merging in existing edited/completed
// meetings (matched by id) so user changes and one-off entries are preserved.
export function generateMeetings(
  series: CadenceSeries[],
  now: number,
  existing: SprintReview[],
): SprintReview[] {
  const byId = new Map(existing.map((review) => [review.id, review]));
  const generated: SprintReview[] = [];

  for (const cadence of series) {
    for (const occurrence of seriesOccurrences(cadence, now)) {
      const id = `${cadence.id}-${dateStamp(occurrence)}`;
      const prior = byId.get(id);
      generated.push(
        prior ?? {
          id,
          seriesId: cadence.id,
          label: cadence.name,
          scheduledAt: occurrence,
          attendees: rosterAttendees(false),
          decisions: "",
          actionItems: [],
        },
      );
      byId.delete(id);
    }
  }

  // Keep one-off / orphaned meetings (manual logs, removed series) so edits survive.
  const leftovers = Array.from(byId.values());
  return [...generated, ...leftovers].sort((a, b) => a.scheduledAt - b.scheduledAt);
}

// A one-off meeting that already happened — used by "Log past meeting".
export function makePastMeeting(name: string, scheduledAt: number, completedAt: number): SprintReview {
  return {
    id: `meeting-${scheduledAt}-${Math.floor(Math.random() * 1e6)}`,
    label: name.trim() || "Meeting",
    scheduledAt,
    completedAt,
    attendees: rosterAttendees(true),
    decisions: "",
    actionItems: [],
  };
}

// ── Seed ──

export function seedCadence(now: number): CadenceState {
  const series: CadenceSeries[] = [
    {
      id: "series-sprint-review",
      name: "Sprint Review",
      frequency: "biweekly",
      weekday: 5, // Friday
      anchorDate: startOfDay(now - 21 * DAY_MS),
    },
  ];
  const reviews = generateMeetings(series, now, []);

  // Mark the earliest past meeting completed so there's a real sample + the badge is meaningful.
  const today = startOfDay(now);
  const earliestPast = reviews
    .filter((review) => startOfDay(review.scheduledAt) < today)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
  if (earliestPast) {
    earliestPast.completedAt = earliestPast.scheduledAt + 16 * 60 * 60 * 1000;
    earliestPast.attendees = earliestPast.attendees.map((attendee, index) => ({
      ...attendee,
      present: index !== earliestPast.attendees.length - 1, // everyone but the last attended
    }));
    earliestPast.decisions =
      "Reviewed Wave 1 demos and the Day 30 gate. Agreed to keep evidence current in chat and unblock the API migration this week.";
    earliestPast.actionItems = [
      { id: `${earliestPast.id}-ai-1`, text: "Publish the launch overview page", owner: "Erinski Easy" },
    ];
  }

  return { series, reviews };
}

// ── Persistence ──

const KEY_PREFIX = "tac.cadence:";

// Old single-config shape, kept only to migrate previously-saved state.
type LegacyCadenceState = {
  config?: { sprintLengthWeeks?: number; reviewWeekday?: number; anchorDate?: number; seriesName?: string };
  reviews?: SprintReview[];
};

export function loadCadence(project: string): CadenceState | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + projectKey(project));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CadenceState & LegacyCadenceState;
    if (Array.isArray(parsed?.series) && Array.isArray(parsed.reviews)) {
      return { series: parsed.series, reviews: parsed.reviews };
    }
    // Migrate the legacy single-config shape into one series.
    if (parsed?.config && Array.isArray(parsed.reviews)) {
      const config = parsed.config;
      const seriesId = "series-sprint-review";
      // Re-id generated meetings onto the new series so a future series add won't duplicate them.
      const reviews = parsed.reviews.map((review) =>
        review.id.startsWith("sprint-")
          ? { ...review, seriesId, id: `${seriesId}-${dateStamp(review.scheduledAt)}` }
          : review,
      );
      return {
        series: [
          {
            id: seriesId,
            name: config.seriesName?.trim() || "Sprint Review",
            frequency: (config.sprintLengthWeeks ?? 2) >= 2 ? "biweekly" : "weekly",
            weekday: config.reviewWeekday ?? 5,
            anchorDate: config.anchorDate ?? startOfDay(Date.now()),
          },
        ],
        reviews,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCadence(project: string, state: CadenceState): void {
  try {
    localStorage.setItem(KEY_PREFIX + projectKey(project), JSON.stringify(state));
  } catch {
    // ignore storage failures — in-memory state still drives the UI
  }
}

// ── Calendar (.ics) export — real, no-login "Add to Google Calendar" ──

function icsStamp(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function icsDate(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function buildIcs(review: SprintReview, projectName: string, now: number): string {
  const start = icsDate(review.scheduledAt);
  const end = icsDate(review.scheduledAt + DAY_MS);
  const summary = `Sprint Review — ${review.label} · ${projectName}`;
  const description = review.decisions ? review.decisions.replace(/\n/g, " ") : "Sprint review checkpoint.";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TAC//Cadence//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${review.id}@team-alignment-center`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(review: SprintReview, projectName: string, now: number): void {
  const blob = new Blob([buildIcs(review, projectName, now)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${review.id}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ── Review packet ("print everything") ──

export function buildSprintReviewHtml(
  review: SprintReview,
  status: SprintReviewStatus,
  data: TacDashboardData,
  milestones: MilestoneItem[],
  updates: CadenceUpdate[],
): string {
  const present = review.attendees.filter((attendee) => attendee.present);
  const absent = review.attendees.filter((attendee) => !attendee.present);
  const attendanceHtml = `
    <p class="meta">Present (${present.length}/${review.attendees.length}): ${
      present.map((attendee) => escapeHtml(attendee.name)).join(", ") || "—"
    }</p>
    ${absent.length ? `<p class="meta">Absent: ${absent.map((attendee) => escapeHtml(attendee.name)).join(", ")}</p>` : ""}`;

  const actionItemsHtml = review.actionItems.length
    ? `<ul>${review.actionItems
        .map(
          (item) =>
            `<li>${escapeHtml(item.text)}${item.owner ? ` <em>— ${escapeHtml(item.owner)}</em>` : ""}${
              item.attachedMilestoneId ? " <em>(attached to milestone)</em>" : ""
            }</li>`,
        )
        .join("")}</ul>`
    : "<p>No action items captured.</p>";

  const milestonesHtml = milestones
    .map((milestone) => {
      const doneCount = milestone.tasks.filter((task) => task.status === "Done").length;
      return `
        <div class="entry">
          <div class="entry-head">
            <h2>${escapeHtml(milestone.title)}</h2>
            <span class="pill">${escapeHtml(milestone.status)}</span>
          </div>
          <p class="meta">${escapeHtml(milestone.progressLabel)} &middot; ${escapeHtml(milestone.owner)} &middot; Due ${escapeHtml(milestone.dueDate)} &middot; ${doneCount}/${milestone.tasks.length} tasks done</p>
        </div>`;
    })
    .join("");

  const updatesHtml = updates
    .map((update) => {
      const lines = update.entries
        .map((entry) => `<li><strong>${escapeHtml(entry.label)}:</strong> ${escapeHtml(entry.text)}</li>`)
        .join("");
      return `<div class="entry"><p class="meta">Logged ${escapeHtml(update.loggedAt)}</p><ul>${lines}</ul></div>`;
    })
    .join("");

  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const body = `
  <h1>${escapeHtml(data.project)} — Sprint Review Packet</h1>
  <p class="generated">${escapeHtml(review.label)} &middot; ${escapeHtml(formatReviewDate(review.scheduledAt))} &middot; ${escapeHtml(statusLabel)}</p>
  <div class="summary">
    <div><strong>${data.healthScore}%</strong><span>Delivery health</span></div>
    <div><strong>${present.length}/${review.attendees.length}</strong><span>Attendance</span></div>
    <div><strong>${review.actionItems.length}</strong><span>Action items</span></div>
  </div>
  <div class="section">
    <h2>Attendance</h2>
    ${attendanceHtml}
  </div>
  <div class="section">
    <h2>Decisions &amp; notes</h2>
    <p class="meta">${review.decisions ? escapeHtml(review.decisions) : "No decisions recorded."}</p>
  </div>
  <div class="section">
    <h2>Voiceover summary (transcript)</h2>
    <p class="meta">${
      review.voiceover?.transcript
        ? escapeHtml(review.voiceover.transcript)
        : "No voiceover recorded for this demonstration."
    }</p>
  </div>
  <div class="section">
    <h2>Action items (${review.actionItems.length})</h2>
    ${actionItemsHtml}
  </div>
  <div class="section">
    <h2>Delivery health</h2>
    <p class="meta">${escapeHtml(data.healthStatus)} &middot; score ${data.healthScore}%</p>
  </div>
  <div class="section">
    <h2>Milestones (${milestones.length})</h2>
    ${milestonesHtml || "<p>No milestones yet.</p>"}
  </div>
  <div class="section">
    <h2>Recent updates (${updates.length})</h2>
    ${updatesHtml || "<p>No updates logged yet.</p>"}
  </div>`;

  return wrapHtmlDocument(`${data.project} — ${review.label} Review Packet`, body);
}
