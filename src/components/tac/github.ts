import { GitCommit } from "lucide-react";
import type { ActivitySignal } from "./pulseData";

// Real GitHub connection — browser-only, using a Personal Access Token stored locally.
// api.github.com supports CORS, so commits can be fetched directly from the client.
const TOKEN_KEY = "tac.githubToken";
const REPO_KEY = "tac.githubRepo";

export type GithubConfig = { token: string; repo: string };

export function loadGithubConfig(): GithubConfig {
  try {
    return { token: localStorage.getItem(TOKEN_KEY) ?? "", repo: localStorage.getItem(REPO_KEY) ?? "" };
  } catch {
    return { token: "", repo: "" };
  }
}

export function saveGithubConfig(config: GithubConfig): void {
  try {
    if (config.token) {
      localStorage.setItem(TOKEN_KEY, config.token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (config.repo) {
      localStorage.setItem(REPO_KEY, config.repo);
    } else {
      localStorage.removeItem(REPO_KEY);
    }
  } catch {
    // ignore
  }
}

export type GithubCommit = { sha: string; subject: string; author: string; date: string };

// Verify the token + repo by hitting the repo endpoint.
export async function verifyRepo(config: GithubConfig): Promise<{ ok: boolean; error?: string }> {
  if (!config.repo.includes("/")) {
    return { ok: false, error: "Use owner/repo format (e.g. octocat/Hello-World)." };
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${config.repo}`, {
      headers: githubHeaders(config.token),
    });
    if (response.status === 404) {
      return { ok: false, error: "Repo not found (or token lacks access)." };
    }
    if (response.status === 401) {
      return { ok: false, error: "Invalid token." };
    }
    if (!response.ok) {
      return { ok: false, error: `GitHub error ${response.status}.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error reaching GitHub." };
  }
}

function githubHeaders(token: string): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchRecentCommits(config: GithubConfig, perPage = 10): Promise<GithubCommit[]> {
  const response = await fetch(
    `https://api.github.com/repos/${config.repo}/commits?per_page=${perPage}`,
    { headers: githubHeaders(config.token) },
  );
  if (!response.ok) {
    throw new Error(`GitHub ${response.status}`);
  }
  const data = await response.json();
  return (Array.isArray(data) ? data : []).map((item) => ({
    sha: item.sha as string,
    subject: String(item.commit?.message ?? "").split("\n")[0],
    author: String(item.commit?.author?.name ?? item.author?.login ?? "Unknown"),
    date: String(item.commit?.author?.date ?? ""),
  }));
}

// Turn real commits into a confirmable Atlas signal.
export function buildSignalFromCommits(repo: string, commits: GithubCommit[]): ActivitySignal {
  const authors = Array.from(new Set(commits.map((commit) => commit.author)));
  const actor = authors.length === 0 ? undefined : authors.length === 1 ? authors[0] : `${authors[0]} +${authors.length - 1}`;
  const subjects = Array.from(new Set(commits.map((commit) => commit.subject))).filter(Boolean);

  return {
    id: `gh-${commits[0]?.sha ?? "none"}`,
    type: "technical",
    icon: GitCommit,
    source: repo,
    actor,
    detail: `${commits.length} recent commit${commits.length === 1 ? "" : "s"}${actor ? ` · ${actor}` : ""}`,
    summary:
      subjects.length > 0
        ? `Recent work: ${subjects.slice(0, 3).join("; ")}${subjects.length > 3 ? "…" : ""}.`
        : "Recent commits detected.",
    proposed: subjects.slice(0, 5).map((subject) => ({ category: "progress" as const, text: subject })),
  };
}
