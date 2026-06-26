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
- Assignee cells open a staff dropdown with Tiffany Tomlin, Erinski Easy, and Mikale Meetoo, supporting multiple assignees and grouped labels.
- Added clickable due date cells for milestones and tasks, opening a native date picker and updating the displayed due date.
- Added clickable status controls for milestones and tasks.
- Milestone statuses can be changed between Completed, In progress, and Not started.
- Task statuses can be changed between To do, In progress, and Done.
- Due date controls now focus and request the browser calendar picker when opened.
- Added an overview page action matching the blue Add milestone button style.
- Overview action says Update project documentation and opens a documentation chat window.
- Documentation chat opens with the prompt Update me on the project and closes on Escape.
- Reworked the documentation chat into a centered glass modal with a blurred backdrop.
- Documentation chat now opens to an empty Tell Me About The Project state.
- Sending a message adds the context bubble, Today divider, user message, and a simulated project-log reply.
- Documentation chat composer supports Enter to send and Shift+Enter for a newline.
- Added a gear button to the documentation chat header that switches into an intake configuration panel.
- Intake configuration supports reusable question sets with target question, good-answer criteria, and example answer fields.
- Added config behavior: saved question sets affect the simulated chat response without adding real LLM processing.
- Added a hover-only trash action to each chat configuration question set for removing that question set.
- Added a larger T.A.C Certified badge with a check mark beside the Overview page title.

## 2026-06-26

- The Overview page's Share a project update flow now uses the Atlas chat as the intake point for today's written check-in.
- When Atlas logs an update, the same captured entries are also handed to today's reporting state as a filed report.
- Atlas stores a report Summary from the user's chat messages, then keeps captured Progress, Blocker, Risk, and Owner fields as supporting report details.
- The logged-state confirmation now tells the user that both Overview and Reporting reflect the update.
