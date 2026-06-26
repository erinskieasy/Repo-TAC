import {
  ArrowLeft,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Download,
  FilePenLine,
  FileText,
  LogOut,
  MessageSquareText,
  Mic,
  PencilLine,
  Plus,
  Save,
  Search,
  SendHorizontal,
  Sparkles,
  Settings,
  SunMedium,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEvent, KeyboardEvent as ReactKeyboardEvent, SetStateAction } from "react";
import {
  documentFileStamp,
  downloadHtmlAsDoc,
  escapeHtml,
  printHtmlAsPdf,
  wrapHtmlDocument,
} from "./documentExport";
import { MilestonesSection } from "./MilestonesSection";
import { milestoneProjectTabs, projectTabs, sidebarItems, tacDashboardData, teamMembers } from "./tacData";
import type {
  BusinessOutcomeColumn,
  DeliveryMomentumItem,
  MilestoneItem,
  MilestoneTask,
  NavItem,
  OperationalAttentionItem,
  ProjectTab,
  TacDashboardData,
  TaskPriority,
  TaskStatus,
} from "./types";

// A documentation update logged from the chat, kept at the project level so the
// downloadable document always reflects everyone's latest updates.
type ProjectUpdate = {
  id: number;
  loggedAt: string;
  entries: { label: string; text: string }[];
};

type TacDashboardProps = {
  data?: TacDashboardData;
  tabs?: ProjectTab[];
  navItems?: NavItem[];
  view?: "overview" | "milestones";
};

type DashboardView = "overview" | "milestones";

type DocumentationChatMessage = {
  id: number;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
};

type ChatMode = "chat" | "config";

type IntakeQuestionSet = {
  id: number;
  question: string;
  criteria: string;
  example: string;
};

const defaultQuestionSets: IntakeQuestionSet[] = [
  {
    id: 1,
    question: "What project outcome should the documentation update capture?",
    criteria: "Names the target result, owner, current state, and any decision or blocker.",
    example: "The Day 30 adoption gate is in progress; leads need proof that every active project has current evidence.",
  },
];

// The assistant has an identity so the conversation feels like someone, not a form.
const assistantName = "Atlas";
const userFirstName = "Jordan";

// Continuity: what the user said last time, so the opener can pick up the thread.
const lastUpdateSummary = { when: "Tuesday", flagged: "the API migration was blocked" };

type CapturedCategory = "progress" | "blocker" | "risk";

// Warm conversation openers so the user never faces a blank box.
const conversationStarters: { label: string; seed: string }[] = [
  { label: "Report progress", seed: "Since the last update, we've " },
  { label: "Share a blocker", seed: "We're blocked on " },
  { label: "Flag a risk", seed: "A risk I'm watching is " },
];

const capturedLabels: { key: CapturedCategory; label: string }[] = [
  { key: "progress", label: "Progress" },
  { key: "blocker", label: "Blocker" },
  { key: "risk", label: "Risk" },
];

// How each captured category becomes a milestone task when attached.
const categoryToTask: Record<CapturedCategory, { type: string; priority: TaskPriority; status: TaskStatus }> = {
  progress: { type: "Report", priority: "Medium", status: "Done" },
  blocker: { type: "Blocker", priority: "High", status: "In progress" },
  risk: { type: "Risk", priority: "Medium", status: "To do" },
};

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

// Time-aware + picks up last week's thread, so it reads like a colleague who's been paying attention.
function buildOpeningMessage(): string {
  return `${timeGreeting()}, ${userFirstName}. Last ${lastUpdateSummary.when} you flagged that ${lastUpdateSummary.flagged} — did that clear up, or is it still stuck?`;
}

// Lightweight intent read so the "captured" tray can fill in as the user talks.
function detectCategory(text: string): CapturedCategory | null {
  const value = text.toLowerCase();
  if (/(block|stuck|waiting on|held up|can't|cannot|stalled)/.test(value)) return "blocker";
  if (/(risk|concern|worried|might slip|could slip|fragile|exposure|danger)/.test(value)) return "risk";
  if (/(done|shipped|finished|complete|progress|wrapped|launched|made|merged|since the last update|we've|we have)/.test(value)) {
    return "progress";
  }
  return null;
}

// Reflect-back + one gentle follow-up, then a wrap-up. Tone adapts to how much effort the user put in.
function buildAssistantReply(userText: string, userTurnNumber: number): string {
  const words = userText.trim().split(/\s+/);
  const snippet = words.slice(0, 12).join(" ");
  const trimmed = words.length > 12 ? `${snippet}…` : snippet;
  const thorough = words.length > 25 ? "That's thorough — thanks. " : "";

  if (userTurnNumber === 1) {
    const lead = words.length < 4 ? "Quick one — got it. " : "Got it. ";
    return `${lead}So the headline is “${trimmed}”. Anything blocking it, or is it on track?`;
  }
  if (userTurnNumber === 2) {
    return `${thorough}Noted. Want to capture who owns it and a rough date, or skip for now?`;
  }
  return `${thorough}That's a solid check-in. Here's what I pulled together — look right?`;
}

export function TacDashboardPreview() {
  return <TacDashboard />;
}

export function TacDashboard({
  data = tacDashboardData,
  tabs,
  navItems = sidebarItems,
  view = "milestones",
}: TacDashboardProps) {
  const [activeView, setActiveView] = useState<DashboardView>(view);
  const [documentationChatOpen, setDocumentationChatOpen] = useState(false);
  // Single source of truth: milestone edits and logged updates live here so every
  // surface — the milestone report and the header document download — stays in sync.
  const [milestones, setMilestones] = useState<MilestoneItem[]>(data.milestones.items);
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([]);

  // Attach a logged update to a milestone as real tasks (typed by captured category).
  function handleAttachUpdate(
    milestoneId: string,
    items: { category: CapturedCategory; text: string }[],
    ownerName: string,
  ) {
    if (items.length === 0) {
      return;
    }
    const stamp = Date.now();
    setMilestones((current) =>
      current.map((milestone) => {
        if (milestone.id !== milestoneId) {
          return milestone;
        }
        const newTasks: MilestoneTask[] = items.map((item, index) => ({
          id: `${milestone.id}-update-${stamp}-${index}`,
          title: item.text,
          type: categoryToTask[item.category].type,
          priority: categoryToTask[item.category].priority,
          status: categoryToTask[item.category].status,
          owner: ownerName || "Unassigned",
          ownerAvatar: ownerName ? "person" : "unknown",
          dueDate: "TBD",
        }));
        return { ...milestone, tasks: [...milestone.tasks, ...newTasks] };
      }),
    );
  }

  function handleLogUpdate(entries: { label: string; text: string }[]) {
    if (entries.length === 0) {
      return;
    }
    setProjectUpdates((current) => [
      ...current,
      {
        id: Date.now(),
        loggedAt: new Date().toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        entries,
      },
    ]);
  }
  const resolvedTabs = useMemo(() => {
    const baseTabs = tabs ?? (activeView === "milestones" ? milestoneProjectTabs : projectTabs);
    return baseTabs.map((tab) => ({
      ...tab,
      active:
        (activeView === "overview" && tab.label === "Overview") ||
        (activeView === "milestones" && tab.label === "Milestones"),
    }));
  }, [activeView, tabs]);

  useEffect(() => {
    if (!documentationChatOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-documentation-chat-root]")) {
        return;
      }

      setDocumentationChatOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDocumentationChatOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [documentationChatOpen]);

  return (
    <div className="tac-shell">
      <Sidebar items={navItems} />
      <main className="tac-workspace">
        <ProjectHeader data={data} milestones={milestones} projectUpdates={projectUpdates} />
        <ProjectTabs tabs={resolvedTabs} onTabSelect={setActiveView} />
        <section
          className={activeView === "milestones" ? "tac-page tac-page-milestones" : "tac-page"}
          aria-labelledby={activeView === "milestones" ? "milestones-title" : "overview-title"}
        >
          {activeView === "milestones" ? (
            <MilestonesSection data={data.milestones} milestones={milestones} setMilestones={setMilestones} />
          ) : (
            <>
              <div className="overview-heading-row">
                <h1 id="overview-title">{data.pageTitle}</h1>
                <button
                  className="milestone-primary-action overview-doc-action"
                  type="button"
                  data-documentation-chat-root
                  onClick={() => setDocumentationChatOpen((current) => !current)}
                >
                  <FilePenLine aria-hidden="true" />
                  <span>Share a project update</span>
                </button>
              </div>

              <div className="overview-grid">
                <DeliveryHealthCard
                  score={data.healthScore}
                  status={data.healthStatus}
                  dates={data.healthDates}
                />
                <OperationalAttentionCard
                  blockerStatus={data.operational.blockerStatus}
                  items={data.operational.items}
                />
                <DeliveryMomentumCard items={data.momentum} />
              </div>

              <BusinessOutcomePanel
                title={data.businessOutcome.title}
                prompt={data.businessOutcome.prompt}
                columns={data.businessOutcome.columns}
              />

              {documentationChatOpen ? (
                <DocumentationChatWindow
                  milestones={milestones}
                  onClose={() => setDocumentationChatOpen(false)}
                  onLogUpdate={handleLogUpdate}
                  onAttachUpdate={handleAttachUpdate}
                />
              ) : null}
            </>
          )}
        </section>
      </main>
      <button className="assistant-launcher" type="button" aria-label="Open assistant" title="Open assistant">
        <Sparkles aria-hidden="true" />
      </button>
    </div>
  );
}

function DocumentationChatWindow({
  milestones,
  onClose,
  onLogUpdate,
  onAttachUpdate,
}: {
  milestones: MilestoneItem[];
  onClose: () => void;
  onLogUpdate: (entries: { label: string; text: string }[]) => void;
  onAttachUpdate: (
    milestoneId: string,
    items: { category: CapturedCategory; text: string }[],
    ownerName: string,
  ) => void;
}) {
  const [messages, setMessages] = useState<DocumentationChatMessage[]>(() => [
    {
      id: 1,
      text: buildOpeningMessage(),
      sender: "assistant",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("chat");
  const [questionSets, setQuestionSets] = useState<IntakeQuestionSet[]>(defaultQuestionSets);
  const [configSaved, setConfigSaved] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const replyTimeoutRef = useRef<number | null>(null);

  const userMessages = messages.filter((message) => message.sender === "user");
  const userTurnCount = userMessages.length;
  const hasUserReplied = userTurnCount > 0;

  // Watch the documentation build in real time: which categories the user has covered.
  const captured = useMemo(() => {
    const result: Record<CapturedCategory, string | null> = { progress: null, blocker: null, risk: null };
    for (const message of userMessages) {
      const category = detectCategory(message.text);
      if (category && !result[category]) {
        result[category] = message.text;
      }
    }
    return result;
  }, [userMessages]);

  const showSummary = userTurnCount >= 3;
  // Once Atlas asks "who owns it?" (after the 2nd reply), offer the team roster to pick an owner.
  const showOwnerPicker = userTurnCount >= 2 && !isLogged;
  const selectedOwner = teamMembers.find((member) => member.id === selectedOwnerId) ?? null;

  function handleStarter(seed: string) {
    setInputValue(seed);
    requestAnimationFrame(() => {
      const composer = composerRef.current;
      if (composer) {
        composer.focus();
        composer.setSelectionRange(seed.length, seed.length);
      }
    });
  }

  // Voice input (prototype): stopping the recording drops a simulated transcript into the
  // composer so the voice path flows to "User submits" like the other input modes.
  function handleToggleVoice() {
    setIsRecording((current) => {
      const next = !current;
      if (!next) {
        const transcript =
          "Since the last update, we've cleared the API migration blocker and the Day 30 gate is back on track.";
        setInputValue((value) => value.trim() || transcript);
        requestAnimationFrame(() => {
          const composer = composerRef.current;
          composer?.focus();
        });
      }
      return next;
    });
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const dialogNode = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusables() {
      if (!dialogNode) {
        return [] as HTMLElement[];
      }
      return Array.from(dialogNode.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (node) => node.offsetParent !== null,
      );
    }

    // Move focus into the dialog on open.
    (getFocusables()[0] ?? dialogNode)?.focus();

    function handleFocusTrap(event: KeyboardEvent) {
      if (event.key !== "Tab") {
        return;
      }
      const items = getFocusables();
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleFocusTrap);

    // Lock background scroll while the dialog is open.
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleFocusTrap);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current !== null) {
        window.clearTimeout(replyTimeoutRef.current);
      }
    };
  }, []);

  function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage) {
      return;
    }

    const userMessage: DocumentationChatMessage = {
      id: Date.now(),
      text: trimmedMessage,
      sender: "user",
      timestamp: getTimestamp(),
    };

    const turnNumber = userTurnCount + 1;
    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setIsRecording(false);
    sendAssistantReply(buildAssistantReply(trimmedMessage, turnNumber));
  }

  // Show a "thinking" indicator before the reply lands, so the bot feels alive instead of instant/robotic.
  function sendAssistantReply(text: string) {
    if (replyTimeoutRef.current !== null) {
      window.clearTimeout(replyTimeoutRef.current);
    }

    setIsAssistantTyping(true);
    replyTimeoutRef.current = window.setTimeout(() => {
      setIsAssistantTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          text,
          sender: "assistant",
          timestamp: getTimestamp(),
        },
      ]);
    }, 1100);
  }

  // One-tap escape for slow days so the check-in never feels like a forced ceremony.
  function handleAllQuiet() {
    const userMessage: DocumentationChatMessage = {
      id: Date.now(),
      text: "All quiet — no real changes since the last update.",
      sender: "user",
      timestamp: getTimestamp(),
    };
    setMessages((current) => [...current, userMessage]);
    // "All quiet" still logs an update — it records a steady-state check-in.
    onLogUpdate([{ label: "Status", text: "All quiet — no material changes since the last update." }]);
    setIsLogged(true);
    sendAssistantReply("Easy — I logged a steady-state check-in and kept the existing docs as-is. Have a good one.");
  }

  function handleConfirmSummary() {
    const items = capturedLabels
      .filter(({ key }) => captured[key])
      .map(({ key }) => ({ category: key, text: captured[key] as string }));

    const entries = capturedLabels
      .filter(({ key }) => captured[key])
      .map(({ key, label }) => ({ label, text: captured[key] as string }));
    if (selectedOwner) {
      entries.push({ label: "Owner", text: selectedOwner.name });
    }
    onLogUpdate(entries);

    const targetMilestone = milestones.find((milestone) => milestone.id === selectedMilestoneId);
    if (targetMilestone) {
      onAttachUpdate(targetMilestone.id, items, selectedOwner?.name ?? "");
    }

    setIsLogged(true);
    sendAssistantReply(
      targetMilestone
        ? `Logged — and I added ${items.length} item${items.length === 1 ? "" : "s"} to “${targetMilestone.title}”. Thanks for keeping it current.`
        : "Logged. The Overview reflects this now — thanks for keeping it current.",
    );
  }

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function addQuestionSet() {
    setQuestionSets((current) => [
      ...current,
      {
        id: Date.now(),
        question: "",
        criteria: "",
        example: "",
      },
    ]);
    setConfigSaved(false);
  }

  function updateQuestionSet(
    questionSetId: number,
    field: keyof Omit<IntakeQuestionSet, "id">,
    value: string,
  ) {
    setQuestionSets((current) =>
      current.map((questionSet) =>
        questionSet.id === questionSetId
          ? {
              ...questionSet,
              [field]: value,
            }
          : questionSet,
      ),
    );
    setConfigSaved(false);
  }

  function deleteQuestionSet(questionSetId: number) {
    setQuestionSets((current) => current.filter((questionSet) => questionSet.id !== questionSetId));
    setConfigSaved(false);
  }

  function saveConfiguration() {
    setConfigSaved(true);
    setChatMode("chat");
  }

  return (
    <div className="documentation-chat-layer" role="presentation">
      <button
        className="documentation-chat-backdrop"
        type="button"
        tabIndex={-1}
        aria-label="Close documentation chat"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className="documentation-chat"
        role="dialog"
        aria-modal="true"
        aria-label="Project documentation chat"
        tabIndex={-1}
        data-documentation-chat-root
      >
        <header className="documentation-chat-header">
          <div>
            <span>{chatMode === "config" ? "Intake configuration" : "Project documentation"}</span>
            <strong>{chatMode === "config" ? "Reusable question sets" : "Update me on the project"}</strong>
          </div>
          <div className="documentation-chat-header-actions">
            <button
              className={chatMode === "config" ? "is-active" : ""}
              type="button"
              aria-label={chatMode === "config" ? "Back to documentation chat" : "Open intake configuration"}
              title={chatMode === "config" ? "Back to chat" : "Configure"}
              onClick={() => setChatMode((current) => (current === "chat" ? "config" : "chat"))}
            >
              {chatMode === "config" ? (
                <MessageSquareText aria-hidden="true" />
              ) : (
                <Settings aria-hidden="true" />
              )}
            </button>
            <button type="button" aria-label="Close documentation chat" title="Close" onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={chatMode === "config" ? "documentation-chat-body is-config" : "documentation-chat-body"}>
          {chatMode === "config" ? (
            <DocumentationConfigPanel
              questionSets={questionSets}
              onAddQuestionSet={addQuestionSet}
              onDeleteQuestionSet={deleteQuestionSet}
              onUpdateQuestionSet={updateQuestionSet}
            />
          ) : messages.length === 0 ? (
            <div className="documentation-chat-empty">
              <h2>Tell Me About The Project</h2>
            </div>
          ) : (
            <div className="documentation-chat-stream">
              <div className="documentation-context-bubble">
                <span>
                  <MessageSquareText aria-hidden="true" />
                </span>
                <strong>{assistantName} · keeping your project docs current</strong>
              </div>

              <div className="documentation-chat-day-divider">
                <span />
                <strong>Today</strong>
                <span />
              </div>

              {messages.map((message) => (
                <div
                  className={
                    message.sender === "user"
                      ? "documentation-message-row is-user"
                      : "documentation-message-row is-assistant"
                  }
                  key={message.id}
                >
                  {message.sender === "assistant" ? (
                    <span className="documentation-message-author">{assistantName}</span>
                  ) : null}
                  <div className="documentation-message-bubble">
                    <p>{message.text}</p>
                  </div>
                  <time>{message.timestamp}</time>
                </div>
              ))}

              {isAssistantTyping ? (
                <div className="documentation-message-row is-assistant" aria-live="polite">
                  <span className="documentation-message-author">{assistantName}</span>
                  <div className="documentation-message-bubble documentation-typing" aria-label={`${assistantName} is typing`}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : null}

              {showSummary && !isAssistantTyping ? (
                <div className={isLogged ? "documentation-summary-card is-logged" : "documentation-summary-card"}>
                  {isLogged ? (
                    <div className="documentation-summary-done">
                      <span className="documentation-summary-check">
                        <Check aria-hidden="true" />
                      </span>
                      <strong>Update logged</strong>
                      <span>The Overview reflects this now.</span>
                    </div>
                  ) : (
                    <>
                      <div className="documentation-summary-heading">Here's your update</div>
                      <ul className="documentation-summary-list">
                        {capturedLabels.map(({ key, label }) =>
                          captured[key] ? (
                            <li key={key}>
                              <span className={`documentation-summary-tag tag-${key}`}>{label}</span>
                              <p>{captured[key]}</p>
                            </li>
                          ) : null,
                        )}
                        {selectedOwner ? (
                          <li>
                            <span className="documentation-summary-tag tag-owner">Owner</span>
                            <p>{selectedOwner.name}</p>
                          </li>
                        ) : null}
                      </ul>

                      <div className="documentation-attach-picker">
                        <span className="documentation-attach-label">Attach to milestone</span>
                        <div className="documentation-attach-options">
                          {milestones.map((milestone) => {
                            const isSelected = milestone.id === selectedMilestoneId;
                            return (
                              <button
                                key={milestone.id}
                                className={isSelected ? "documentation-attach-chip is-selected" : "documentation-attach-chip"}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() =>
                                  setSelectedMilestoneId((current) => (current === milestone.id ? null : milestone.id))
                                }
                              >
                                {milestone.title}
                                {isSelected ? <Check aria-hidden="true" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button className="documentation-summary-confirm" type="button" onClick={handleConfirmSummary}>
                        <Check aria-hidden="true" />
                        <span>{selectedMilestoneId ? "Log it & add to milestone" : "Looks good — log it"}</span>
                      </button>
                    </>
                  )}
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {chatMode === "chat" ? (
          <div className="documentation-chat-footer">
            <div className="documentation-captured-tray" aria-label="Captured in this update">
              <span className="documentation-captured-label">Capturing</span>
              {capturedLabels.map(({ key, label }) => (
                <span
                  key={key}
                  className={captured[key] ? `documentation-captured-pill is-captured tag-${key}` : "documentation-captured-pill"}
                >
                  {captured[key] ? <Check aria-hidden="true" /> : <span className="documentation-captured-dot" aria-hidden="true" />}
                  {label}
                </span>
              ))}
            </div>
            {showOwnerPicker ? (
              <div className="documentation-owner-picker" aria-label="Assign an owner">
                <span className="documentation-owner-label">Owner</span>
                {teamMembers.map((member) => {
                  const isSelected = member.id === selectedOwnerId;
                  return (
                    <button
                      key={member.id}
                      className={isSelected ? "documentation-owner-chip is-selected" : "documentation-owner-chip"}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedOwnerId((current) => (current === member.id ? null : member.id))}
                    >
                      <span className="documentation-owner-avatar" aria-hidden="true">
                        {member.name.charAt(0)}
                      </span>
                      {member.name}
                      {isSelected ? <Check aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {!hasUserReplied ? (
              <div className="documentation-chat-starters" aria-label="Quick ways to start">
                {conversationStarters.map((starter) => (
                  <button
                    key={starter.label}
                    className="documentation-starter-chip"
                    type="button"
                    onClick={() => handleStarter(starter.seed)}
                  >
                    {starter.label}
                  </button>
                ))}
                <button
                  className="documentation-starter-chip is-quiet"
                  type="button"
                  onClick={handleAllQuiet}
                >
                  All quiet today
                </button>
              </div>
            ) : null}
            <form className="documentation-chat-composer" onSubmit={handleSendMessage}>
              <label>
                <span className="sr-only">Project update</span>
                <textarea
                  ref={composerRef}
                  placeholder={isRecording ? "Listening…" : "What's on your mind?"}
                  rows={1}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                />
              </label>
              <button
                className={isRecording ? "documentation-mic-button is-recording" : "documentation-mic-button"}
                type="button"
                aria-label={isRecording ? "Stop voice recording" : "Record with voice"}
                aria-pressed={isRecording}
                title={isRecording ? "Stop recording" : "Voice"}
                onClick={handleToggleVoice}
              >
                <Mic aria-hidden="true" />
              </button>
              <button
                type="submit"
                aria-label="Send update"
                title="Send update"
                disabled={!inputValue.trim()}
              >
                <SendHorizontal aria-hidden="true" />
              </button>
            </form>
          </div>
        ) : (
          <div className="documentation-config-actions">
            <button className="documentation-config-secondary" type="button" onClick={addQuestionSet}>
              <Plus aria-hidden="true" />
              <span>Add question set</span>
            </button>
            <button className="documentation-config-primary" type="button" onClick={saveConfiguration}>
              <Save aria-hidden="true" />
              <span>Save intake configuration</span>
            </button>
          </div>
        )}
        <div className="documentation-home-indicator" aria-hidden="true" />
      </section>
    </div>
  );
}

function DocumentationConfigPanel({
  questionSets,
  onAddQuestionSet,
  onDeleteQuestionSet,
  onUpdateQuestionSet,
}: {
  questionSets: IntakeQuestionSet[];
  onAddQuestionSet: () => void;
  onDeleteQuestionSet: (questionSetId: number) => void;
  onUpdateQuestionSet: (
    questionSetId: number,
    field: keyof Omit<IntakeQuestionSet, "id">,
    value: string,
  ) => void;
}) {
  return (
    <div className="documentation-config-panel">
      <section className="documentation-question-sets" aria-label="Question sets">
        <div className="documentation-config-section-heading">
          <span>Question sets</span>
          <strong>{questionSets.length}</strong>
        </div>

        <div className="documentation-question-list">
          {questionSets.map((questionSet, index) => (
            <article className="documentation-question-card" key={questionSet.id}>
              <div className="documentation-question-card-title">
                <span>Question set {index + 1}</span>
                <button
                  className="documentation-question-delete"
                  type="button"
                  aria-label={`Delete question set ${index + 1}`}
                  title="Delete question set"
                  onClick={() => onDeleteQuestionSet(questionSet.id)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
              <label>
                <span>Question the agent should look for</span>
                <textarea
                  value={questionSet.question}
                  rows={2}
                  onChange={(event) => onUpdateQuestionSet(questionSet.id, "question", event.target.value)}
                />
              </label>
              <label>
                <span>What a good answer includes</span>
                <textarea
                  value={questionSet.criteria}
                  rows={3}
                  onChange={(event) => onUpdateQuestionSet(questionSet.id, "criteria", event.target.value)}
                />
              </label>
              <label>
                <span>Example answer</span>
                <textarea
                  value={questionSet.example}
                  rows={3}
                  onChange={(event) => onUpdateQuestionSet(questionSet.id, "example", event.target.value)}
                />
              </label>
            </article>
          ))}
        </div>

        <button className="documentation-inline-add" type="button" onClick={onAddQuestionSet}>
          <Plus aria-hidden="true" />
          <span>Add question set</span>
        </button>
      </section>
    </div>
  );
}

function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="side-rail" aria-label="Primary navigation">
      <button className="brand-mark" type="button" aria-label="Home" title="Home">
        <Boxes aria-hidden="true" />
      </button>

      <nav className="rail-nav">
        {items.map((item) => (
          <button
            key={item.label}
            className={item.active ? "rail-button is-active" : "rail-button"}
            type="button"
            aria-label={item.label}
            title={item.label}
          >
            <item.icon aria-hidden="true" />
          </button>
        ))}
      </nav>

      <div className="rail-footer">
        <button className="rail-button" type="button" aria-label="Help" title="Help">
          <CircleHelp aria-hidden="true" />
        </button>
        <button className="rail-button" type="button" aria-label="Sign out" title="Sign out">
          <LogOut aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

// The project "operating document" — a single artifact rolling up the live dashboard
// state: current milestones plus every documentation update logged by the team.
function buildProjectDocumentHtml(
  data: TacDashboardData,
  milestones: MilestoneItem[],
  projectUpdates: ProjectUpdate[],
): string {
  const generatedOn = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const updatesHtml = projectUpdates
    .map((update) => {
      const lines = update.entries
        .map((entry) => `<li><strong>${escapeHtml(entry.label)}:</strong> ${escapeHtml(entry.text)}</li>`)
        .join("");
      return `
        <div class="entry">
          <p class="meta">Logged ${escapeHtml(update.loggedAt)}</p>
          <ul>${lines}</ul>
        </div>`;
    })
    .join("");

  const attentionHtml = data.operational.items
    .map(
      (item) =>
        `<li>${escapeHtml(item.title)} — ${escapeHtml(item.detail)}${item.badge ? ` <em>(${escapeHtml(item.badge)})</em>` : ""}</li>`,
    )
    .join("");

  const momentumHtml = data.momentum
    .map((item) => `<li><strong>${escapeHtml(item.value)}</strong> — ${escapeHtml(item.label)}: ${escapeHtml(item.detail)}</li>`)
    .join("");

  const outcomeHtml = data.businessOutcome.columns
    .map((column) => `<h3>${escapeHtml(column.eyebrow)}</h3><p class="meta">${escapeHtml(column.body)}</p>`)
    .join("");

  const milestonesHtml = milestones
    .map((milestone) => {
      const doneCount = milestone.tasks.filter((task) => task.status === "Done").length;
      return `
        <div class="entry">
          <div class="entry-head">
            <h2>${escapeHtml(milestone.title)}</h2>
            <span class="pill">${escapeHtml(milestone.status)}</span>
          </div>
          <p class="meta">${escapeHtml(milestone.progressLabel)} &middot; ${escapeHtml(milestone.owner)} &middot; Due ${escapeHtml(milestone.dueDate)} &middot; ${doneCount}/${milestone.tasks.length} tasks done</p>
        </div>`;
    })
    .join("");

  const body = `
  <h1>${escapeHtml(data.project)} — Operating Document</h1>
  <p class="generated">Generated ${escapeHtml(generatedOn)} &middot; ${escapeHtml(data.organization)}</p>
  <div class="summary">
    <div><strong>${data.healthScore}%</strong><span>Delivery health</span></div>
    <div><strong>${milestones.length}</strong><span>Milestones</span></div>
    <div><strong>${projectUpdates.length}</strong><span>Updates logged</span></div>
  </div>
  <div class="section">
    <h2>Documentation updates (${projectUpdates.length})</h2>
    ${updatesHtml || "<p>No updates logged yet.</p>"}
  </div>
  <div class="section">
    <h2>Delivery health</h2>
    <p class="meta">${escapeHtml(data.healthStatus)} &middot; 7-day trend ${escapeHtml(data.healthDates.join(" → "))}</p>
  </div>
  <div class="section">
    <h2>Operational attention</h2>
    <p class="meta">Blockers: ${escapeHtml(data.operational.blockerStatus)}</p>
    <ul>${attentionHtml || "<li>None.</li>"}</ul>
  </div>
  <div class="section">
    <h2>Delivery momentum</h2>
    <ul>${momentumHtml || "<li>None.</li>"}</ul>
  </div>
  <div class="section">
    <h2>Business outcome — ${escapeHtml(data.businessOutcome.title)}</h2>
    <p class="meta">${escapeHtml(data.businessOutcome.prompt)}</p>
    ${outcomeHtml}
  </div>
  <div class="section">
    <h2>Milestones (${milestones.length})</h2>
    ${milestonesHtml || "<p>No milestones yet.</p>"}
  </div>`;

  return wrapHtmlDocument(`${data.project} — Operating Document`, body);
}

function projectFileSlug(project: string): string {
  const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || "project";
}

function ProjectHeader({
  data,
  milestones,
  projectUpdates,
}: {
  data: TacDashboardData;
  milestones: MilestoneItem[];
  projectUpdates: ProjectUpdate[];
}) {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  useEffect(() => {
    if (!downloadMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-download-menu-root]")) {
        return;
      }
      setDownloadMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDownloadMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [downloadMenuOpen]);

  function handleDownloadDoc() {
    downloadHtmlAsDoc(
      buildProjectDocumentHtml(data, milestones, projectUpdates),
      `${projectFileSlug(data.project)}-operating-document-${documentFileStamp()}.doc`,
    );
    setDownloadMenuOpen(false);
  }

  function handleDownloadPdf() {
    printHtmlAsPdf(buildProjectDocumentHtml(data, milestones, projectUpdates));
    setDownloadMenuOpen(false);
  }

  return (
    <header className="project-header">
      <div className="breadcrumb">
        <button className="back-button" type="button" aria-label="Back" title="Back">
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="breadcrumb-strong">{data.organization}</span>
        <span className="breadcrumb-divider">/</span>
        <span className="breadcrumb-project">{data.project}</span>
      </div>

      <div className="header-actions">
        <div className="download-control" data-download-menu-root>
          <button
            className="download-button"
            type="button"
            aria-haspopup="menu"
            aria-expanded={downloadMenuOpen}
            onClick={() => setDownloadMenuOpen((current) => !current)}
          >
            <Download aria-hidden="true" />
            <span>Download</span>
            <ChevronDown aria-hidden="true" />
          </button>
          {downloadMenuOpen ? (
            <div className="download-menu" role="menu" aria-label="Download project document">
              <button className="download-menu-item" type="button" role="menuitem" onClick={handleDownloadDoc}>
                <FileText aria-hidden="true" />
                <span>Word (.doc)</span>
              </button>
              <button className="download-menu-item" type="button" role="menuitem" onClick={handleDownloadPdf}>
                <Download aria-hidden="true" />
                <span>PDF</span>
              </button>
            </div>
          ) : null}
        </div>
        <button className="edit-button" type="button">
          <PencilLine aria-hidden="true" />
          <span>Edit</span>
        </button>
        <div className="action-divider" />
        <label className="search-pill">
          <Search aria-hidden="true" />
          <span className="sr-only">Search</span>
          <input placeholder="Search..." />
          <kbd>
            <Command aria-hidden="true" />
            K
          </kbd>
        </label>
        <button className="icon-action" type="button" aria-label="Theme" title="Theme">
          <SunMedium aria-hidden="true" />
        </button>
        <button className="notification-button" type="button" aria-label="Notifications" title="Notifications">
          <Bell aria-hidden="true" />
          <span>50</span>
        </button>
        <button className="avatar-button" type="button" aria-label="Account" title="Account">
          <span aria-hidden="true">JR</span>
        </button>
      </div>
    </header>
  );
}

function ProjectTabs({
  tabs,
  onTabSelect,
}: {
  tabs: ProjectTab[];
  onTabSelect: (view: DashboardView) => void;
}) {
  const rightTabs = tabs.filter((tab) => tab.alignRight);
  const leftTabs = tabs.filter((tab) => !tab.alignRight);

  return (
    <nav className="project-tabs" aria-label="Project sections">
      <div className="tab-cluster">
        {leftTabs.map((tab) => (
          <ProjectTabButton key={tab.label} tab={tab} onTabSelect={onTabSelect} />
        ))}
      </div>
      <div className="tab-cluster right">
        {rightTabs.map((tab) => (
          <ProjectTabButton key={tab.label} tab={tab} onTabSelect={onTabSelect} />
        ))}
      </div>
    </nav>
  );
}

function ProjectTabButton({
  tab,
  onTabSelect,
}: {
  tab: ProjectTab;
  onTabSelect: (view: DashboardView) => void;
}) {
  const mappedView = tab.label === "Overview" ? "overview" : tab.label === "Milestones" ? "milestones" : null;

  return (
    <button
      className={[
        "tab-button",
        tab.active ? "is-active" : "",
        mappedView ? "" : "is-disabled",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      aria-current={tab.active ? "page" : undefined}
      aria-disabled={mappedView ? undefined : true}
      onClick={() => {
        if (mappedView) {
          onTabSelect(mappedView);
        }
      }}
    >
      <tab.icon aria-hidden="true" />
      <span>{tab.label}</span>
      {typeof tab.count === "number" ? <span className="tab-count">{tab.count}</span> : null}
    </button>
  );
}

function DeliveryHealthCard({
  score,
  status,
  dates,
}: {
  score: number;
  status: string;
  dates: string[];
}) {
  return (
    <section className="dashboard-card health-card" aria-labelledby="delivery-health-title">
      <div className="card-kicker" id="delivery-health-title">
        Delivery Health
      </div>
      <div className="health-content">
        <div className="health-score">
          <span>Health score</span>
          <strong>{score}%</strong>
          <em>{status}</em>
        </div>
        <div className="trend-chart" aria-label="7-day trend health score 50 percent">
          <div className="trend-label">7-day trend</div>
          <svg viewBox="0 0 360 168" role="img" aria-hidden="true">
            <defs>
              <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f0ba48" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#f0ba48" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line className="grid-line" x1="24" y1="28" x2="346" y2="28" />
            <line className="grid-line" x1="24" y1="92" x2="346" y2="92" />
            <line className="grid-line" x1="24" y1="156" x2="346" y2="156" />
            <text className="axis-label" x="0" y="32">
              100
            </text>
            <text className="axis-label" x="0" y="96">
              50
            </text>
            <text className="axis-label" x="0" y="160">
              0
            </text>
            <path d="M58 92 H346 V156 H58 Z" fill="url(#trendFill)" />
            <path className="trend-line" d="M58 92 H346" />
          </svg>
          <div className="date-axis">
            {dates.map((date) => (
              <span key={date}>{date}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OperationalAttentionCard({
  blockerStatus,
  items,
}: {
  blockerStatus: string;
  items: OperationalAttentionItem[];
}) {
  return (
    <section className="dashboard-card attention-card" aria-labelledby="attention-title">
      <div className="card-kicker" id="attention-title">
        Operational Attention
      </div>
      <div className="blocker-summary">
        <strong>Blockers</strong>
        <span>{blockerStatus}</span>
      </div>
      <div className="attention-list">
        {items.map((item) => (
          <div className={`attention-row tone-${item.tone}`} key={item.title}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
            {item.badge ? (
              <span className="status-badge">
                <span>{item.badge}</span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function DeliveryMomentumCard({ items }: { items: DeliveryMomentumItem[] }) {
  return (
    <section className="dashboard-card momentum-card" aria-labelledby="momentum-title">
      <div className="card-kicker" id="momentum-title">
        Delivery Momentum
      </div>
      <div className="momentum-list">
        {items.map((item) => (
          <div className="momentum-row" key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
            <b className={`momentum-value tone-${item.tone ?? "neutral"}`}>{item.value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function BusinessOutcomePanel({
  title,
  prompt,
  columns,
}: {
  title: string;
  prompt: string;
  columns: BusinessOutcomeColumn[];
}) {
  const leftColumns = [columns[0], columns[2]].filter(Boolean);
  const rightColumns = [columns[1], columns[3]].filter(Boolean);

  return (
    <section className="business-panel" aria-labelledby="business-title">
      <div className="business-prompt">
        <h2 id="business-title">{title}</h2>
        <p>{prompt}</p>
      </div>
      <div className="business-columns">
        {leftColumns.map((column) => (
          <BusinessOutcomeCopy column={column} key={column.eyebrow} />
        ))}
      </div>
      <div className="business-columns">
        {rightColumns.map((column) => (
          <BusinessOutcomeCopy column={column} key={column.eyebrow} />
        ))}
      </div>
    </section>
  );
}

function BusinessOutcomeCopy({ column }: { column: BusinessOutcomeColumn }) {
  return (
    <div className="business-copy">
      <span>{column.eyebrow}</span>
      <p>{column.body}</p>
    </div>
  );
}
