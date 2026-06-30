import { CalendarClock, Square } from "lucide-react";
import type { MilestoneItem } from "./types";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Parse a "Jun 5" / "June 5" style due date into a timestamp (assumes the current year).
function parseDue(value: string, now: number): number | null {
  const match = /^([A-Za-z]{3,})\s+(\d{1,2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  if (month === undefined) {
    return null;
  }
  return new Date(new Date(now).getFullYear(), month, Number(match[2])).getTime();
}

// A to-do list that auto-populates from open milestone tasks that have a due date,
// soonest first, with overdue/today highlighting. Checking an item completes the task.
export function TodoList({
  milestones,
  onCompleteTask,
}: {
  milestones: MilestoneItem[];
  onCompleteTask: (milestoneId: string, taskId: string) => void;
}) {
  const now = Date.now();
  const today = startOfDay(now);

  const items = milestones
    .flatMap((milestone) =>
      milestone.tasks
        .filter((task) => task.status !== "Done")
        .map((task) => ({ milestoneId: milestone.id, task, due: parseDue(task.dueDate, now) })),
    )
    .filter((item): item is { milestoneId: string; task: MilestoneItem["tasks"][number]; due: number } =>
      item.due !== null,
    )
    .sort((a, b) => a.due - b.due)
    .slice(0, 6);

  return (
    <section className="todo-card" aria-labelledby="todo-title">
      <div className="todo-head">
        <div className="card-kicker" id="todo-title">
          To-do · Up next
        </div>
        <CalendarClock aria-hidden="true" />
      </div>
      {items.length === 0 ? (
        <p className="todo-empty">No dated tasks yet — add due dates in Milestones and they'll show here.</p>
      ) : (
        <ul className="todo-list">
          {items.map((item) => {
            const overdue = item.due < today;
            const isToday = item.due === today;
            const tone = overdue ? "is-overdue" : isToday ? "is-today" : "";
            return (
              <li className="todo-row" key={item.task.id}>
                <button
                  className="todo-check"
                  type="button"
                  aria-label={`Mark "${item.task.title}" done`}
                  title="Mark done"
                  onClick={() => onCompleteTask(item.milestoneId, item.task.id)}
                >
                  <Square aria-hidden="true" />
                </button>
                <span className="todo-title-text" title={item.task.title}>
                  {item.task.title}
                </span>
                <span className={`todo-due ${tone}`}>{item.task.dueDate}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
