# Erinski's Notes

Running summary of product/interface changes made in this repo.

## 2026-06-25

- Added hover actions for milestone and task rows.
- Task rows now reveal a pencil button beside the task title for inline editing.
- Task rows now reveal a trash button at the far right for deleting the task.
- Milestone rows now reveal a pencil button beside the milestone title for inline editing.
- Milestone rows now reveal a trash button near the row actions for deleting the milestone.
- Edit and delete controls stop row click propagation, so using them does not expand or collapse milestones.
- Added clickable assignee cells for milestones and tasks.
- Assignee cells open a pseudo staff dropdown with Tiffany Tomblin, Erinski Easy, and Mikale Meetoo, supporting multiple assignees and grouped labels.
- Added clickable due date cells for milestones and tasks, opening a native date picker and updating the displayed due date.
- Added clickable status controls for milestones and tasks.
- Milestone statuses can be changed between Completed, In progress, and Not started.
- Task statuses can be changed between To do, In progress, and Done.
- Added outside-click dismissal for milestone/task popups and dropdowns.
- Due date controls now focus and request the browser calendar picker when opened.
- Added an overview page action matching the blue Add milestone button style.
- Overview action says Update project documentation and opens a documentation chat window.
- Documentation chat opens with the prompt Update me on the project and closes on outside click or Escape.
- Reworked the documentation chat into a centered glass modal with a blurred backdrop.
- Documentation chat now opens to an empty Tell Me About The Project state.
- Sending a message adds the context bubble, Today divider, user message, and a simulated project-log reply.
- Documentation chat composer supports Enter to send and Shift+Enter for a newline.
- Made the project header and project tab bar sticky so they remain visible while scrolling.
- Replaced sticky scrolling with an internal content scroll area so the project header, project tab bar, and left sidebar stay locked in place.
- Switched the UI font import from Inter to Geist Sans using the font-only package.
- Tuned task-row title, assignee, and due-date text to render at roughly the discovered 13px task-text size after app scaling.
- Reduced expanded milestone description, task title, assignee, date, chip, and status font weights so the task area no longer reads as bold.
- Added a gear button to the documentation chat header that switches into an intake configuration panel.
- Intake configuration supports reusable question sets with target question, good-answer criteria, and example answer fields.
- Added fake save/config behavior: saved question sets affect the simulated chat response without adding real LLM processing.
- Removed the AI intake flow column from the chat configuration panel, leaving only the question-set editor.
- Added a hover-only trash action to each chat configuration question set for removing that question set.
