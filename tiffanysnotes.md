# Tiffany's Notes

Running summary of product/interface changes made in this repo, dated.

> **Last push:** `cb574b5` (2026-06-26). Everything under **Since last push** below is local / uncommitted.

---

## 2026-06-25 — Documentation chat → "Atlas" assistant _(pushed: `cf2b49f`)_

The "Share a project update" button (Overview) opens a chat modal driven by an assistant named **Atlas**. Grew from a plain text box into a guided check-in:

- **Accessibility refactor** — `role="dialog"` + `aria-modal`, focus trap, Escape + backdrop close, focus restore to trigger, background scroll lock, visible focus rings, 44px touch targets, `100dvh` sizing.
- **Warm opening** — replaced the blank watermark with a time-aware greeting that references last week's thread.
- **Quick-start chips** — Report progress · Share a blocker · Flag a risk (pre-fill the composer).
- **Reflect-back replies** + **typing indicator** — Atlas mirrors what you said, asks one gentle follow-up; tone adapts to effort.
- **CAPTURING tray** — live category tags fill in as you talk.
- **Voice input (prototype)** — mic button with recording pulse.
- **Summary card + done moment** — recap + "Log it" confirm + green checkmark flourish.
- Full-page UX/accessibility review performed (audit; findings not all applied).
- All motion respects `prefers-reduced-motion`.

## 2026-06-26 — Milestones, exports, single source of truth _(pushed: `cb574b5`)_

- **Atlas identity** renamed Ada → **Atlas**.
- **Owner picker** — when Atlas asks "who owns it?", switch through the project team roster (Tiffany, Erinski, Mikale). Roster shared via `teamMembers` (tacData.ts), used by both the milestone assignee picker and the Atlas owner picker.
- **Milestone "Generate report"** — modal with completion stats + each milestone's completed (✓) / still-open tasks; export as **Copy text · Word (.doc) · PDF**.
- **Project header "Download" menu** — project operating document (Word/PDF) rolling up delivery health, operational attention, momentum, business outcome, milestones, and a Documentation updates segment.
- **Single source of truth** — milestone state + a project-level updates log lifted to the dashboard; edits persist across tab switches; logged updates flow into the operating document.
- **Attach update to milestone** — captured items become real tasks (Progress→Report/Done, Blocker→Blocker/In progress, Risk→Risk/To do); owner carries over.
- **Atlas flow completed** — "All quiet today" now logs a steady-state update; voice produces a transcript so the path reaches submit.
- `documentExport.ts` — shared doc/PDF generation + stylesheet.

---

## 2026-06-26 — Since last push (local, not yet committed/pushed)

### Opportunity Brief Workbench _(new module: `src/components/opportunity-brief/`)_
- Launched via **"New project"** in the dashboard header (App-level routing).
- **localStorage** persistence: multiple briefs (New / Clone / Resume / Delete), browser-stored OpenAI key, auto-save indicator, progress indicator. Markdown + PDF only (no JSON).
- **8 required sections**, data-driven (one component): toggleable supporting questions + example answers → **Synthesize** (OpenAI `gpt-5.4`, with a local fallback when no key) → editable answer + inferred **assumptions** → **Regenerate / Make more executive / Add more detail** → Save (progress advances).
- **Voice on every text area** — mic hidden until focus, pops in bottom-right, records → OpenAI Whisper → inserts transcript → auto-saves (simulated transcript without a key).
- **"I'm not sure — help me"** per section — uses everything captured so far to coach the user and offer a starting draft.
- **Final assembly** — LLM once-over, live Markdown preview, **Download Markdown**, **Create new doc** (opens the rendered brief in a new tab with a Print/Save-as-PDF control), **Back to dashboard**.

### Project Pulse — "AI project memory & alignment layer" _(new: `ProjectPulse.tsx`, `pulseData.ts`; Activity tab)_
- Positioning shift from "AI documentation assistant" → memory/alignment layer for any team.
- **Project-type toggle** (Technical / Non-technical) changes the activity sources.
- **Activity sources** set to the real stack: **GitHub** (code), **Tasks & Milestones** (Built in / native), **Google Calendar + Gemini transcripts** (meetings), **Google Drive** (documents), **Manual** (Tell Atlas).
- **Signal → summary → confirm flow** — seeded detections (e.g. farmflow-api · Sarah · 5 commits) show Atlas's proposed summary; **Confirm & log** commits structured entries to the timeline.
- **Pulse timeline** grouped into **Progress · Watching · Blockers · Next steps · Decisions** (colored SVG icons, no emoji), fed by confirmed signals + the Atlas chat.
- **Next steps** added as a 4th Atlas capture category (new "Plan next steps" chip; flows through tray, summary, milestone-attach, document).
- Atlas chat **moved to the app shell** so "Tell Atlas what changed" opens from any view.

---

## Open items / caveats

- **OpenAI:** model is hard-coded `gpt-5.4`; if unavailable it falls back to a local draft. No key = full demo via fallbacks.
- **Connectors** (GitHub, Calendar, Gemini, Drive) are visual/simulated; Pulse signals are seeded, not live.
- **State is in-memory** (except the Opportunity Brief, which uses localStorage); a refresh resets dashboard/pulse data.
- **Voice** in the dashboard chat is a simulated transcript; the Opportunity Brief uses real Whisper when a key is present.
- PDF/print uses the browser print dialog (no one-click PDF library yet).
- App forces `body { min-width }` → desktop-only; not yet responsive below that width.
