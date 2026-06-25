import {
  ArrowLeft,
  Bell,
  Boxes,
  CircleHelp,
  Command,
  FilePenLine,
  LogOut,
  MessageSquareText,
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
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { MilestonesSection } from "./MilestonesSection";
import { milestoneProjectTabs, projectTabs, sidebarItems, tacDashboardData } from "./tacData";
import type {
  BusinessOutcomeColumn,
  DeliveryMomentumItem,
  NavItem,
  OperationalAttentionItem,
  ProjectTab,
  TacDashboardData,
} from "./types";

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
        <ProjectHeader organization={data.organization} project={data.project} />
        <ProjectTabs tabs={resolvedTabs} onTabSelect={setActiveView} />
        <section
          className={activeView === "milestones" ? "tac-page tac-page-milestones" : "tac-page"}
          aria-labelledby={activeView === "milestones" ? "milestones-title" : "overview-title"}
        >
          {activeView === "milestones" ? (
            <MilestonesSection data={data.milestones} />
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
                  <span>Update project documentation</span>
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
                <DocumentationChatWindow onClose={() => setDocumentationChatOpen(false)} />
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

function DocumentationChatWindow({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<DocumentationChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("chat");
  const [questionSets, setQuestionSets] = useState<IntakeQuestionSet[]>(defaultQuestionSets);
  const [configSaved, setConfigSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    setMessages((current) => [...current, userMessage]);
    setInputValue("");

    if (replyTimeoutRef.current !== null) {
      window.clearTimeout(replyTimeoutRef.current);
    }

    replyTimeoutRef.current = window.setTimeout(() => {
      const assistantMessage: DocumentationChatMessage = {
        id: Date.now() + 1,
        text: configSaved
          ? "Noted. I'll compare this against the saved intake configuration before updating documentation."
          : "Noted. I'll add that to the project log.",
        sender: "assistant",
        timestamp: getTimestamp(),
      };

      setMessages((current) => [...current, assistantMessage]);
    }, 1000);
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
        aria-label="Close documentation chat"
        onClick={onClose}
      />
      <section
        className="documentation-chat"
        aria-label="Project documentation chat"
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
                <strong>Update me on the project</strong>
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
                  <div className="documentation-message-bubble">
                    <p>{message.text}</p>
                  </div>
                  <time>{message.timestamp}</time>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {chatMode === "chat" ? (
          <form className="documentation-chat-composer" onSubmit={handleSendMessage}>
            <label>
              <span className="sr-only">Project update</span>
              <textarea
                placeholder="Type project update..."
                rows={1}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleComposerKeyDown}
              />
            </label>
            <button
              type="submit"
              aria-label="Send update"
              title="Send update"
              disabled={!inputValue.trim()}
            >
              <SendHorizontal aria-hidden="true" />
            </button>
          </form>
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

function ProjectHeader({ organization, project }: { organization: string; project: string }) {
  return (
    <header className="project-header">
      <div className="breadcrumb">
        <button className="back-button" type="button" aria-label="Back" title="Back">
          <ArrowLeft aria-hidden="true" />
        </button>
        <span className="breadcrumb-strong">{organization}</span>
        <span className="breadcrumb-divider">/</span>
        <span className="breadcrumb-project">{project}</span>
      </div>

      <div className="header-actions">
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
