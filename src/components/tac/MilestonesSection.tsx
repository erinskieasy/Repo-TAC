import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  MilestoneItem,
  MilestoneStatus,
  MilestoneTask,
  MilestonesSectionData,
  TaskPriority,
  TaskStatus,
} from "./types";

type MilestonesSectionProps = {
  data: MilestonesSectionData;
};

type EditTarget =
  | { kind: "milestone"; milestoneId: string }
  | { kind: "task"; milestoneId: string; taskId: string }
  | null;

type CellEditor =
  | { kind: "milestoneAssignees"; milestoneId: string }
  | { kind: "taskAssignees"; milestoneId: string; taskId: string }
  | { kind: "milestoneDate"; milestoneId: string }
  | { kind: "taskDate"; milestoneId: string; taskId: string }
  | { kind: "milestoneStatus"; milestoneId: string }
  | { kind: "taskStatus"; milestoneId: string; taskId: string }
  | null;

type StaffMember = {
  id: string;
  name: string;
  avatar: "person";
};

const staffMembers: StaffMember[] = [
  { id: "tiffany", name: "Tiffany Tomblin", avatar: "person" },
  { id: "erinski", name: "Erinski Easy", avatar: "person" },
  { id: "mikale", name: "Mikale Meetoo", avatar: "person" },
];

const milestoneStatuses: MilestoneStatus[] = ["Completed", "In progress", "Not started"];
const taskStatuses: TaskStatus[] = ["To do", "In progress", "Done"];

const statusClass: Record<MilestoneStatus, string> = {
  Completed: "completed",
  "In progress": "progress",
  "Not started": "idle",
};

const priorityClass: Record<TaskPriority, string> = {
  Low: "low",
  Medium: "medium",
  High: "high",
};

const taskStatusClass: Record<TaskStatus, string> = {
  "To do": "todo",
  "In progress": "progress",
  Done: "done",
};

const monthIndex: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

const monthNames = Object.keys(monthIndex);

function assigneeIdsFromOwner(owner: string) {
  if (owner === "Unassigned") {
    return [];
  }

  const normalized = owner.toLowerCase();
  const matched = staffMembers.find((member) => {
    const [firstName] = member.name.toLowerCase().split(" ");
    return normalized.includes(firstName);
  });

  if (!matched) {
    return [];
  }

  const plusMatch = owner.match(/\+(\d+)/);
  if (!plusMatch) {
    return [matched.id];
  }

  return staffMembers.slice(0, Math.min(staffMembers.length, Number(plusMatch[1]) + 1)).map((member) => member.id);
}

function ownerFromAssigneeIds(ids: string[]) {
  if (ids.length === 0) {
    return {
      owner: "Unassigned",
      ownerAvatar: "unknown" as const,
    };
  }

  const selected = staffMembers.filter((member) => ids.includes(member.id));
  if (selected.length === 1) {
    return {
      owner: selected[0].name,
      ownerAvatar: selected[0].avatar,
    };
  }

  return {
    owner: `${selected[0].name} +${selected.length - 1}`,
    ownerAvatar: "team" as const,
  };
}

function toInputDate(value: string) {
  const [month, day] = value.split(" ");
  if (!monthIndex[month] || !day) {
    return "2026-06-25";
  }

  return `2026-${monthIndex[month]}-${day.padStart(2, "0")}`;
}

function fromInputDate(value: string) {
  const [, month, day] = value.split("-");
  const monthName = monthNames.find((name) => monthIndex[name] === month) ?? "Jun";
  return `${monthName} ${Number(day)}`;
}

export function MilestonesSection({ data }: MilestonesSectionProps) {
  const [milestones, setMilestones] = useState(data.items);
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(data.items.filter((item) => item.defaultExpanded).map((item) => item.id)),
  );
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [editDraft, setEditDraft] = useState("");
  const [cellEditor, setCellEditor] = useState<CellEditor>(null);

  useEffect(() => {
    if (!cellEditor) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-cell-editor-root]")) {
        return;
      }

      setCellEditor(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCellEditor(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cellEditor]);

  const milestoneCount = milestones.length || data.count;
  const allExpanded = useMemo(
    () => milestones.length > 0 && milestones.every((milestone) => expandedIds.has(milestone.id)),
    [expandedIds, milestones],
  );

  function toggleMilestone(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setExpandedIds((current) => {
      if (milestones.every((milestone) => current.has(milestone.id))) {
        return new Set();
      }
      return new Set(milestones.map((milestone) => milestone.id));
    });
  }

  function addTask(milestoneId: string) {
    setMilestones((current) =>
      current.map((milestone) => {
        if (milestone.id !== milestoneId) {
          return milestone;
        }

        const taskNumber = milestone.tasks.length + 1;
        const task: MilestoneTask = {
          id: `${milestone.id}-new-${taskNumber}`,
          title: `New task ${taskNumber}`,
          type: "Feature",
          priority: "Medium",
          status: "To do",
          owner: "Unassigned",
          ownerAvatar: "unknown",
          dueDate: "TBD",
        };

        return {
          ...milestone,
          tasks: [...milestone.tasks, task],
        };
      }),
    );

    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(milestoneId);
      return next;
    });
  }

  function addMilestone() {
    const nextNumber = milestones.length + 1;
    const id = `new-milestone-${nextNumber}`;
    const milestone: MilestoneItem = {
      id,
      title: `New milestone ${nextNumber}`,
      status: "Not started",
      progressPercent: 0,
      progressLabel: "0% - 0/0",
      owner: "Unassigned",
      ownerAvatar: "unknown",
      dueDate: "TBD",
      description: "Add a clear gate description for this milestone.",
      tasks: [],
    };

    setMilestones((current) => [...current, milestone]);
    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  function beginMilestoneEdit(milestone: MilestoneItem) {
    setEditTarget({ kind: "milestone", milestoneId: milestone.id });
    setEditDraft(milestone.title);
  }

  function beginTaskEdit(milestoneId: string, task: MilestoneTask) {
    setEditTarget({ kind: "task", milestoneId, taskId: task.id });
    setEditDraft(task.title);
  }

  function cancelEdit() {
    setEditTarget(null);
    setEditDraft("");
  }

  function saveEdit() {
    if (!editTarget) {
      return;
    }

    const nextTitle = editDraft.trim();
    if (!nextTitle) {
      cancelEdit();
      return;
    }

    setMilestones((current) =>
      current.map((milestone) => {
        if (editTarget.kind === "milestone") {
          return milestone.id === editTarget.milestoneId
            ? {
                ...milestone,
                title: nextTitle,
              }
            : milestone;
        }

        if (milestone.id !== editTarget.milestoneId) {
          return milestone;
        }

        return {
          ...milestone,
          tasks: milestone.tasks.map((task) =>
            task.id === editTarget.taskId
              ? {
                  ...task,
                  title: nextTitle,
                }
              : task,
          ),
        };
      }),
    );

    cancelEdit();
  }

  function closeCellEditor() {
    setCellEditor(null);
  }

  function updateMilestoneStatus(milestoneId: string, status: MilestoneStatus) {
    setMilestones((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              status,
            }
          : milestone,
      ),
    );
    closeCellEditor();
  }

  function updateTaskStatus(milestoneId: string, taskId: string, status: TaskStatus) {
    setMilestones((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              tasks: milestone.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      status,
                    }
                  : task,
              ),
            }
          : milestone,
      ),
    );
    closeCellEditor();
  }

  function updateMilestoneDate(milestoneId: string, dueDate: string) {
    setMilestones((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              dueDate,
            }
          : milestone,
      ),
    );
    closeCellEditor();
  }

  function updateTaskDate(milestoneId: string, taskId: string, dueDate: string) {
    setMilestones((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              tasks: milestone.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      dueDate,
                    }
                  : task,
              ),
            }
          : milestone,
      ),
    );
    closeCellEditor();
  }

  function updateMilestoneAssignees(milestoneId: string, assigneeIds: string[]) {
    const owner = ownerFromAssigneeIds(assigneeIds);
    setMilestones((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              ...owner,
            }
          : milestone,
      ),
    );
  }

  function updateTaskAssignees(milestoneId: string, taskId: string, assigneeIds: string[]) {
    const owner = ownerFromAssigneeIds(assigneeIds);
    setMilestones((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              tasks: milestone.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      ...owner,
                    }
                  : task,
              ),
            }
          : milestone,
      ),
    );
  }

  function deleteMilestone(milestoneId: string) {
    setMilestones((current) => current.filter((milestone) => milestone.id !== milestoneId));
    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(milestoneId);
      return next;
    });

    if (editTarget?.kind === "milestone" && editTarget.milestoneId === milestoneId) {
      cancelEdit();
    }
  }

  function deleteTask(milestoneId: string, taskId: string) {
    setMilestones((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId
          ? {
              ...milestone,
              tasks: milestone.tasks.filter((task) => task.id !== taskId),
            }
          : milestone,
      ),
    );

    if (
      editTarget?.kind === "task" &&
      editTarget.milestoneId === milestoneId &&
      editTarget.taskId === taskId
    ) {
      cancelEdit();
    }
  }

  function toggleTask(milestoneId: string, taskId: string) {
    setMilestones((current) =>
      current.map((milestone) => {
        if (milestone.id !== milestoneId) {
          return milestone;
        }

        return {
          ...milestone,
          tasks: milestone.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: task.status === "Done" ? "To do" : "Done",
                }
              : task,
          ),
        };
      }),
    );
  }

  return (
    <section className="milestones-page" aria-labelledby="milestones-title">
      <div className="milestones-heading-row">
        <div className="milestones-title-wrap">
          <h1 id="milestones-title">Milestones</h1>
          <span>{milestoneCount} milestones</span>
        </div>
        <button className="milestone-primary-action" type="button" onClick={addMilestone}>
          <Plus aria-hidden="true" />
          <span>Add milestone</span>
        </button>
      </div>

      <div className="milestone-toolbar">
        <label className="milestone-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search milestones or tasks</span>
          <input placeholder="Search milestones or tasks" />
        </label>

        <div className="milestone-filters">
          <button className="milestone-filter-button" type="button" onClick={toggleAll}>
            {allExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            <span>{allExpanded ? "Collapse all" : "Expand all"}</span>
          </button>
          <FilterPill label="Status" value="All" />
          <FilterPill label="Team" value="All members" />
          <FilterPill label="View" value="List" />
          <FilterPill label="Sort" value="Due date" />
        </div>
      </div>

      <div className="milestone-list">
        {milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            expanded={expandedIds.has(milestone.id)}
            activeCellEditor={cellEditor}
            onCellEditorChange={setCellEditor}
            onCloseCellEditor={closeCellEditor}
            onAddTask={addTask}
            onBeginMilestoneEdit={beginMilestoneEdit}
            onBeginTaskEdit={beginTaskEdit}
            onDeleteMilestone={deleteMilestone}
            onDeleteTask={deleteTask}
            onEditCancel={cancelEdit}
            onEditDraftChange={setEditDraft}
            onEditSave={saveEdit}
            onUpdateMilestoneAssignees={updateMilestoneAssignees}
            onUpdateMilestoneDate={updateMilestoneDate}
            onUpdateMilestoneStatus={updateMilestoneStatus}
            onUpdateTaskAssignees={updateTaskAssignees}
            onUpdateTaskDate={updateTaskDate}
            onUpdateTaskStatus={updateTaskStatus}
            onToggle={toggleMilestone}
            onToggleTask={toggleTask}
            editDraft={editDraft}
            editTarget={editTarget}
          />
        ))}

        <button className="empty-milestone-card" type="button" onClick={addMilestone}>
          <Plus aria-hidden="true" />
          <span>Add milestone</span>
        </button>
      </div>
    </section>
  );
}

function FilterPill({ label, value }: { label: string; value: string }) {
  return (
    <button className="milestone-filter-button" type="button">
      <span className="filter-label">{label}</span>
      <span>{value}</span>
      <ChevronDown aria-hidden="true" />
    </button>
  );
}

function MilestoneCard({
  milestone,
  expanded,
  activeCellEditor,
  onCellEditorChange,
  onCloseCellEditor,
  onAddTask,
  onBeginMilestoneEdit,
  onBeginTaskEdit,
  onDeleteMilestone,
  onDeleteTask,
  onEditCancel,
  onEditDraftChange,
  onEditSave,
  onUpdateMilestoneAssignees,
  onUpdateMilestoneDate,
  onUpdateMilestoneStatus,
  onUpdateTaskAssignees,
  onUpdateTaskDate,
  onUpdateTaskStatus,
  onToggle,
  onToggleTask,
  editDraft,
  editTarget,
}: {
  milestone: MilestoneItem;
  expanded: boolean;
  activeCellEditor: CellEditor;
  onCellEditorChange: (editor: CellEditor) => void;
  onCloseCellEditor: () => void;
  onAddTask: (milestoneId: string) => void;
  onBeginMilestoneEdit: (milestone: MilestoneItem) => void;
  onBeginTaskEdit: (milestoneId: string, task: MilestoneTask) => void;
  onDeleteMilestone: (milestoneId: string) => void;
  onDeleteTask: (milestoneId: string, taskId: string) => void;
  onEditCancel: () => void;
  onEditDraftChange: (value: string) => void;
  onEditSave: () => void;
  onUpdateMilestoneAssignees: (milestoneId: string, assigneeIds: string[]) => void;
  onUpdateMilestoneDate: (milestoneId: string, dueDate: string) => void;
  onUpdateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void;
  onUpdateTaskAssignees: (milestoneId: string, taskId: string, assigneeIds: string[]) => void;
  onUpdateTaskDate: (milestoneId: string, taskId: string, dueDate: string) => void;
  onUpdateTaskStatus: (milestoneId: string, taskId: string, status: TaskStatus) => void;
  onToggle: (milestoneId: string) => void;
  onToggleTask: (milestoneId: string, taskId: string) => void;
  editDraft: string;
  editTarget: EditTarget;
}) {
  const isEditingMilestone =
    editTarget?.kind === "milestone" && editTarget.milestoneId === milestone.id;

  return (
    <article className={expanded ? "milestone-card is-expanded" : "milestone-card"}>
      <span className={`milestone-node node-${statusClass[milestone.status]}`} aria-hidden="true" />
      <div
        className="milestone-card-header"
        role="button"
        tabIndex={0}
        onClick={() => onToggle(milestone.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle(milestone.id);
          }
        }}
      >
        <div
          className="editable-cell status-edit-cell"
          data-cell-editor-root
          onClick={(event) => {
            event.stopPropagation();
            onCellEditorChange({ kind: "milestoneStatus", milestoneId: milestone.id });
          }}
        >
          <StatusPill status={milestone.status} />
          {activeCellEditor?.kind === "milestoneStatus" &&
          activeCellEditor.milestoneId === milestone.id ? (
            <StatusMenu
              statuses={milestoneStatuses}
              value={milestone.status}
              onClose={onCloseCellEditor}
              onSelect={(status) => onUpdateMilestoneStatus(milestone.id, status as MilestoneStatus)}
            />
          ) : null}
        </div>
        <div className="milestone-title-cell">
          {isEditingMilestone ? (
            <InlineTitleInput
              value={editDraft}
              onCancel={onEditCancel}
              onChange={onEditDraftChange}
              onSave={onEditSave}
            />
          ) : (
            <>
              <h2>{milestone.title}</h2>
              <button
                className="row-icon-button title-edit-button"
                type="button"
                aria-label="Edit milestone title"
                title="Edit milestone"
                onClick={(event) => {
                  event.stopPropagation();
                  onBeginMilestoneEdit(milestone);
                }}
              >
                <Pencil aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <ProgressMeter value={milestone.progressPercent} label={milestone.progressLabel} />
        <div
          className="editable-cell owner-edit-cell"
          data-cell-editor-root
          onClick={(event) => {
            event.stopPropagation();
            onCellEditorChange({ kind: "milestoneAssignees", milestoneId: milestone.id });
          }}
        >
          <OwnerLabel avatar={milestone.ownerAvatar} name={milestone.owner} />
          {activeCellEditor?.kind === "milestoneAssignees" &&
          activeCellEditor.milestoneId === milestone.id ? (
            <AssigneeMenu
              selectedIds={assigneeIdsFromOwner(milestone.owner)}
              onChange={(ids) => onUpdateMilestoneAssignees(milestone.id, ids)}
              onClose={onCloseCellEditor}
            />
          ) : null}
        </div>
        <div
          className="editable-cell date-edit-cell"
          data-cell-editor-root
          onClick={(event) => {
            event.stopPropagation();
            onCellEditorChange({ kind: "milestoneDate", milestoneId: milestone.id });
          }}
        >
          <time>{milestone.dueDate}</time>
          {activeCellEditor?.kind === "milestoneDate" &&
          activeCellEditor.milestoneId === milestone.id ? (
            <DateMenu
              value={milestone.dueDate}
              onChange={(dueDate) => onUpdateMilestoneDate(milestone.id, dueDate)}
              onClose={onCloseCellEditor}
            />
          ) : null}
        </div>
        <div className="milestone-detail-actions">
          <button
            className="details-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <span>View details</span>
            <ChevronRight aria-hidden="true" />
          </button>
          {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          <button
            className="row-icon-button delete-row-button"
            type="button"
            aria-label="Delete milestone"
            title="Delete milestone"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteMilestone(milestone.id);
            }}
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="milestone-expanded-body">
          {milestone.description ? (
            <div className="milestone-description">
              <span>Description</span>
              <p>{milestone.description}</p>
            </div>
          ) : null}

          <div className="task-list">
            {milestone.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                milestoneId={milestone.id}
                onBeginTaskEdit={onBeginTaskEdit}
                onDeleteTask={onDeleteTask}
                onEditCancel={onEditCancel}
                onEditDraftChange={onEditDraftChange}
                onEditSave={onEditSave}
                onCellEditorChange={onCellEditorChange}
                onCloseCellEditor={onCloseCellEditor}
                onUpdateTaskAssignees={onUpdateTaskAssignees}
                onUpdateTaskDate={onUpdateTaskDate}
                onUpdateTaskStatus={onUpdateTaskStatus}
                onToggleTask={onToggleTask}
                activeCellEditor={activeCellEditor}
                editDraft={editDraft}
                editTarget={editTarget}
              />
            ))}
          </div>

          <button className="add-task-button" type="button" onClick={() => onAddTask(milestone.id)}>
            <Plus aria-hidden="true" />
            <span>Add task</span>
          </button>
        </div>
      ) : null}
    </article>
  );
}

function StatusPill({ status }: { status: MilestoneStatus }) {
  return (
    <span className={`milestone-status status-${statusClass[status]}`}>
      <span />
      {status}
    </span>
  );
}

function ProgressMeter({ value, label }: { value: number; label: string }) {
  return (
    <div className="milestone-progress" aria-label={`Progress ${label}`}>
      <span>
        <b style={{ width: `${Math.max(value, value > 0 ? 6 : 0)}%` }} />
      </span>
      <strong>{label}</strong>
    </div>
  );
}

function OwnerLabel({
  avatar = "unknown",
  name,
}: {
  avatar?: MilestoneItem["ownerAvatar"];
  name: string;
}) {
  return (
    <div className="owner-label">
      <span className={`owner-avatar avatar-${avatar}`}>{avatar === "unknown" ? "?" : ""}</span>
      <strong>{name}</strong>
    </div>
  );
}

function TaskRow({
  task,
  milestoneId,
  activeCellEditor,
  onCellEditorChange,
  onCloseCellEditor,
  onBeginTaskEdit,
  onDeleteTask,
  onEditCancel,
  onEditDraftChange,
  onEditSave,
  onUpdateTaskAssignees,
  onUpdateTaskDate,
  onUpdateTaskStatus,
  onToggleTask,
  editDraft,
  editTarget,
}: {
  task: MilestoneTask;
  milestoneId: string;
  activeCellEditor: CellEditor;
  onCellEditorChange: (editor: CellEditor) => void;
  onCloseCellEditor: () => void;
  onBeginTaskEdit: (milestoneId: string, task: MilestoneTask) => void;
  onDeleteTask: (milestoneId: string, taskId: string) => void;
  onEditCancel: () => void;
  onEditDraftChange: (value: string) => void;
  onEditSave: () => void;
  onUpdateTaskAssignees: (milestoneId: string, taskId: string, assigneeIds: string[]) => void;
  onUpdateTaskDate: (milestoneId: string, taskId: string, dueDate: string) => void;
  onUpdateTaskStatus: (milestoneId: string, taskId: string, status: TaskStatus) => void;
  onToggleTask: (milestoneId: string, taskId: string) => void;
  editDraft: string;
  editTarget: EditTarget;
}) {
  const isDone = task.status === "Done";
  const isEditingTask =
    editTarget?.kind === "task" && editTarget.milestoneId === milestoneId && editTarget.taskId === task.id;

  return (
    <div className={isDone ? "task-row is-done" : "task-row"}>
      <button
        className="task-check"
        type="button"
        aria-label={isDone ? "Mark task incomplete" : "Mark task complete"}
        onClick={() => onToggleTask(milestoneId, task.id)}
      >
        {isDone ? <Check aria-hidden="true" /> : null}
      </button>
      <div className="task-title-cell">
        {isEditingTask ? (
          <InlineTitleInput
            value={editDraft}
            onCancel={onEditCancel}
            onChange={onEditDraftChange}
            onSave={onEditSave}
          />
        ) : (
          <>
            <span className="task-title">{task.title}</span>
            <button
              className="row-icon-button title-edit-button"
              type="button"
              aria-label="Edit task title"
              title="Edit task"
              onClick={() => onBeginTaskEdit(milestoneId, task)}
            >
              <Pencil aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <span className="task-chip chip-type">{task.type}</span>
      <span className={`task-chip chip-${priorityClass[task.priority]}`}>{task.priority}</span>
      <div
        className="editable-cell task-status-edit-cell"
        data-cell-editor-root
        onClick={() => onCellEditorChange({ kind: "taskStatus", milestoneId, taskId: task.id })}
      >
        <span className={`task-state state-${taskStatusClass[task.status]}`}>{task.status}</span>
        {activeCellEditor?.kind === "taskStatus" &&
        activeCellEditor.milestoneId === milestoneId &&
        activeCellEditor.taskId === task.id ? (
          <StatusMenu
            statuses={taskStatuses}
            value={task.status}
            onClose={onCloseCellEditor}
            onSelect={(status) => onUpdateTaskStatus(milestoneId, task.id, status as TaskStatus)}
          />
        ) : null}
      </div>
      <div
        className="editable-cell owner-edit-cell"
        data-cell-editor-root
        onClick={() => onCellEditorChange({ kind: "taskAssignees", milestoneId, taskId: task.id })}
      >
        <OwnerLabel avatar={task.ownerAvatar} name={task.owner} />
        {activeCellEditor?.kind === "taskAssignees" &&
        activeCellEditor.milestoneId === milestoneId &&
        activeCellEditor.taskId === task.id ? (
          <AssigneeMenu
            selectedIds={assigneeIdsFromOwner(task.owner)}
            onChange={(ids) => onUpdateTaskAssignees(milestoneId, task.id, ids)}
            onClose={onCloseCellEditor}
          />
        ) : null}
      </div>
      <div
        className="editable-cell date-edit-cell"
        data-cell-editor-root
        onClick={() => onCellEditorChange({ kind: "taskDate", milestoneId, taskId: task.id })}
      >
        <time>{task.dueDate}</time>
        {activeCellEditor?.kind === "taskDate" &&
        activeCellEditor.milestoneId === milestoneId &&
        activeCellEditor.taskId === task.id ? (
          <DateMenu
            value={task.dueDate}
            onChange={(dueDate) => onUpdateTaskDate(milestoneId, task.id, dueDate)}
            onClose={onCloseCellEditor}
          />
        ) : null}
      </div>
      <button
        className="row-icon-button delete-row-button"
        type="button"
        aria-label="Delete task"
        title="Delete task"
        onClick={() => onDeleteTask(milestoneId, task.id)}
      >
        <Trash2 aria-hidden="true" />
      </button>
    </div>
  );
}

function StatusMenu({
  statuses,
  value,
  onClose,
  onSelect,
}: {
  statuses: Array<MilestoneStatus | TaskStatus>;
  value: MilestoneStatus | TaskStatus;
  onClose: () => void;
  onSelect: (status: MilestoneStatus | TaskStatus) => void;
}) {
  return (
    <div className="cell-popover status-menu" role="menu" onClick={(event) => event.stopPropagation()}>
      {statuses.map((status) => (
        <button
          key={status}
          className={status === value ? "popover-option is-selected" : "popover-option"}
          type="button"
          onClick={() => onSelect(status)}
        >
          <span className={`status-dot dot-${statusClassForAnyStatus(status)}`} />
          <span>{status}</span>
          {status === value ? <Check aria-hidden="true" /> : null}
        </button>
      ))}
      <button className="popover-close" type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function AssigneeMenu({
  selectedIds,
  onChange,
  onClose,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  function toggleMember(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="cell-popover assignee-menu" role="menu" onClick={(event) => event.stopPropagation()}>
      <div className="popover-title">Assign people</div>
      {staffMembers.map((member) => (
        <label className="assignee-option" key={member.id}>
          <input
            type="checkbox"
            checked={selectedIds.includes(member.id)}
            onChange={() => toggleMember(member.id)}
          />
          <span className="owner-avatar avatar-person" />
          <span>{member.name}</span>
        </label>
      ))}
      <button className="popover-clear" type="button" onClick={() => onChange([])}>
        Clear assignees
      </button>
      <button className="popover-close" type="button" onClick={onClose}>
        Done
      </button>
    </div>
  );
}

function DateMenu({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (dueDate: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });

    try {
      input.showPicker();
    } catch {
      input.focus({ preventScroll: true });
    }
  }, []);

  return (
    <div className="cell-popover date-menu" onClick={(event) => event.stopPropagation()}>
      <div className="popover-title">Due date</div>
      <input
        ref={inputRef}
        type="date"
        defaultValue={toInputDate(value)}
        onChange={(event) => onChange(fromInputDate(event.target.value))}
      />
      <button className="popover-close" type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function statusClassForAnyStatus(status: MilestoneStatus | TaskStatus) {
  if (status === "Completed" || status === "Done") {
    return "completed";
  }

  if (status === "In progress") {
    return "progress";
  }

  return "idle";
}

function InlineTitleInput({
  value,
  onCancel,
  onChange,
  onSave,
}: {
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <input
      className="inline-title-input"
      value={value}
      autoFocus
      onBlur={onSave}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          onSave();
        }
        if (event.key === "Escape") {
          onCancel();
        }
      }}
    />
  );
}
