# GradTracker app — UI kit

A click-through recreation of the product's five real surfaces. Open `index.html`.

## Flow
1. **Connect** (`ConnectView.jsx`) — the Gmail-permission screen the student lands on. "Continue with Google" enters the app.
2. **Pipeline** (`PipelineView.jsx`) — stat strip, tabs, stage filter chips, and the ranked application table. Click a row to open the detail panel.
3. **Detail panel** (`DetailPanel.jsx`) — stage control, extracted fields with confidence meters, timeline, withdraw (opens the confirm dialog).
4. **Needs review** (`ReviewView.jsx`) — the AI queue: detected emails with per-field confidence; confirm, edit, or dismiss.
5. **Settings** (`SettingsView.jsx`) — Gmail connection, detection, reminders, profile.

`AppShell.jsx` owns navigation, the light/dark toggle (bottom-left in the sidebar), toasts, and the withdraw dialog. `data.jsx` holds the fake pipeline and review queue.

## Notes
- Every visual is composed from the design system's own components (`window.GradTrackerDesignSystem_*`) — nothing is re-implemented here.
- Calendar and Archive are deliberately blank: the brief defines no design for them.
- Company avatars are initial-in-a-square placeholders; no real company logos are used.
