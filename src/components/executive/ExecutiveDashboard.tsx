import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Boxes,
  Calendar,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CreditCard,
  Database,
  FileText,
  Flame,
  Folder,
  FolderClosed,
  Heart,
  LayoutDashboard,
  LogOut,
  Moon,
  Rocket,
  Settings,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Sprout,
  SunMedium,
  Trophy,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  attentionSummary,
  byActivity,
  certBreakdown,
  executiveProjects,
  milestonesThisWeekTotal,
  portfolioActivityDelta,
  portfolioHealthDelta,
  portfolioKpis,
  portfolioTrend,
  projectActivity,
  projectStatus,
  type ExecProject,
} from "./executiveData";

const EXEC_NAME = "Tiffany";
const EXEC_PHOTO = "https://randomuser.me/api/portraits/women/68.jpg";

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

const PROJECT_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  farmflow: { icon: Sprout, color: "#0ea5e9" },
  billing: { icon: CreditCard, color: "#f97316" },
  checkout: { icon: ShoppingCart, color: "#f97316" },
  "atlas-mobile": { icon: Smartphone, color: "#6366f1" },
  "data-platform": { icon: Database, color: "#2f74c9" },
  tac: { icon: Boxes, color: "#5b6470" },
};

function statusClass(status: string): string {
  if (status === "Healthy") return "is-blue";
  if (status === "On track") return "is-blue";
  return "is-orange";
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C${midX.toFixed(1)},${p0.y.toFixed(1)} ${midX.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

function AreaChart({ values, id, dot = false }: { values: number[]; id: string; dot?: boolean }) {
  const W = 320;
  const H = 96;
  const padTop = 10;
  const padBottom = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * W,
    y: padTop + (1 - (value - min) / range) * (H - padTop - padBottom),
  }));
  const line = smoothPath(points);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = points[points.length - 1];
  return (
    <svg className="exec-area" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#fill-${id})`} />
      <path d={line} className="exec-area-line" />
      {dot ? <circle cx={last.x} cy={last.y} r="4" className="exec-area-dot" /> : null}
    </svg>
  );
}

function DeltaPill({ value, label }: { value: number; label?: string }) {
  const up = value >= 0;
  return (
    <span className={up ? "exec-delta-pill is-up" : "exec-delta-pill is-down"}>
      <ArrowUp aria-hidden="true" />
      {Math.abs(value)}%{label ? ` ${label}` : ""}
    </span>
  );
}

function ProjectRow({ project }: { project: ExecProject }) {
  const status = projectStatus(project);
  const cls = statusClass(status);
  const meta = PROJECT_ICON[project.id] ?? { icon: FolderClosed, color: "#5b6470" };
  const Icon = meta.icon;
  return (
    <div className="exec-prow">
      <span className="exec-prow-icon" style={{ background: `${meta.color}1f`, color: meta.color }}>
        <Icon aria-hidden="true" />
      </span>
      <div className="exec-prow-name">
        <strong>{project.name}</strong>
        <span>{project.org}</span>
      </div>
      <span className={`exec-pill ${cls}`}>{status}</span>
      <b className="exec-prow-pct">{project.healthScore}%</b>
      <span className="exec-prow-bar">
        <span className={cls} style={{ width: `${project.healthScore}%` }} />
      </span>
      <div className="exec-prow-act">
        <strong>{projectActivity(project)}</strong>
        <span>activities</span>
      </div>
      <span className="exec-prow-time">{project.lastUpdated}</span>
    </div>
  );
}

function RankRow({ project, rank, max }: { project: ExecProject; rank: number; max: number }) {
  const activity = projectActivity(project);
  const top = rank === 1;
  return (
    <div className={top ? "exec-rank is-top" : "exec-rank"}>
      <span className={`exec-rank-badge rank-${rank}`}>{rank}</span>
      <div className="exec-rank-body">
        <div className="exec-rank-top">
          <strong>{project.name}</strong>
          <span className="exec-rank-count">{activity} activities</span>
        </div>
        <span className="exec-rank-track">
          <span className={top ? "is-orange" : "is-blue"} style={{ width: `${Math.round((activity / max) * 100)}%` }} />
        </span>
      </div>
      {project.activityDeltaPct > 0 ? (
        <span className="exec-rank-delta">
          <ArrowUp aria-hidden="true" />
          {project.activityDeltaPct}%
        </span>
      ) : (
        <span className="exec-rank-delta is-flat">—</span>
      )}
    </div>
  );
}

export function ExecutiveDashboard({
  onExit,
  theme = "light",
  onToggleTheme,
}: {
  onExit: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}) {
  const projects = executiveProjects;
  const kpis = portfolioKpis(projects);
  const attention = attentionSummary(projects);
  const cert = certBreakdown(projects);
  const healthDelta = portfolioHealthDelta(projects);
  const activityDelta = portfolioActivityDelta(projects);
  const trend = portfolioTrend(projects);
  const milestonesWeek = milestonesThisWeekTotal(projects);
  const ranked = byActivity(projects);
  const mostActive = ranked[0];
  const maxActivity = projectActivity(mostActive);
  const overview = [...projects].sort((a, b) => b.healthScore - a.healthScore);

  return (
    <div className="exec-shell">
      <aside className="side-rail" aria-label="Primary navigation">
        <button className="brand-mark" type="button" aria-label="Back to projects" title="Back to projects" onClick={onExit}>
          <Boxes aria-hidden="true" />
        </button>
        <nav className="rail-nav">
          <button className="rail-button is-exec-active" type="button" aria-label="Executive dashboard" title="Executive">
            <LayoutDashboard aria-hidden="true" />
          </button>
          <button className="rail-button" type="button" aria-label="Projects" title="Projects" onClick={onExit}>
            <Folder aria-hidden="true" />
          </button>
          <button className="rail-button" type="button" aria-label="Certifications" title="Certifications">
            <CircleCheck aria-hidden="true" />
          </button>
          <button className="rail-button" type="button" aria-label="Reports" title="Reports">
            <BarChart3 aria-hidden="true" />
          </button>
          <button className="rail-button" type="button" aria-label="Calendar" title="Calendar">
            <Calendar aria-hidden="true" />
          </button>
          <button className="rail-button" type="button" aria-label="Settings" title="Settings">
            <Settings aria-hidden="true" />
          </button>
        </nav>
        <div className="rail-footer">
          <button className="rail-button" type="button" aria-label="Help" title="Help">
            <CircleHelp aria-hidden="true" />
          </button>
          <button className="rail-button" type="button" aria-label="Back to projects" title="Back to projects" onClick={onExit}>
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="exec-main">
        <header className="exec-header">
          <div>
            <span className="exec-eyebrow">Portfolio · Executive Summary</span>
            <h1>
              {timeGreeting()}, {EXEC_NAME} <span aria-hidden="true">👋</span>
            </h1>
            <p>Here's what's happening with your portfolio today.</p>
          </div>
          <div className="exec-header-right">
            <label className="exec-range">
              <select defaultValue="week" aria-label="Time range">
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </label>
            <button
              className="exec-avatar"
              type="button"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title="Toggle theme"
              onClick={onToggleTheme}
            >
              <img src={EXEC_PHOTO} alt={EXEC_NAME} />
              <span className="exec-avatar-dot" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="exec-hero">
          <div className="exec-hero-left">
            <div className="exec-hero-title">
              <Heart aria-hidden="true" />
              <span>Portfolio Health</span>
            </div>
            <div className="exec-hero-score">{kpis.avgHealth}%</div>
            <div className="exec-hero-delta">
              <ArrowUp aria-hidden="true" />
              {healthDelta}% improvement vs last week
            </div>
            <span className="exec-hero-progress">
              <span style={{ width: `${kpis.avgHealth}%` }} />
            </span>
            <div className="exec-hero-chart">
              <AreaChart values={trend} id="hero" dot />
              <span className="exec-hero-badge">Great momentum! 🚀</span>
            </div>
          </div>
          <div className="exec-hero-stats">
            <HeroStat icon={Folder} color="var(--blue)" value={kpis.active} label="Active Projects" />
            <HeroStat icon={FileText} color="var(--blue)" value={kpis.activity} label="Updates This Week" />
            <HeroStat icon={Trophy} color="#f97316" value={milestonesWeek} label="Milestones Completed" />
            <HeroStat icon={CircleAlert} color="#f97316" value={attention.count} label="Need Attention" />
          </div>
        </section>

        {/* Momentum / Biggest Win / Focus */}
        <section className="exec-trio">
          <div className="exec-card exec-momentum">
            <div className="exec-card-kicker">
              <Rocket aria-hidden="true" /> Momentum
            </div>
            <strong className="exec-big">{kpis.activity}</strong>
            <span className="exec-sub">Activity this week</span>
            <div className="exec-momentum-chart">
              <AreaChart values={trend} id="mom" dot />
            </div>
            <DeltaPill value={activityDelta} label="vs last week" />
          </div>

          <div className="exec-card exec-win">
            <div className="exec-card-kicker">
              <Trophy aria-hidden="true" /> Biggest Win
            </div>
            <div className="exec-win-body">
              <div>
                <strong className="exec-win-name">{mostActive.name}</strong>
                <span className="exec-sub">{projectActivity(mostActive)} updates</span>
                <span className="exec-pill is-blue exec-win-pill">Most active project</span>
              </div>
              <span className="exec-win-flame">
                <Flame aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="exec-card exec-focus">
            <div className="exec-card-kicker">
              <Zap aria-hidden="true" /> Focus
            </div>
            <div className="exec-focus-body">
              <div>
                <strong className="exec-big">{attention.count}</strong>
                <span className="exec-sub">Projects need attention</span>
                <button className="exec-review" type="button">
                  Review now <ArrowRight aria-hidden="true" />
                </button>
              </div>
              <span className="exec-focus-rings" aria-hidden="true">
                <CircleAlert />
              </span>
            </div>
          </div>
        </section>

        {/* Projects Overview + Most Active */}
        <section className="exec-lists">
          <div className="exec-card exec-overview">
            <div className="exec-card-head">
              <div className="exec-card-kicker">
                <FolderClosed aria-hidden="true" /> Projects Overview
              </div>
              <button className="exec-link" type="button">
                View all projects <ArrowRight aria-hidden="true" />
              </button>
            </div>
            <div className="exec-prows">
              {overview.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </div>
          </div>

          <div className="exec-card exec-active">
            <div className="exec-card-head">
              <div className="exec-card-kicker">Most Active This Week</div>
              <button className="exec-link" type="button">
                See all <ArrowRight aria-hidden="true" />
              </button>
            </div>
            <div className="exec-ranks">
              {ranked.map((project, index) => (
                <RankRow key={project.id} project={project} rank={index + 1} max={maxActivity} />
              ))}
            </div>
          </div>
        </section>

        {/* Footer: encouragement + certifications */}
        <section className="exec-footer-row">
          <div className="exec-encourage">
            <span className="exec-encourage-text">
              <Sparkles aria-hidden="true" />
              {healthDelta >= 0
                ? `You're on a roll! Portfolio health improved +${healthDelta}% this week.`
                : `Portfolio health dipped ${healthDelta}% this week — worth a look.`}
            </span>
            <span className="exec-encourage-cta">Keep up the great work! 💙</span>
          </div>
          <button className="exec-card exec-certs" type="button">
            <span className={cert.lapsed > 0 ? "exec-certs-icon is-warn" : "exec-certs-icon"}>
              {cert.lapsed > 0 ? <CircleAlert aria-hidden="true" /> : <Rocket aria-hidden="true" />}
            </span>
            <div className="exec-certs-text">
              <strong>
                {cert.lapsed > 0
                  ? `${cert.lapsed} certification${cert.lapsed === 1 ? "" : "s"} lapsed`
                  : "No overdue certifications"}
              </strong>
              <span>
                {cert.lapsed > 0
                  ? `Needs renewal${cert.expiring > 0 ? ` · ${cert.expiring} expiring soon` : ""}`
                  : "Everything is up to date 🎉"}
              </span>
            </div>
            <ArrowRight aria-hidden="true" />
          </button>
        </section>
      </main>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: LucideIcon;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="exec-hstat">
      <Icon aria-hidden="true" style={{ color }} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
