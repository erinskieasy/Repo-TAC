import {
  CalendarCheck2,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Paperclip,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { documentFileStamp, downloadHtmlAsDoc, printHtmlAsPdf } from "./documentExport";
import {
  buildSprintReviewHtml,
  deriveReviewStatus,
  downloadIcs,
  formatReviewDate,
  frequencyLabel,
  generateMeetings,
  makePastMeeting,
  type CadenceFrequency,
  type CadenceSeries,
  type CadenceState,
  type CadenceUpdate,
  type ReviewActionItem,
  type SprintReview,
  type SprintReviewStatus,
  type Voiceover,
} from "./cadence";
import { VoiceoverRecorder } from "./VoiceoverRecorder";
import type { MilestoneItem, TacDashboardData } from "./types";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const FREQUENCY_OPTIONS: CadenceFrequency[] = ["daily", "weekly", "biweekly", "monthly"];

// Preset meeting types for the "New cadence" picker.
const MEETING_PRESETS: {
  key: string;
  name: string;
  frequency: CadenceFrequency;
  weekday: number;
  hint: string;
}[] = [
  { key: "sprint-review", name: "Sprint Review", frequency: "biweekly", weekday: 5, hint: "Demo to stakeholders at sprint end" },
  { key: "standup", name: "Daily Standup", frequency: "daily", weekday: 1, hint: "Quick daily sync (weekdays)" },
  { key: "sprint-planning", name: "Sprint Planning", frequency: "biweekly", weekday: 1, hint: "Plan the upcoming sprint" },
  { key: "retro", name: "Retrospective", frequency: "biweekly", weekday: 5, hint: "Reflect and improve" },
  { key: "refinement", name: "Backlog Refinement", frequency: "weekly", weekday: 3, hint: "Groom the backlog" },
  { key: "one-on-one", name: "1:1", frequency: "weekly", weekday: 4, hint: "Manager / report check-in" },
  { key: "demo", name: "Stakeholder Demo", frequency: "biweekly", weekday: 4, hint: "Show progress to stakeholders" },
  { key: "all-hands", name: "All-hands", frequency: "monthly", weekday: 4, hint: "Whole-team town hall" },
  { key: "custom", name: "Custom", frequency: "weekly", weekday: 5, hint: "Define your own" },
];

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_LABEL: Record<SprintReviewStatus, string> = {
  upcoming: "Upcoming",
  due: "Due today",
  completed: "Completed",
  missed: "Missed",
};

const STATUS_FILTERS: { value: "all" | SprintReviewStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "due", label: "Due today" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
];

function toDateInput(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateInput(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).getTime();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function addDays(ms: number, days: number): number {
  const date = new Date(ms);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function addMonths(ms: number, months: number): number {
  const date = new Date(ms);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}

type ModalKind = "new" | "log" | null;

export function CadenceSection({
  projectName,
  data,
  milestones,
  projectUpdates,
  cadence,
  onChange,
  onAttachActionItem,
}: {
  projectName: string;
  data: TacDashboardData;
  milestones: MilestoneItem[];
  projectUpdates: CadenceUpdate[];
  cadence: CadenceState;
  onChange: (next: CadenceState) => void;
  onAttachActionItem: (
    milestoneId: string,
    items: { category: "nextStep"; text: string }[],
    owner: string,
  ) => void;
}) {
  const now = Date.now();
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<number>(now);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SprintReviewStatus>("all");
  const [modal, setModal] = useState<ModalKind>(null);

  const reviews = cadence.reviews;
  const selected = reviews.find((review) => review.id === selectedId) ?? null;

  // ── mutations ──
  function setReviews(next: SprintReview[]) {
    onChange({ ...cadence, reviews: next });
  }

  function updateReview(id: string, patch: Partial<SprintReview>) {
    setReviews(reviews.map((review) => (review.id === id ? { ...review, ...patch } : review)));
  }

  function removeReview(id: string) {
    setReviews(reviews.filter((review) => review.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  function createCadence(form: { name: string; frequency: CadenceFrequency; weekday: number; startDate: number }) {
    const series: CadenceSeries = {
      id: newId("series"),
      name: form.name.trim() || "Meeting",
      frequency: form.frequency,
      weekday: form.weekday,
      anchorDate: form.startDate,
    };
    const nextSeries = [...cadence.series, series];
    onChange({ series: nextSeries, reviews: generateMeetings(nextSeries, now, reviews) });
    setModal(null);
  }

  function logPastMeeting(form: { name: string; date: number }) {
    setReviews([...reviews, makePastMeeting(form.name, form.date, now)]);
    setModal(null);
  }

  function exportPacket(review: SprintReview, mode: "doc" | "pdf") {
    const html = buildSprintReviewHtml(review, deriveReviewStatus(review, now), data, milestones, projectUpdates);
    if (mode === "doc") {
      downloadHtmlAsDoc(html, `${review.id}-review-packet-${documentFileStamp()}.doc`);
    } else {
      printHtmlAsPdf(html);
    }
  }

  // ── calendar cells ──
  const cursorDate = new Date(cursor);
  const monthLabel = cursorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const cells = (() => {
    if (viewMode === "week") {
      const weekStart = addDays(cursor, -new Date(cursor).getDay());
      return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    }
    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1).getTime();
    const gridStart = addDays(first, -new Date(first).getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  })();

  const normalizedSearch = search.trim().toLowerCase();
  const visibleReviews = reviews.filter((review) => {
    if (statusFilter !== "all" && deriveReviewStatus(review, now) !== statusFilter) {
      return false;
    }
    if (normalizedSearch) {
      const haystack = [
        review.label,
        review.decisions,
        review.voiceover?.transcript ?? "",
        review.attendees.map((attendee) => attendee.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }
    return true;
  });

  function meetingsOn(day: number): SprintReview[] {
    return visibleReviews
      .filter((review) => sameDay(review.scheduledAt, day))
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }

  function shiftCursor(direction: -1 | 1) {
    setCursor((current) => (viewMode === "week" ? addDays(current, direction * 7) : addMonths(current, direction)));
  }

  return (
    <div className="cadence-page">
      <div className="cadence-heading-row">
        <div className="cadence-title-wrap">
          <h1 id="cadence-title">Cadence</h1>
          <span className="cadence-count">{reviews.length} meetings</span>
        </div>
        <div className="cadence-head-actions">
          <button className="cadence-ghost-action" type="button" onClick={() => setModal("log")}>
            Log past meeting
          </button>
          <button className="milestone-primary-action" type="button" onClick={() => setModal("new")}>
            <Plus aria-hidden="true" />
            <span>New cadence</span>
          </button>
        </div>
      </div>

      <div className="cadence-toolbar">
        <label className="reporting-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search meetings</span>
          <input
            type="search"
            placeholder="Search meetings"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="cadence-status-filter">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cadence-calendar">
        <div className="cadence-cal-head">
          <h2>{monthLabel}</h2>
          <div className="cadence-cal-nav">
            <button type="button" aria-label="Previous" onClick={() => shiftCursor(-1)}>
              <ChevronLeft aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setCursor(now)}>
              Today
            </button>
            <button type="button" aria-label="Next" onClick={() => shiftCursor(1)}>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="cadence-cal-toolbar">
          <div className="cadence-view-toggle">
            <button
              type="button"
              className={viewMode === "month" ? "is-active" : ""}
              onClick={() => setViewMode("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={viewMode === "week" ? "is-active" : ""}
              onClick={() => setViewMode("week")}
            >
              Week
            </button>
            <button type="button" onClick={() => setCursor(now)}>
              Today
            </button>
          </div>
        </div>

        <div className={viewMode === "week" ? "cadence-grid is-week" : "cadence-grid"}>
          {WEEKDAY_HEADERS.map((day) => (
            <div key={day} className="cadence-grid-header">
              {day.toUpperCase()}
            </div>
          ))}
          {cells.map((day) => {
            const inMonth = viewMode === "week" || new Date(day).getMonth() === cursorDate.getMonth();
            const dayMeetings = meetingsOn(day);
            return (
              <div
                key={day}
                className={[
                  "cadence-cell",
                  inMonth ? "" : "is-outside",
                  sameDay(day, now) ? "is-today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="cadence-cell-date">{new Date(day).getDate()}</span>
                <div className="cadence-cell-meetings">
                  {dayMeetings.map((review) => {
                    const status = deriveReviewStatus(review, now);
                    return (
                      <button
                        key={review.id}
                        type="button"
                        className={`cadence-chip is-${status}`}
                        onClick={() => setSelectedId(review.id)}
                      >
                        {review.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected ? (
        <MeetingDetailModal
          review={selected}
          status={deriveReviewStatus(selected, now)}
          milestones={milestones}
          onClose={() => setSelectedId(null)}
          onLabel={(label) => updateReview(selected.id, { label })}
          onDate={(scheduledAt) => updateReview(selected.id, { scheduledAt })}
          onToggleAttendee={(attendeeId) =>
            updateReview(selected.id, {
              attendees: selected.attendees.map((attendee) =>
                attendee.id === attendeeId ? { ...attendee, present: !attendee.present } : attendee,
              ),
            })
          }
          onDecisions={(decisions) => updateReview(selected.id, { decisions })}
          onVoiceover={(voiceover) => updateReview(selected.id, { voiceover })}
          onActionItems={(actionItems) => updateReview(selected.id, { actionItems })}
          onAttach={(item, milestoneId) => {
            if (!milestoneId || item.attachedMilestoneId) {
              return;
            }
            onAttachActionItem(milestoneId, [{ category: "nextStep", text: item.text }], item.owner ?? "");
            updateReview(selected.id, {
              actionItems: selected.actionItems.map((current) =>
                current.id === item.id ? { ...current, attachedMilestoneId: milestoneId } : current,
              ),
            });
          }}
          onComplete={() => updateReview(selected.id, { completedAt: Date.now() })}
          onReopen={() => updateReview(selected.id, { completedAt: undefined })}
          onExport={(mode) => exportPacket(selected, mode)}
          onAddToCalendar={() => downloadIcs(selected, projectName, now)}
          onRemove={() => removeReview(selected.id)}
        />
      ) : null}

      {modal === "new" ? (
        <NewCadenceModal onClose={() => setModal(null)} onCreate={createCadence} />
      ) : null}
      {modal === "log" ? (
        <LogPastMeetingModal now={now} onClose={() => setModal(null)} onLog={logPastMeeting} />
      ) : null}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="cadence-modal-layer" role="presentation">
      <button className="cadence-modal-backdrop" type="button" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <section className="cadence-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="cadence-modal-head">
          <strong>{title}</strong>
          <button className="cadence-modal-close" type="button" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function MeetingDetailModal({
  review,
  status,
  milestones,
  onClose,
  onLabel,
  onDate,
  onToggleAttendee,
  onDecisions,
  onVoiceover,
  onActionItems,
  onAttach,
  onComplete,
  onReopen,
  onExport,
  onAddToCalendar,
  onRemove,
}: {
  review: SprintReview;
  status: SprintReviewStatus;
  milestones: MilestoneItem[];
  onClose: () => void;
  onLabel: (label: string) => void;
  onDate: (scheduledAt: number) => void;
  onToggleAttendee: (attendeeId: string) => void;
  onDecisions: (decisions: string) => void;
  onVoiceover: (voiceover: Voiceover | undefined) => void;
  onActionItems: (items: ReviewActionItem[]) => void;
  onAttach: (item: ReviewActionItem, milestoneId: string) => void;
  onComplete: () => void;
  onReopen: () => void;
  onExport: (mode: "doc" | "pdf") => void;
  onAddToCalendar: () => void;
  onRemove: () => void;
}) {
  const presentCount = review.attendees.filter((attendee) => attendee.present).length;

  function addActionItem() {
    onActionItems([...review.actionItems, { id: newId("ai"), text: "" }]);
  }
  function updateActionItem(id: string, patch: Partial<ReviewActionItem>) {
    onActionItems(review.actionItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }
  function removeActionItem(id: string) {
    onActionItems(review.actionItems.filter((item) => item.id !== id));
  }

  return (
    <ModalShell title="Meeting" onClose={onClose}>
      <div className="cadence-detail">
        <div className="cadence-card-head">
          <span className={`cadence-status is-${status}`}>{STATUS_LABEL[status]}</span>
          <input
            className="cadence-card-label"
            aria-label="Meeting name"
            value={review.label}
            onChange={(event) => onLabel(event.target.value)}
          />
          <input
            className="cadence-card-date"
            type="date"
            aria-label="Meeting date"
            value={toDateInput(review.scheduledAt)}
            onChange={(event) => event.target.value && onDate(fromDateInput(event.target.value))}
          />
          <span className="cadence-card-date-label">{formatReviewDate(review.scheduledAt)}</span>
        </div>

        <div className="cadence-attendance">
          <span className="cadence-field-label">
            Attendance · {presentCount}/{review.attendees.length}
          </span>
          <div className="cadence-attendee-row">
            {review.attendees.map((attendee) => (
              <button
                key={attendee.id}
                type="button"
                className={attendee.present ? "cadence-attendee is-present" : "cadence-attendee"}
                aria-pressed={attendee.present}
                onClick={() => onToggleAttendee(attendee.id)}
              >
                {attendee.present ? <Check aria-hidden="true" /> : null}
                {attendee.name}
              </button>
            ))}
          </div>
        </div>

        <label className="cadence-decisions">
          <span className="cadence-field-label">Decisions &amp; notes</span>
          <textarea
            value={review.decisions}
            rows={2}
            placeholder="What was reviewed, decisions made, outcomes…"
            onChange={(event) => onDecisions(event.target.value)}
          />
        </label>

        <VoiceoverRecorder voiceover={review.voiceover} onChange={onVoiceover} />

        <div className="cadence-actions-block">
          <div className="cadence-actions-head">
            <span className="cadence-field-label">Action items</span>
            <button className="cadence-add-action" type="button" onClick={addActionItem}>
              <Plus aria-hidden="true" />
              <span>Add</span>
            </button>
          </div>
          {review.actionItems.length === 0 ? (
            <p className="cadence-actions-empty">No action items captured.</p>
          ) : (
            review.actionItems.map((item) => (
              <div key={item.id} className="cadence-action-row">
                <input
                  className="cadence-action-text"
                  value={item.text}
                  placeholder="Follow-up…"
                  onChange={(event) => updateActionItem(item.id, { text: event.target.value })}
                />
                {item.attachedMilestoneId ? (
                  <span className="cadence-action-attached">
                    <Paperclip aria-hidden="true" />
                    Attached
                  </span>
                ) : (
                  <select
                    className="cadence-action-attach"
                    aria-label="Attach to milestone"
                    value=""
                    disabled={!item.text.trim()}
                    onChange={(event) => onAttach(item, event.target.value)}
                  >
                    <option value="">Attach to milestone…</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="cadence-action-remove"
                  aria-label="Remove action item"
                  onClick={() => removeActionItem(item.id)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="cadence-detail-footer">
          <button className="cadence-detail-remove" type="button" onClick={onRemove}>
            <Trash2 aria-hidden="true" />
            <span>Delete</span>
          </button>
          <div className="cadence-detail-actions">
            <button type="button" onClick={onAddToCalendar}>
              <CalendarPlus aria-hidden="true" />
              <span>Add to calendar</span>
            </button>
            <button type="button" onClick={() => onExport("doc")}>
              <FileDown aria-hidden="true" />
              <span>Packet</span>
            </button>
            <button type="button" onClick={() => onExport("pdf")}>
              <Printer aria-hidden="true" />
              <span>PDF</span>
            </button>
            {status === "completed" ? (
              <button className="cadence-detail-primary is-reopen" type="button" onClick={onReopen}>
                <RotateCcw aria-hidden="true" />
                <span>Reopen</span>
              </button>
            ) : (
              <button className="cadence-detail-primary" type="button" onClick={onComplete}>
                <CalendarCheck2 aria-hidden="true" />
                <span>Mark complete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function NewCadenceModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (form: { name: string; frequency: CadenceFrequency; weekday: number; startDate: number }) => void;
}) {
  const [presetKey, setPresetKey] = useState(MEETING_PRESETS[0].key);
  const [name, setName] = useState(MEETING_PRESETS[0].name);
  const [frequency, setFrequency] = useState<CadenceFrequency>(MEETING_PRESETS[0].frequency);
  const [weekday, setWeekday] = useState(MEETING_PRESETS[0].weekday);
  const [startDate, setStartDate] = useState(toDateInput(Date.now()));

  function applyPreset(key: string) {
    const preset = MEETING_PRESETS.find((option) => option.key === key) ?? MEETING_PRESETS[0];
    setPresetKey(key);
    setFrequency(preset.frequency);
    setWeekday(preset.weekday);
    if (preset.key !== "custom") {
      setName(preset.name);
    }
  }

  const activeHint = MEETING_PRESETS.find((option) => option.key === presetKey)?.hint;

  return (
    <ModalShell title="New cadence" onClose={onClose}>
      <div className="cadence-form">
        <label className="cadence-form-field">
          <span>Meeting type</span>
          <select value={presetKey} onChange={(event) => applyPreset(event.target.value)}>
            {MEETING_PRESETS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.name}
              </option>
            ))}
          </select>
          {activeHint ? <span className="cadence-form-hint">{activeHint}</span> : null}
        </label>

        <label className="cadence-form-field">
          <span>Name</span>
          <input value={name} placeholder="Sprint Review" onChange={(event) => setName(event.target.value)} />
        </label>

        <div className="cadence-form-row">
          <label className="cadence-form-field">
            <span>Repeats</span>
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as CadenceFrequency)}
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {frequencyLabel(option)}
                </option>
              ))}
            </select>
          </label>
          {frequency !== "daily" ? (
            <label className="cadence-form-field">
              <span>On</span>
              <select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="cadence-form-field">
            <span>Starting</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
        </div>

        <div className="cadence-form-actions">
          <button className="cadence-ghost-action" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="milestone-primary-action"
            type="button"
            onClick={() => onCreate({ name, frequency, weekday, startDate: fromDateInput(startDate) })}
          >
            <Plus aria-hidden="true" />
            <span>Create cadence</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function LogPastMeetingModal({
  now,
  onClose,
  onLog,
}: {
  now: number;
  onClose: () => void;
  onLog: (form: { name: string; date: number }) => void;
}) {
  const [name, setName] = useState("Sprint Review");
  const [date, setDate] = useState(toDateInput(now));

  return (
    <ModalShell title="Log past meeting" onClose={onClose}>
      <div className="cadence-form">
        <label className="cadence-form-field">
          <span>Meeting name</span>
          <input value={name} placeholder="Sprint Review" onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="cadence-form-field">
          <span>Date it happened</span>
          <input type="date" value={date} max={toDateInput(now)} onChange={(event) => setDate(event.target.value)} />
        </label>
        <div className="cadence-form-actions">
          <button className="cadence-ghost-action" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="milestone-primary-action"
            type="button"
            onClick={() => onLog({ name, date: fromDateInput(date) })}
          >
            <Check aria-hidden="true" />
            <span>Log meeting</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
