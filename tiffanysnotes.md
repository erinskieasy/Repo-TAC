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

### Light/dark theme system + light-default redesign _(new: `src/theme.ts`; `styles.css` retokenized)_
- **Whole app restyled** to a clean/minimal SaaS look (Linear / Notion / Vercel): off-white page, white cards, thin borders, near-invisible shadows, big bold editorial H1, pill buttons/inputs, **color reserved for meaning only** (amber = warning, green = success, blue = data). Primary action buttons are dark navy `#1A2030` in light mode.
- **Semantic CSS token layer** — every color in `styles.css` now resolves to a variable. `:root` holds the **light** theme (the new default); `:root[data-theme="dark"]` overrides preserve the original dark look. ~300 hardcoded colors were converted to tokens (`--surface`, `--text`, `--border`, `--accent`, `--blue`, `--green`, `--amber`, `--rose`, `--scrim`, …). **Rule going forward: no raw hex — always use a token** so both themes stay correct.
- **Working light/dark toggle** — `useTheme` hook in `theme.ts`, persisted to `localStorage` (`tac-theme`), applied as `data-theme` on `<html>` and seeded before first paint (no flash). Toggle buttons live in the dashboard header (moon/sun) and the Opportunity Brief top bar + rail.

### Opportunity Brief — scroll & auto-expanding fields
- **Page scroll fix** — `body` had `overflow-y: hidden`, so once a section filled past the viewport the bottom was unreachable. The workbench is now pinned to viewport height with internal scroll on the editor body, brief list, and rail.
- **Auto-growing text areas** — every `VoiceTextArea` now expands to fit its content (and shrinks back), so long answers no longer hide behind a tiny inner scrollbar.

### T.A.C Certified → a real, monitored certification _(new: `certification.ts`, `CertificationBadge.tsx`)_
- The hardcoded "T.A.C Certified" badge is now **live**. A rubric is recomputed from dashboard state — **Evidence current** (update logged ≤ 7 days), **Outcome & health** (business outcome defined + health ≥ 70%), **Ownership & blockers** (every milestone owned + blockers acknowledged).
- **Auto + manual** — once the rubric passes the badge reads "Ready to certify"; a lead clicks **Certify** (records *certified by / on*). Certification **expires weekly** (Expiring state) and **auto-lapses** if a criterion regresses.
- Click the badge → a panel showing each check pass/fail with a "fix it" deep-link; sign-off persists in localStorage (`tac.certification:<project>`).

### Overview build-out
- **Business Outcome is editable** — an Edit/Done toggle turns the title, prompt, and four columns into inline fields; persists per project (`tac.businessOutcome:`).
- **Delivery Health is functional** — the score is **computed from milestone task completion** (not a static 50), status auto-derives (Behind / On track / Healthy), and the 7-day chart plots a **real series** ending at the live score (tone-colored, accumulates over time). Live health feeds the certification rubric. _(new: `overview.ts`)_
- **Commit cadence** card — last-7-day daily-commit record + streak + last commit, from the GitHub connection in Activity. _(new: `CommitCadence.tsx`)_
- **Most Active leaderboard** — ranks the team by activity (owned/done tasks, milestones owned, reports filed). Styled as a sports-graphic (big number, diagonal green→**blue/orange** name banner, fake headshot photos via `randomuser.me`). _(new: `TeamLeaderboard.tsx`)_
- **To-do · Up next** card — auto-populates from milestone task due dates (soonest first, overdue/today/upcoming tones); checking an item completes the task. _(new: `TodoList.tsx`)_
- Commit cadence + leaderboard + to-do share one aligned utility row under the Overview cards.

### Cadence tab → calendar of sprint reviews / meetings _(new: `cadence.ts`, `CadenceSection.tsx`, `VoiceoverRecorder.tsx`, `CommitCadence.tsx`)_
- The dead **Cadence** tab is now a **month / week calendar of meetings**. "New cadence" creates a recurring series with a **meeting-type preset** (Sprint Review, Daily Standup, Sprint Planning, Retro, 1:1, Demo, All-hands…) and frequency (Daily/Weekly/Biweekly/Monthly); **multiple cadences coexist**. "Log past meeting" back-dates a one-off.
- Click a meeting → a detail modal: **attendance**, **decisions/notes**, **action items** (attachable to milestones), status (Upcoming/Due/Completed/Missed, auto from date, drives the tab badge), **Add to calendar** (real `.ics`), and a **review packet** (Word/PDF).
- **Weekly demonstration** — each meeting records a **voiceover** (mic → Whisper transcript, in-session playback; transcript is the saved deliverable). Surfaced in the **Reporting** tab as a "Weekly Demonstrations" panel (submitted vs missing + packet).

### Project Pulse tidy-up
- Removed the **Meetings** activity source + its seeded signal (meetings now live in the Cadence tab).
- Bumped ~15 small font sizes on the Pulse page for legibility.

### Executive Dashboard _(new module: `src/components/executive/`)_
- New **top-level view** reached via a **blue icon in the left sidebar** (`App.tsx` adds an `"executive"` view). A portfolio summary across **6 mock projects** (varied health, activity, certification, leads with photos).
- **Momentum / "wellness" layout**: greeting header + avatar, a **Portfolio Health hero** (big %, week-over-week delta, smooth area chart, "Great momentum!" badge, 2×2 stats), a **Momentum / Biggest Win / Focus** row, **Projects Overview** + **Most Active This Week** lists, and an encouragement banner + certifications card.
- **Executive metrics** rolled up: Needs-attention (Behind / blocked / stale), health trend **▲/▼**, and a **certification breakdown** (ready · expiring · lapsed).
- Palette is **blue + orange (no green)**; added theme-aware `--orange` / `--orange-bg` tokens. All data-driven and works light + dark.

---

## Open items / caveats

- **OpenAI:** model is hard-coded `gpt-5.4`; if unavailable it falls back to a local draft. No key = full demo via fallbacks.
- **Connectors** (GitHub real via PAT; Calendar/Gemini/Drive visual/simulated); Pulse signals are seeded, not live.
- **Persistence** — these now survive refresh via localStorage: Opportunity Briefs, theme, certification sign-off, business outcome, health trend, and the cadence (series + meetings). The rest of the dashboard/pulse state is still in-memory and resets on refresh.
- **Voice** — dashboard chat uses a simulated transcript; the Opportunity Brief and the cadence **voiceover** use real Whisper when a key is present. Voiceover **audio is session-only** (the transcript is the saved deliverable).
- **Executive Dashboard** uses **6 mock projects** (not the live T.A.C); its extra rail icons and the "View all / See all / Review now" links are visual for now.
- PDF/print uses the browser print dialog (no one-click PDF library yet).
Running summary of product/interface changes made in this repo.

---

## Documentation chat → "Atlas" assistant (Overview page)

The "Update project documentation" button opens a chat modal driven by an assistant named **Atlas**. Built up from a plain text box into a guided check-in:

- **Accessibility hardening** — `role="dialog"` + `aria-modal`, focus moves into the dialog and traps, Escape + backdrop close, focus restores to the trigger on close, background scroll lock, visible focus rings, 44px touch targets, `100dvh` sizing.
- **Warm opening** — replaced the blank "Tell Me About The Project" watermark with a time-aware greeting that references last week's thread ("…you flagged the API migration was blocked — did that clear up?").
- **Quick-start chips** — Report progress · Share a blocker · Flag a risk, each pre-fills the composer; plus **All quiet today** (one-tap steady-state log).
- **Reflect-back replies** — Atlas mirrors what you said and asks one gentle follow-up; tone adapts to effort. Includes a **typing indicator** so it feels alive.
- **CAPTURING tray** — live tags (Progress · Blocker · Risk) fill in as you talk.
- **Voice input (prototype)** — mic button with a recording pulse; stopping drops a simulated transcript into the composer (no real speech-to-text yet).
- **Owner picker** — when Atlas asks "who owns it?", switch through the project team roster (Tiffany, Erinski, Mikale).
- **Summary card + done moment** — recap of captured items, "Log it" confirm, green checkmark flourish.
- All motion respects `prefers-reduced-motion`.

## Milestones — Generate Report

- **Generate report** button (next to Add milestone) opens a modal summarizing milestone progress: completion stats, plus each milestone's completed (✓) and still-open tasks.
- Export options: **Copy as text**, **Word (.doc)**, **PDF** (print-to-PDF).
- Reflects live edits (mark a task Done → report updates).

## Project header — Download operating document

- **Download ▾** menu in the project hero (above the Overview/Team/Milestones tab bar), available from any tab.
- Generates a **project operating document** (Word/PDF) rolling up: delivery health, operational attention, momentum, business outcome, milestones, and a **Documentation updates** segment.

## Cross-cutting: single source of truth

- Milestone state and a project-level **updates log** were lifted to the dashboard so every surface stays in sync. Milestone edits now persist across tab switches.
- Logging an update in the Atlas chat records it to the shared updates log → appears in the downloadable operating document.
- **Attach to milestone** — when logging an update, pick a milestone and the captured items become real tasks on it:
  - Progress → **Report** task (Done)
  - Blocker → **Blocker** task (In progress, High)
  - Risk → **Risk** task (To do)
  - Owner carries over from the owner picker.
- Team roster shared via `teamMembers` (tacData.ts) — used by both the milestone assignee picker and the Atlas owner picker.

## Shared utilities

- `documentExport.ts` — shared doc/PDF generation + stylesheet used by both the milestone report and the operating-document download.

---

## Open items / decisions pending

- Voice is visual-only (simulated transcript) — no real speech-to-text.
- All state is in-memory; a page refresh resets it (no backend/localStorage yet).
- Attaching an update to a milestone is optional (can log a "general" update).
- PDF uses the browser print-to-PDF dialog rather than a one-click file (would need a library like jsPDF).
- App forces `body { min-width }` → desktop-only; not yet responsive below that width.
