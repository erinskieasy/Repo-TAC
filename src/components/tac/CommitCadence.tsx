import { GitCommitHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchRecentCommits, loadGithubConfig, type GithubCommit } from "./github";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = 7;
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

type CadenceStats = {
  buckets: { count: number; weekday: number; isToday: boolean }[];
  streak: number;
  lastCommit?: GithubCommit;
};

function computeStats(commits: GithubCommit[], now: number): CadenceStats {
  const today = startOfDay(now);
  const buckets = Array.from({ length: DAYS }, (_, index) => {
    const dayStart = today - (DAYS - 1 - index) * DAY_MS;
    return { count: 0, weekday: new Date(dayStart).getDay(), isToday: index === DAYS - 1 };
  });
  for (const commit of commits) {
    const time = new Date(commit.date).getTime();
    if (Number.isNaN(time)) {
      continue;
    }
    const diff = Math.round((today - startOfDay(time)) / DAY_MS);
    if (diff >= 0 && diff < DAYS) {
      buckets[DAYS - 1 - diff].count += 1;
    }
  }
  // Streak = consecutive days with ≥1 commit ending today.
  let streak = 0;
  for (let index = buckets.length - 1; index >= 0; index -= 1) {
    if (buckets[index].count > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return { buckets, streak, lastCommit: commits[0] };
}

function relativeDay(dateString: string, now: number): string {
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) {
    return "unknown";
  }
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "yesterday";
  }
  return `${days} days ago`;
}

// Commit-cadence indicator, computed from the GitHub connection set up in Project Pulse.
// Shows the daily-commit record for the last 7 days, the current streak, and the last commit.
export function CommitCadence() {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error" | "disconnected">("idle");
  const [stats, setStats] = useState<CadenceStats | null>(null);
  const [repo, setRepo] = useState("");

  useEffect(() => {
    let cancelled = false;
    const config = loadGithubConfig();
    if (!config.repo) {
      setState("disconnected");
      return;
    }
    setRepo(config.repo);
    setState("loading");
    fetchRecentCommits(config, 50)
      .then((commits) => {
        if (cancelled) {
          return;
        }
        setStats(computeStats(commits, Date.now()));
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="commit-cadence">
      <div className="commit-cadence-head">
        <div className="commit-cadence-icon">
          <GitCommitHorizontal aria-hidden="true" />
        </div>
        <div className="commit-cadence-title">
          <strong>Commit cadence</strong>
          <span>
            {state === "ready" && stats
              ? `${stats.streak}-day streak${repo ? ` · ${repo}` : ""}`
              : state === "loading"
                ? "Loading commits…"
                : state === "disconnected"
                  ? "Connect GitHub in Activity to track"
                  : state === "error"
                    ? "Couldn't load commits"
                    : "Daily commit record"}
          </span>
        </div>
      </div>

      {state === "ready" && stats ? (
        <>
          <div className="commit-cadence-week" role="img" aria-label={`${stats.streak}-day commit streak`}>
            {stats.buckets.map((bucket, index) => (
              <div key={index} className="commit-cadence-day">
                <span
                  className={
                    bucket.count > 0
                      ? bucket.isToday
                        ? "commit-cadence-cell is-on is-today"
                        : "commit-cadence-cell is-on"
                      : "commit-cadence-cell"
                  }
                  title={`${bucket.count} commit${bucket.count === 1 ? "" : "s"}`}
                />
                <em>{WEEKDAY_INITIALS[bucket.weekday]}</em>
              </div>
            ))}
          </div>
          <span className="commit-cadence-meta">
            {stats.lastCommit
              ? `Last commit ${relativeDay(stats.lastCommit.date, Date.now())} · ${stats.lastCommit.author}`
              : "No commits in the last 50."}
          </span>
        </>
      ) : null}
    </div>
  );
}
