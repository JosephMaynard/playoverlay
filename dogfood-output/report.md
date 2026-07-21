# PlayOverlay runtime dogfood notes

Date: 2026-07-21  
Build: v0.18.0 development build

## Issue: minimum window size leaves too little room for live controls

- Severity: Medium
- Area: Dashboard / responsive layout
- At the declared 700 × 500 minimum window size, the fixed 16:9 output preview and header consume most of the viewport. Only a narrow strip of the match controls remains visible, so operating the clock, scores, and penalties requires repeated scrolling. Automated scrolling also brought controls underneath the preview, which is consistent with the preview competing with the scrollable control region.
- Expected: the core live controls remain comfortably usable at the supported minimum size.
- Suggested fix: make the preview collapsible or resizable, reduce its minimum height at compact breakpoints, or move it out of the fixed/sticky layer below a height breakpoint.
- Evidence: `dogfood-output/screenshots/minimum-window.png`

## Pass notes

- The Scoreboard display rendered cleanly at a wide desktop size with team colours, long team names, time of day, match clock, and score all legible.
- Switching between Score Bug and Scoreboard updated the display window immediately.
- The primary dashboard controls, dialogs, collapsible sections, and switches were keyboard/automation discoverable.
- No runtime exception was observed during the exercised dashboard, display, System Settings, and language-picker flows.

Evidence:

- `dogfood-output/screenshots/dashboard-scoreboard-wide.png`
- `dogfood-output/screenshots/scoreboard-display-wide.png`
