import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReportEntry, ReportingPerson, ReportingSectionData } from "./types";

// A weekly-demonstration submission, derived from sprint-review voiceovers.
export type ReportingDemonstration = {
  id: string;
  label: string;
  dateLabel: string;
  statusLabel: string;
  submitted: boolean;
  transcript?: string;
  recordedAtLabel?: string;
};

type ReportingSectionProps = {
  data: ReportingSectionData;
  reports: ReportEntry[];
  onAddReport: () => void;
  demonstrations?: ReportingDemonstration[];
  onDownloadPacket?: (id: string) => void;
};

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function reporterInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function reportSummary(report: ReportEntry) {
  const summary = report.entries.find((entry) => entry.label === "Summary");
  const status = report.entries.find((entry) => entry.label === "Status");
  const progress = report.entries.find((entry) => entry.label === "Progress");
  const blocker = report.entries.find((entry) => entry.label === "Blocker");
  const risk = report.entries.find((entry) => entry.label === "Risk");
  const firstDetail = report.entries.find((entry) => entry.label !== "Owner");
  return summary?.text ?? status?.text ?? progress?.text ?? blocker?.text ?? risk?.text ?? firstDetail?.text ?? "No summary captured.";
}

export function ReportingSection({
  data,
  reports,
  onAddReport,
  demonstrations,
  onDownloadPacket,
}: ReportingSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const requiredByName = useMemo(() => {
    return new Map(data.requiredToday.map((person) => [person.name.toLowerCase(), person]));
  }, [data.requiredToday]);

  const todayReports = reports.filter((report) => {
    if (!normalizedSearch) {
      return true;
    }
    const searchable = [report.reporterName, ...report.entries.map((entry) => `${entry.label} ${entry.text}`)]
      .join(" ")
      .toLowerCase();
    return searchable.includes(normalizedSearch);
  });

  const filedRequiredNames = new Set(
    reports
      .map((report) => report.reporterName.toLowerCase())
      .filter((name) => requiredByName.has(name)),
  );

  const missingPeople = data.requiredToday.filter((person) => {
    if (filedRequiredNames.has(person.name.toLowerCase())) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }
    return person.name.toLowerCase().includes(normalizedSearch);
  });

  const filedCount = filedRequiredNames.size;
  const requiredCount = data.requiredToday.length;

  return (
    <div className="reporting-page">
      <div className="reporting-heading-row">
        <div className="reporting-title-wrap">
          <h1 id="reporting-title">Reporting</h1>
          <span>{requiredCount} check-ins</span>
        </div>
        <button className="milestone-primary-action reporting-primary-action" type="button" onClick={onAddReport}>
          <Plus aria-hidden="true" />
          <span>Add today's report</span>
        </button>
      </div>

      {demonstrations && demonstrations.length > 0 ? (
        <div className="reporting-demos">
          <div className="reporting-section-heading">
            <span>Weekly demonstrations</span>
            <strong>
              {demonstrations.filter((demo) => demo.submitted).length}/{demonstrations.length} submitted
            </strong>
          </div>
          <div className="reporting-demo-grid">
            {demonstrations.map((demo) => (
              <article
                className={demo.submitted ? "reporting-demo-card is-submitted" : "reporting-demo-card is-missing"}
                key={demo.id}
              >
                <div className="reporting-card-topline">
                  <span className={demo.submitted ? "reporting-status is-filed" : "reporting-status is-missing"}>
                    <span aria-hidden="true" />
                    {demo.submitted ? "Submitted" : "Missing"}
                  </span>
                  <time>{demo.dateLabel}</time>
                </div>
                <div className="reporting-person-row">
                  <h2>{demo.label}</h2>
                  <span className="reporting-demo-status">{demo.statusLabel}</span>
                </div>
                <span className="reporting-card-label">Voiceover transcript</span>
                <p>{demo.submitted ? demo.transcript : "No voiceover recorded for this demonstration yet."}</p>
                <div className="reporting-card-footer">
                  <span className="reporting-demo-meta">
                    {demo.recordedAtLabel ? `Recorded ${demo.recordedAtLabel}` : "Awaiting submission"}
                  </span>
                  {onDownloadPacket ? (
                    <button type="button" onClick={() => onDownloadPacket(demo.id)}>
                      <FileText aria-hidden="true" />
                      Packet
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="reporting-toolbar">
        <label className="reporting-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search reports</span>
          <input
            type="search"
            placeholder="Search reports"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <div className="reporting-filter-row">
          <button className="reporting-date-pill" type="button">
            <ChevronLeft aria-hidden="true" />
            <span>Today - {todayLabel()}</span>
            <ChevronDown aria-hidden="true" />
            <ChevronRight aria-hidden="true" />
          </button>
          <button className="reporting-filter-pill" type="button">
            <span>Status</span>
            <strong>All</strong>
            <ChevronDown aria-hidden="true" />
          </button>
          <button className="reporting-filter-pill" type="button">
            <span>Sort</span>
            <strong>Status</strong>
            <ChevronDown aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="reporting-section-heading">
        <span>Reported today</span>
        <strong>
          {filedCount}/{requiredCount} filed
        </strong>
      </div>

      {todayReports.length > 0 ? (
        <div className="reporting-filed-grid">
          {todayReports.map((report) => (
            <article className="reporting-filed-card" key={report.id}>
              <div className="reporting-card-topline">
                <span className="reporting-status is-filed">
                  <span aria-hidden="true" />
                  Filed
                </span>
                <time>{report.filedAt}</time>
              </div>
              <div className="reporting-person-row">
                <span className="reporting-avatar" aria-hidden="true">
                  {reporterInitials(report.reporterName)}
                </span>
                <h2>{report.reporterName}</h2>
              </div>
              <span className="reporting-card-label">Summary</span>
              <p>{reportSummary(report)}</p>
              {report.entries.some((entry) => entry.label !== "Summary") ? (
                <div className="reporting-entry-list">
                  {report.entries
                    .filter((entry) => entry.label !== "Summary")
                    .map((entry) => (
                      <span key={`${report.id}-${entry.label}`}>
                        {entry.label}: {entry.text}
                      </span>
                    ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="reporting-empty-state">
          <ClipboardList aria-hidden="true" />
          <p>No reports filed yet for this day.</p>
        </div>
      )}

      <div className="reporting-section-heading">
        <span>Hasn't filed yet</span>
        <strong>{missingPeople.length} waiting</strong>
      </div>

      <div className="reporting-missing-grid">
        {missingPeople.map((person) => (
          <MissingReportCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}

function MissingReportCard({ person }: { person: ReportingPerson }) {
  return (
    <article className="reporting-missing-card">
      <div className="reporting-card-topline">
        <span className="reporting-status is-missing">
          <span aria-hidden="true" />
          Missing
        </span>
        <time>Today</time>
      </div>
      <h2>{person.name}</h2>
      <span className="reporting-card-label">Progress today</span>
      <p>No report yet. Last filed {person.lastFiledAt}</p>
      <span className="reporting-card-label">Next steps</span>
      <p className="is-muted">Waiting on today's written update.</p>
      <div className="reporting-card-footer">
        <div className="reporting-person-row is-footer">
          <span className="reporting-avatar" aria-hidden="true">
            {reporterInitials(person.name)}
          </span>
          <span>{person.name}</span>
        </div>
        <button type="button">
          <CalendarDays aria-hidden="true" />
          Nudge
        </button>
      </div>
    </article>
  );
}
