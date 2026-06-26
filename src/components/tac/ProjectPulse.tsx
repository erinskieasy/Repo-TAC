import { Check, Github, MessageSquarePlus, RefreshCw, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ACTIVITY_SOURCES,
  CATEGORY_LABEL,
  PULSE_GROUPS,
  SEEDED_SIGNALS,
  labelToCategory,
} from "./pulseData";
import type { ActivitySignal, ActivitySource, LoggedUpdate, ProjectType, PulseCategory } from "./pulseData";
import {
  buildSignalFromCommits,
  fetchRecentCommits,
  loadGithubConfig,
  saveGithubConfig,
  verifyRepo,
} from "./github";

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
  const [liveSignals, setLiveSignals] = useState<ActivitySignal[]>([]);

  const sources = ACTIVITY_SOURCES.filter((source) => source.types.includes(projectType));

  // Live GitHub signals replace the seeded git demo once connected.
  const hasLiveGit = liveSignals.some((signal) => !confirmedSignals.has(signal.id));
  const seeded = SEEDED_SIGNALS.filter(
    (signal) =>
      signal.type === projectType &&
      !confirmedSignals.has(signal.id) &&
      !(hasLiveGit && signal.id === "sig-git"),
  );
  const signals = [
    ...liveSignals.filter((signal) => signal.type === projectType && !confirmedSignals.has(signal.id)),
    ...seeded,
  ];

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
        {sources.map((source) =>
          source.group === "Code" ? (
            <GithubSourceCard key="Code" source={source} onSignal={(signal) => setLiveSignals([signal])} />
          ) : (
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
          ),
        )}
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

// A real GitHub connection: enter a token + repo, fetch recent commits, build a live signal.
function GithubSourceCard({ source, onSignal }: { source: ActivitySource; onSignal: (signal: ActivitySignal) => void }) {
  const initial = loadGithubConfig();
  const [connected, setConnected] = useState(Boolean(initial.token && initial.repo));
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState(initial.token);
  const [repo, setRepo] = useState(initial.repo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function pullCommits(activeRepo: string, activeToken: string) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const commits = await fetchRecentCommits({ token: activeToken, repo: activeRepo });
      if (commits.length === 0) {
        setStatus("Connected — no recent commits found.");
        return;
      }
      onSignal(buildSignalFromCommits(activeRepo, commits));
      setStatus(`Pulled ${commits.length} commits from ${activeRepo}.`);
    } catch {
      setError("Couldn't fetch commits — check the token's repo access.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect() {
    setBusy(true);
    setError("");
    const result = await verifyRepo({ token, repo });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not connect.");
      return;
    }
    saveGithubConfig({ token, repo });
    setConnected(true);
    setShowForm(false);
    await pullCommits(repo, token);
  }

  function handleDisconnect() {
    saveGithubConfig({ token: "", repo: "" });
    setConnected(false);
    setToken("");
    setRepo("");
    setStatus("");
  }

  return (
    <div className="pulse-source-card pulse-source-github">
      <div className="pulse-source-row">
        <div className="pulse-source-icon">
          <Github aria-hidden="true" />
        </div>
        <div className="pulse-source-body">
          <strong>{source.group}</strong>
          <span className="pulse-source-connectors">{connected ? repo : "GitHub"}</span>
          <span className="pulse-source-detects">Atlas extracts: {source.detects}</span>
        </div>
        {connected ? (
          <div className="pulse-github-actions">
            <button
              className="pulse-source-action"
              type="button"
              disabled={busy}
              onClick={() => pullCommits(repo, token)}
            >
              <RefreshCw aria-hidden="true" />
              <span>{busy ? "Syncing…" : "Refresh"}</span>
            </button>
            <button className="pulse-source-action is-ghost" type="button" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="pulse-source-action is-primary" type="button" onClick={() => setShowForm((s) => !s)}>
            Connect
          </button>
        )}
      </div>

      {showForm && !connected ? (
        <div className="pulse-github-form">
          <label className="pulse-github-label" htmlFor="gh-repo">
            Repository (owner/repo)
          </label>
          <input
            id="gh-repo"
            className="pulse-github-input"
            value={repo}
            placeholder="octocat/Hello-World"
            onChange={(event) => setRepo(event.target.value)}
          />
          <label className="pulse-github-label" htmlFor="gh-token">
            Personal access token (stored only in this browser)
          </label>
          <input
            id="gh-token"
            className="pulse-github-input"
            type="password"
            value={token}
            placeholder="ghp_…"
            autoComplete="off"
            onChange={(event) => setToken(event.target.value)}
          />
          <p className="pulse-github-help">
            Create a fine-grained token with read access to the repo's contents. Public repos work without a token,
            but adding one raises the rate limit.
          </p>
          <div className="pulse-github-form-actions">
            <button className="pulse-source-action is-primary" type="button" disabled={busy || !repo} onClick={handleConnect}>
              {busy ? "Connecting…" : "Connect & sync"}
            </button>
            <button className="pulse-source-action is-ghost" type="button" onClick={() => setShowForm(false)}>
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="pulse-github-error">{error}</p> : null}
      {status ? <p className="pulse-github-status">{status}</p> : null}
    </div>
  );
}
