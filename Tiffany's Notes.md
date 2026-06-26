# Tiffany's Notes

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
