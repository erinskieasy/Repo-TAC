import { Trophy } from "lucide-react";
import type { MilestoneItem, ReportEntry, TeamMember } from "./types";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Ranks team members by an activity score derived from live dashboard data:
// owned/done milestone tasks, milestones owned, and reports filed.
export function TeamLeaderboard({
  members,
  milestones,
  reports,
}: {
  members: TeamMember[];
  milestones: MilestoneItem[];
  reports: ReportEntry[];
}) {
  const allTasks = milestones.flatMap((milestone) => milestone.tasks);

  const stats = members
    .map((member) => {
      const owned = allTasks.filter((task) => task.owner === member.name);
      const done = owned.filter((task) => task.status === "Done").length;
      const milestonesOwned = milestones.filter((milestone) => milestone.owner === member.name).length;
      const reportsFiled = reports.filter((report) => report.reporterName === member.name).length;
      const score = done * 3 + (owned.length - done) + milestonesOwned * 2 + reportsFiled * 2;
      return { member, ownedCount: owned.length, done, reportsFiled, score };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <section className="leaderboard-card" aria-labelledby="leaderboard-title">
      <div className="leaderboard-head">
        <div className="card-kicker" id="leaderboard-title">
          Most Active
        </div>
        <span className="leaderboard-week">
          <Trophy aria-hidden="true" />
          This week
        </span>
      </div>
      <ol className="lb-cards">
        {stats.map((stat, index) => {
          const parts = stat.member.name.split(" ").filter(Boolean);
          const first = parts[0];
          const last = (parts.slice(1).join(" ") || parts[0]).toUpperCase();
          return (
            <li className="lb-card" key={stat.member.id}>
              <div className="lb-card-top">
                <span className="lb-number">{stat.score}</span>
                <span className="lb-slope" aria-hidden="true" />
                <div className="lb-banner">
                  <span className="lb-name" title={stat.member.name}>
                    <span className="lb-first">{first} </span>
                    <strong className="lb-last">{last}</strong>
                  </span>
                </div>
              </div>
              <div className={`lb-photo is-${index}`}>
                <span className="lb-photo-initials" aria-hidden="true">
                  {initials(stat.member.name)}
                </span>
                {stat.member.photo ? (
                  <img className="lb-photo-img" src={stat.member.photo} alt={stat.member.name} loading="lazy" />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
