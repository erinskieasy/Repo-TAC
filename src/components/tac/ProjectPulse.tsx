import { Check, MessageSquarePlus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ACTIVITY_SOURCES,
  CATEGORY_LABEL,
  PULSE_GROUPS,
  SEEDED_SIGNALS,
  labelToCategory,
} from "./pulseData";
import type { ActivitySignal, LoggedUpdate, ProjectType, PulseCategory } from "./pulseData";

type TimelineEntry = { text: string; loggedAt: string; actor?: string };

type ProjectPulseProps = {
  projectName: string;
  projectUpdates: LoggedUpdate[];
  onConfirmSignal: (entries: { label: string; text: string }[]) => void;
  onTellAtlas: () => void;
};

export function ProjectPulse({ projectName, projectUpdates, onConfirmSignal, onTellAtlas }: ProjectPulseProps) {
  const [projectType, setProjectType] = useState<ProjectType>("technical");
  const [confirmedSignals, setConfirmedSignals] = useState<Set<string>>(new Set());

  const sources = ACTIVITY_SOURCES.filter((source) => source.types.includes(projectType));
  const signals = SEEDED_SIGNALS.filter((signal) => signal.type === projectType && !confirmedSignals.has(signal.id));

  // Group every logged entry into the five pulse categories for the timeline.
  const grouped = useMemo(() => {
    const result: Record<PulseCategory, TimelineEntry[]> = {
      progress: [],
      watching: [],
      blocker: [],
      nextStep: [],
      decision: [],
    };
    for (const update of projectUpdates) {
      for (const entry of update.entries) {
        const category = labelToCategory(entry.label);
        if (category) {
          result[category].push({ text: entry.text, loggedAt: update.loggedAt });
        }
      }
    }
    return result;
  }, [projectUpdates]);

  const totalEntries = Object.values(grouped).reduce((sum, items) => sum + items.length, 0);

  function confirmSignal(signal: ActivitySignal) {
    onConfirmSignal(
      signal.proposed.map((item) => ({ label: CATEGORY_LABEL[item.category], text: item.text })),
    );
    setConfirmedSignals((current) => new Set(current).add(signal.id));
  }

  return (
    <div className="pulse">
      <header className="pulse-head">
        <div>
          <span className="pulse-eyebrow">AI project memory &amp; alignment layer</span>
          <h1>{projectName} · Project Pulse</h1>
          <p>Work happens → signals appear → Atlas creates understanding → you confirm → the team stays aligned.</p>
        </div>
        <button className="pulse-tell-atlas" type="button" onClick={onTellAtlas}>
          <MessageSquarePlus aria-hidden="true" />
          <span>Tell Atlas what changed</span>
        </button>
      </header>

      <div className="pulse-type-toggle" role="tablist" aria-label="Project type">
        {(["technical", "non-technical"] as ProjectType[]).map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={projectType === type}
            className={projectType === type ? "is-active" : ""}
            onClick={() => setProjectType(type)}
          >
            {type === "technical" ? "Technical project" : "Non-technical project"}
          </button>
        ))}
      </div>

      <section className="pulse-sources" aria-label="Activity sources">
        {sources.map((source) => (
          <div key={source.group} className="pulse-source-card">
            <div className="pulse-source-icon">
              <source.icon aria-hidden="true" />
            </div>
            <div className="pulse-source-body">
              <strong>{source.group}</strong>
              <span className="pulse-source-connectors">{source.connectors}</span>
              <span className="pulse-source-detects">Atlas extracts: {source.detects}</span>
            </div>
            {source.native ? (
              <span className="pulse-source-badge">Built in</span>
            ) : source.group === "Manual" ? (
              <button className="pulse-source-action" type="button" onClick={onTellAtlas}>
                Open
              </button>
            ) : (
              <button className="pulse-source-action" type="button" disabled title="Connector — demo">
                Connect
              </button>
            )}
          </div>
        ))}
      </section>

      {signals.length > 0 ? (
        <section className="pulse-signals" aria-label="Detected signals">
          <h2 className="pulse-section-title">
            <Sparkles aria-hidden="true" /> Atlas detected — confirm to add to the timeline
          </h2>
          {signals.map((signal) => (
            <article key={signal.id} className="pulse-signal">
              <div className="pulse-signal-head">
                <span className="pulse-signal-icon">
                  <signal.icon aria-hidden="true" />
                </span>
                <div>
                  <strong>
                    {signal.source}
                    {signal.actor ? <span className="pulse-signal-actor"> · {signal.actor}</span> : null}
                  </strong>
                  <span className="pulse-signal-detail">{signal.detail}</span>
                </div>
              </div>
              <p className="pulse-signal-summary">“{signal.summary}”</p>
              <ul className="pulse-signal-proposed">
                {signal.proposed.map((item, index) => (
                  <li key={index} className={`pulse-chip tone-${item.category}`}>
                    {CATEGORY_LABEL[item.category]}: {item.text}
                  </li>
                ))}
              </ul>
              <button className="pulse-confirm" type="button" onClick={() => confirmSignal(signal)}>
                <Check aria-hidden="true" />
                <span>Confirm &amp; log</span>
              </button>
            </article>
          ))}
        </section>
      ) : null}

      <section className="pulse-timeline" aria-label="Project pulse timeline">
        <h2 className="pulse-section-title">Today</h2>
        {totalEntries === 0 ? (
          <div className="pulse-empty">
            <p>No signals yet. Confirm a detection above, or tell Atlas what changed.</p>
          </div>
        ) : (
          <div className="pulse-groups">
            {PULSE_GROUPS.map((group) => (
              <div key={group.key} className={`pulse-group tone-${group.key}`}>
                <div className="pulse-group-head">
                  <span className="pulse-group-icon">
                    <group.icon aria-hidden="true" />
                  </span>
                  <strong>{group.label}</strong>
                  <span className="pulse-group-count">{grouped[group.key].length}</span>
                </div>
                {grouped[group.key].length === 0 ? (
                  <p className="pulse-group-empty">None</p>
                ) : (
                  <ul>
                    {grouped[group.key].map((entry, index) => (
                      <li key={index}>
                        <span>{entry.text}</span>
                        <time>{entry.loggedAt}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
