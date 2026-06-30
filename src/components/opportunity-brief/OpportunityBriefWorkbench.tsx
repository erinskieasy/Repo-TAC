import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  FileDown,
  FileText,
  KeyRound,
  Lightbulb,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  SunMedium,
  Trash2,
  Wand2,
  PlayCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { briefToMarkdown, downloadBriefMarkdown, openBriefDocument } from "./briefExport";
import { getSectionGuidance, synthesizeSection } from "./openai";
import type { GuidanceResult } from "./openai";
import { createBrief, EXPLAINER_VIDEO_URL, WRITING_STYLE } from "./sectionConfig";
import { loadApiKey, loadBriefs, saveApiKey, saveBriefs } from "./storage";
import type { BriefSection, OpportunityBrief, SynthesisMode } from "./types";
import { VoiceTextArea } from "./VoiceTextArea";

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `brief-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Everything captured before the current section — used to coach the "I'm not sure" help.
function buildPriorContext(brief: OpportunityBrief, currentSectionId: number): string {
  const parts: string[] = [];
  if (brief.executiveSummary.trim()) {
    parts.push(`Executive summary: ${brief.executiveSummary.trim()}`);
  }
  for (const section of brief.sections) {
    if (section.id < currentSectionId && section.synthesis.trim()) {
      parts.push(`Section ${section.id} (${section.title}): ${section.synthesis.trim()}`);
    }
  }
  return parts.join("\n");
}

type EditorStep = "metadata" | number | "assemble";

type ThemeControls = {
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
};

function ThemeToggle({ theme, onToggleTheme }: ThemeControls) {
  return (
    <button
      className="brief-theme-toggle"
      type="button"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      aria-pressed={theme === "dark"}
      onClick={onToggleTheme}
    >
      {theme === "dark" ? <SunMedium aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

export function OpportunityBriefWorkbench({
  onExit,
  theme,
  onToggleTheme,
}: { onExit: () => void } & ThemeControls) {
  const [briefs, setBriefs] = useState<OpportunityBrief[]>(() => loadBriefs());
  const [apiKey, setApiKeyState] = useState<string>(() => loadApiKey());
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const activeBrief = briefs.find((brief) => brief.id === activeBriefId) ?? null;

  function persist(next: OpportunityBrief[]) {
    saveBriefs(next);
    setSavedAt(Date.now());
  }

  function updateBrief(id: string, updater: (brief: OpportunityBrief) => OpportunityBrief) {
    setBriefs((current) => {
      const next = current.map((brief) =>
        brief.id === id ? { ...updater(brief), updatedAt: Date.now() } : brief,
      );
      persist(next);
      return next;
    });
  }

  function handleCreate() {
    const brief = createBrief(newId(), Date.now(), "");
    setBriefs((current) => {
      const next = [...current, brief];
      persist(next);
      return next;
    });
    setActiveBriefId(brief.id);
  }

  function handleClone(source: OpportunityBrief) {
    const clone: OpportunityBrief = {
      ...structuredClone(source),
      id: newId(),
      metadata: { ...source.metadata, name: `${source.metadata.name} (copy)` },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setBriefs((current) => {
      const next = [...current, clone];
      persist(next);
      return next;
    });
    setActiveBriefId(clone.id);
  }

  function handleDelete(id: string) {
    setBriefs((current) => {
      const next = current.filter((brief) => brief.id !== id);
      persist(next);
      return next;
    });
    if (activeBriefId === id) {
      setActiveBriefId(null);
    }
  }

  function handleApiKeyChange(value: string) {
    setApiKeyState(value);
    saveApiKey(value);
  }

  if (!activeBrief) {
    return (
      <BriefListView
        briefs={briefs}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        onCreate={handleCreate}
        onClone={handleClone}
        onResume={setActiveBriefId}
        onDelete={handleDelete}
        onExit={onExit}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
    );
  }

  return (
    <BriefEditor
      brief={activeBrief}
      apiKey={apiKey}
      savedAt={savedAt}
      onUpdate={(updater) => updateBrief(activeBrief.id, updater)}
      onBack={() => setActiveBriefId(null)}
      onExit={onExit}
      theme={theme}
      onToggleTheme={onToggleTheme}
    />
  );
}

function BriefListView({
  briefs,
  apiKey,
  onApiKeyChange,
  onCreate,
  onClone,
  onResume,
  onDelete,
  onExit,
  theme,
  onToggleTheme,
}: {
  briefs: OpportunityBrief[];
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  onCreate: () => void;
  onClone: (brief: OpportunityBrief) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onExit: () => void;
} & ThemeControls) {
  return (
    <div className="brief-app">
      <div className="brief-list">
        <header className="brief-list-header">
          <div className="brief-list-topbar">
            <button className="brief-back" type="button" onClick={onExit}>
              <ArrowLeft aria-hidden="true" />
              <span>Back to dashboard</span>
            </button>
            <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
          </div>
          <div>
            <span className="brief-eyebrow">Team Alignment Center</span>
            <h1>Opportunity Brief Workbench</h1>
            <p>Define and package a business opportunity for executive green-light review.</p>
          </div>
        </header>

        <div className="brief-explainer">
          <PlayCircle aria-hidden="true" />
          <div>
            <strong>How this works</strong>
            <span>Watch the explainer before you start.</span>
          </div>
          <a className="brief-explainer-link" href={EXPLAINER_VIDEO_URL} target="_blank" rel="noreferrer">
            Open video
          </a>
        </div>

        <ApiKeyPanel apiKey={apiKey} onApiKeyChange={onApiKeyChange} />

        <div className="brief-list-toolbar">
          <h2>Your briefs ({briefs.length})</h2>
          <button className="brief-primary" type="button" onClick={onCreate}>
            <Plus aria-hidden="true" />
            <span>New brief</span>
          </button>
        </div>

        {briefs.length === 0 ? (
          <div className="brief-empty">
            <p>No briefs yet. Create one to start defining the opportunity.</p>
          </div>
        ) : (
          <ul className="brief-cards">
            {briefs.map((brief) => {
              const saved = brief.sections.filter((section) => section.saved).length;
              return (
                <li key={brief.id} className="brief-card">
                  <button className="brief-card-main" type="button" onClick={() => onResume(brief.id)}>
                    <strong>{brief.metadata.name}</strong>
                    <span>
                      {saved}/8 sections · {brief.metadata.version} · updated{" "}
                      {new Date(brief.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <div className="brief-card-actions">
                    <button type="button" aria-label="Clone brief" title="Clone" onClick={() => onClone(brief)}>
                      <Copy aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Delete brief" title="Delete" onClick={() => onDelete(brief.id)}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ApiKeyPanel({ apiKey, onApiKeyChange }: { apiKey: string; onApiKeyChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="brief-apikey">
      <button className="brief-apikey-toggle" type="button" onClick={() => setOpen((current) => !current)}>
        <KeyRound aria-hidden="true" />
        <span>{apiKey ? "OpenAI key saved in this browser" : "Add your OpenAI API key"}</span>
        <ChevronRight aria-hidden="true" className={open ? "is-open" : ""} />
      </button>
      {open ? (
        <div className="brief-apikey-body">
          <label className="brief-field-label" htmlFor="brief-api-key">
            OpenAI API key (stored only in this browser, used for synthesis and Whisper)
          </label>
          <input
            id="brief-api-key"
            className="brief-input"
            type="password"
            value={apiKey}
            placeholder="sk-…"
            autoComplete="off"
            onChange={(event) => onApiKeyChange(event.target.value)}
          />
          <p className="brief-help">
            Without a key, synthesis and voice still work with a local draft fallback so you can try the flow.
          </p>
        </div>
      ) : null}
    </div>
  );
}

const STEP_LABELS = [
  "Metadata",
  "1. Problem",
  "2. Broken today",
  "3. Success",
  "4. Building",
  "5. How",
  "6. Owners",
  "7. Timing",
  "8. Risks",
  "Assemble",
];

function BriefEditor({
  brief,
  apiKey,
  savedAt,
  onUpdate,
  onBack,
  onExit,
  theme,
  onToggleTheme,
}: {
  brief: OpportunityBrief;
  apiKey: string;
  savedAt: number | null;
  onUpdate: (updater: (brief: OpportunityBrief) => OpportunityBrief) => void;
  onBack: () => void;
  onExit: () => void;
} & ThemeControls) {
  const [step, setStep] = useState<EditorStep>("metadata");
  const savedCount = brief.sections.filter((section) => section.saved).length;

  function updateSection(id: number, updater: (section: BriefSection) => BriefSection) {
    onUpdate((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === id ? updater(section) : section)),
    }));
  }

  const steps: EditorStep[] = ["metadata", 1, 2, 3, 4, 5, 6, 7, 8, "assemble"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="brief-app">
      <aside className="brief-rail">
        <div className="brief-rail-top">
          <button className="brief-back" type="button" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            <span>All briefs</span>
          </button>
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        </div>
        <div className="brief-rail-progress">
          <span>{savedCount}/8 sections complete</span>
          <div className="brief-progress-track">
            <div className="brief-progress-fill" style={{ width: `${(savedCount / 8) * 100}%` }} />
          </div>
        </div>
        <nav className="brief-steps">
          {steps.map((value, index) => {
            const label = STEP_LABELS[index];
            const isSection = typeof value === "number";
            const done = isSection && brief.sections[value - 1]?.saved;
            return (
              <button
                key={label}
                type="button"
                className={`brief-step ${step === value ? "is-active" : ""} ${done ? "is-done" : ""}`}
                onClick={() => setStep(value)}
              >
                <span className="brief-step-dot">{done ? <Check aria-hidden="true" /> : index + 1}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="brief-autosave">
          <Check aria-hidden="true" />
          <span>{savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : "Auto-saves as you type"}</span>
        </div>
      </aside>

      <main className="brief-main">
        {step === "metadata" ? (
          <MetadataPanel brief={brief} apiKey={apiKey} onUpdate={onUpdate} onNext={() => setStep(1)} />
        ) : step === "assemble" ? (
          <AssemblePanel brief={brief} apiKey={apiKey} onUpdate={onUpdate} onExit={onExit} />
        ) : (
          <SectionPanel
            key={step}
            section={brief.sections[step - 1]}
            priorContext={buildPriorContext(brief, step)}
            apiKey={apiKey}
            onChange={(updater) => updateSection(step, updater)}
            onNext={() => setStep(steps[Math.min(stepIndex + 1, steps.length - 1)])}
          />
        )}
      </main>
    </div>
  );
}

function MetadataPanel({
  brief,
  apiKey,
  onUpdate,
  onNext,
}: {
  brief: OpportunityBrief;
  apiKey: string;
  onUpdate: (updater: (brief: OpportunityBrief) => OpportunityBrief) => void;
  onNext: () => void;
}) {
  function setMeta(patch: Partial<OpportunityBrief["metadata"]>) {
    onUpdate((current) => ({ ...current, metadata: { ...current.metadata, ...patch } }));
  }

  return (
    <div className="brief-panel">
      <header className="brief-panel-head">
        <span className="brief-eyebrow">Phase 1 · Opportunity Definition</span>
        <h2>Brief metadata & title page</h2>
        <p className="brief-style-note">Writing style: {WRITING_STYLE}</p>
      </header>

      <div className="brief-grid">
        <label className="brief-field">
          <span className="brief-field-label">Opportunity name</span>
          <input
            className="brief-input"
            value={brief.metadata.name}
            onChange={(event) => setMeta({ name: event.target.value })}
          />
        </label>
        <label className="brief-field">
          <span className="brief-field-label">Author</span>
          <input
            className="brief-input"
            value={brief.metadata.author}
            onChange={(event) => setMeta({ author: event.target.value })}
          />
        </label>
        <label className="brief-field">
          <span className="brief-field-label">Date</span>
          <input
            className="brief-input"
            type="date"
            value={brief.metadata.date}
            onChange={(event) => setMeta({ date: event.target.value })}
          />
        </label>
        <label className="brief-field">
          <span className="brief-field-label">Version</span>
          <input
            className="brief-input"
            value={brief.metadata.version}
            onChange={(event) => setMeta({ version: event.target.value })}
          />
        </label>
      </div>

      <div className="brief-field">
        <VoiceTextArea
          label="Executive summary (draft shell — refined at assembly)"
          apiKey={apiKey}
          value={brief.executiveSummary}
          rows={4}
          placeholder="One paragraph an executive could read and green-light…"
          onChange={(value) => onUpdate((current) => ({ ...current, executiveSummary: value }))}
        />
      </div>

      <div className="brief-panel-actions">
        <button className="brief-primary" type="button" onClick={onNext}>
          <span>Start Section 1</span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function SectionPanel({
  section,
  priorContext,
  apiKey,
  onChange,
  onNext,
}: {
  section: BriefSection;
  priorContext: string;
  apiKey: string;
  onChange: (updater: (section: BriefSection) => BriefSection) => void;
  onNext: () => void;
}) {
  const [busyMode, setBusyMode] = useState<SynthesisMode | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [guidance, setGuidance] = useState<GuidanceResult | null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);

  async function requestGuidance() {
    setGuidanceLoading(true);
    const result = await getSectionGuidance(apiKey, priorContext, section);
    setGuidance(result);
    setGuidanceLoading(false);
  }

  function useDraft(draft: string) {
    onChange((current) => ({ ...current, saved: false, synthesis: draft }));
    setGuidance(null);
  }

  function setQuestion(id: string, patch: Partial<BriefSection["questions"][number]>) {
    onChange((current) => ({
      ...current,
      saved: false,
      questions: current.questions.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    }));
  }

  async function runSynthesis(mode: SynthesisMode) {
    setBusyMode(mode);
    const result = await synthesizeSection(apiKey, section, mode);
    onChange((current) => ({
      ...current,
      saved: false,
      synthesis: result.answer,
      assumptions: result.assumptions,
    }));
    setBusyMode(null);
  }

  function setAssumption(index: number, value: string) {
    onChange((current) => ({
      ...current,
      saved: false,
      assumptions: current.assumptions.map((assumption, i) => (i === index ? value : assumption)),
    }));
  }

  function addAssumption() {
    onChange((current) => ({ ...current, saved: false, assumptions: [...current.assumptions, ""] }));
  }

  function removeAssumption(index: number) {
    onChange((current) => ({
      ...current,
      saved: false,
      assumptions: current.assumptions.filter((_, i) => i !== index),
    }));
  }

  function saveSection() {
    onChange((current) => ({ ...current, saved: true }));
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
    onNext();
  }

  const hasSynthesis = section.synthesis.trim().length > 0;

  return (
    <div className="brief-panel">
      <header className="brief-panel-head">
        <div className="brief-panel-head-top">
          <span className="brief-eyebrow">Section {section.id} of 8 · Required</span>
          <button className="brief-help-button" type="button" disabled={guidanceLoading} onClick={requestGuidance}>
            <Lightbulb aria-hidden="true" />
            <span>{guidanceLoading ? "Thinking…" : "I'm not sure — help me"}</span>
          </button>
        </div>
        <h2>{section.title}</h2>
        <button className="brief-link" type="button" onClick={() => setShowExamples((current) => !current)}>
          {showExamples ? "Hide example answers" : "Show example answers"}
        </button>
      </header>

      {guidance ? (
        <div className="brief-guidance" role="status">
          <div className="brief-guidance-head">
            <Lightbulb aria-hidden="true" />
            <strong>Here's how to approach this</strong>
            <button
              type="button"
              className="brief-guidance-dismiss"
              aria-label="Dismiss guidance"
              onClick={() => setGuidance(null)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <p className="brief-guidance-text">{guidance.guidance}</p>
          {guidance.draft ? (
            <div className="brief-guidance-draft">
              <span className="brief-field-label">Suggested starting answer</span>
              <p>{guidance.draft}</p>
              <button className="brief-ghost" type="button" onClick={() => useDraft(guidance.draft)}>
                <Check aria-hidden="true" />
                <span>Use as starting answer</span>
              </button>
            </div>
          ) : null}
          {guidance.source === "local" ? (
            <span className="brief-help">Tip: add your OpenAI key in Settings for context-aware help.</span>
          ) : null}
        </div>
      ) : null}

      <div className="brief-questions">
        {section.questions.map((question) => (
          <div key={question.id} className={question.enabled ? "brief-question" : "brief-question is-off"}>
            <div className="brief-question-head">
              <span className="brief-question-prompt">{question.prompt}</span>
              <label className="brief-toggle">
                <input
                  type="checkbox"
                  checked={question.enabled}
                  onChange={(event) => setQuestion(question.id, { enabled: event.target.checked })}
                />
                <span>{question.enabled ? "On" : "Off"}</span>
              </label>
            </div>
            {showExamples ? <p className="brief-example">e.g. {question.example}</p> : null}
            {question.enabled ? (
              <VoiceTextArea
                apiKey={apiKey}
                value={question.answer}
                rows={2}
                placeholder="Type or use voice…"
                onChange={(value) => setQuestion(question.id, { answer: value })}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="brief-synth-actions">
        <button className="brief-primary" type="button" disabled={busyMode !== null} onClick={() => runSynthesis("regenerate")}>
          <Sparkles aria-hidden="true" />
          <span>{busyMode === "regenerate" ? "Synthesizing…" : hasSynthesis ? "Regenerate" : "Synthesize section"}</span>
        </button>
        {hasSynthesis ? (
          <>
            <button className="brief-ghost" type="button" disabled={busyMode !== null} onClick={() => runSynthesis("executive")}>
              <Wand2 aria-hidden="true" />
              <span>{busyMode === "executive" ? "Working…" : "Make more executive"}</span>
            </button>
            <button className="brief-ghost" type="button" disabled={busyMode !== null} onClick={() => runSynthesis("detail")}>
              <RefreshCw aria-hidden="true" />
              <span>{busyMode === "detail" ? "Working…" : "Add more detail"}</span>
            </button>
          </>
        ) : null}
      </div>

      {hasSynthesis ? (
        <>
          <div className="brief-field">
            <VoiceTextArea
              label="Section answer (editable)"
              apiKey={apiKey}
              value={section.synthesis}
              rows={5}
              onChange={(value) => onChange((current) => ({ ...current, saved: false, synthesis: value }))}
            />
          </div>

          <div className="brief-assumptions">
            <div className="brief-assumptions-head">
              <span className="brief-field-label">Inferred assumptions (editable)</span>
              <button className="brief-link" type="button" onClick={addAssumption}>
                <Plus aria-hidden="true" />
                <span>Add</span>
              </button>
            </div>
            {section.assumptions.length === 0 ? (
              <p className="brief-help">No assumptions inferred.</p>
            ) : (
              section.assumptions.map((assumption, index) => (
                <div key={index} className="brief-assumption-row">
                  <VoiceTextArea
                    apiKey={apiKey}
                    value={assumption}
                    rows={1}
                    onChange={(value) => setAssumption(index, value)}
                  />
                  <button
                    type="button"
                    className="brief-assumption-remove"
                    aria-label="Remove assumption"
                    onClick={() => removeAssumption(index)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="brief-panel-actions">
            <button className={justSaved ? "brief-primary is-saved" : "brief-primary"} type="button" onClick={saveSection}>
              <Check aria-hidden="true" />
              <span>{justSaved ? "Saved!" : section.saved ? "Saved — continue" : "Save section & continue"}</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function AssemblePanel({
  brief,
  apiKey,
  onUpdate,
  onExit,
}: {
  brief: OpportunityBrief;
  apiKey: string;
  onUpdate: (updater: (brief: OpportunityBrief) => OpportunityBrief) => void;
  onExit: () => void;
}) {
  const [polishing, setPolishing] = useState(false);
  const [exported, setExported] = useState<"md" | "doc" | null>(null);
  const markdown = useMemo(() => briefToMarkdown(brief), [brief]);
  const savedCount = brief.sections.filter((section) => section.saved).length;
  const allDone = savedCount === 8;

  useEffect(() => {
    if (!exported) {
      return;
    }
    const timer = window.setTimeout(() => setExported(null), 2500);
    return () => window.clearTimeout(timer);
  }, [exported]);

  async function polishExecutiveSummary() {
    setPolishing(true);
    // Reuse synthesis on a synthetic "executive summary" section built from saved sections.
    const synthSection: BriefSection = {
      id: 0,
      title: "Executive summary of the whole opportunity",
      saved: false,
      synthesis: brief.executiveSummary,
      assumptions: [],
      questions: brief.sections.map((section) => ({
        id: `s-${section.id}`,
        prompt: section.title,
        example: "",
        enabled: true,
        answer: section.synthesis,
      })),
    };
    const result = await synthesizeSection(apiKey, synthSection, "executive");
    onUpdate((current) => ({ ...current, executiveSummary: result.answer }));
    setPolishing(false);
  }

  return (
    <div className="brief-panel">
      <header className="brief-panel-head">
        <span className="brief-eyebrow">Final brief assembly</span>
        <h2>Assemble & export</h2>
        <p className="brief-help">{savedCount}/8 sections saved.</p>
      </header>

      {!allDone ? (
        <div className="brief-warning">Complete and save all 8 sections for a full executive brief.</div>
      ) : null}

      <div className="brief-synth-actions">
        <button className="brief-ghost" type="button" disabled={polishing} onClick={polishExecutiveSummary}>
          <Wand2 aria-hidden="true" />
          <span>{polishing ? "Polishing…" : "LLM once-over: make it executive-ready"}</span>
        </button>
      </div>

      <div className="brief-preview">
        <pre>{markdown}</pre>
      </div>

      <div className="brief-export-actions">
        <div className="brief-export-downloads">
          <button
            className={exported === "md" ? "brief-primary is-saved" : "brief-primary"}
            type="button"
            onClick={() => {
              downloadBriefMarkdown(brief);
              setExported("md");
            }}
          >
            <FileDown aria-hidden="true" />
            <span>{exported === "md" ? "Downloaded!" : "Download Markdown"}</span>
          </button>
          <button
            className={exported === "doc" ? "brief-ghost is-saved" : "brief-ghost"}
            type="button"
            onClick={() => {
              openBriefDocument(brief);
              setExported("doc");
            }}
          >
            <FileText aria-hidden="true" />
            <span>{exported === "doc" ? "Doc opened in new tab" : "Create new doc"}</span>
          </button>
        </div>
        <button className="brief-ghost" type="button" onClick={onExit}>
          <ArrowLeft aria-hidden="true" />
          <span>Back to dashboard</span>
        </button>
      </div>
    </div>
  );
}
