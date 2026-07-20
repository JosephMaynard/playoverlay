# Contributing

Thanks for taking a look at PlayOverlay. It's a small project, so this is short.

## Dev setup

Requires Node 22.13+ (or 24+).

```bash
npm install
npm start
```

`npm start` launches the app via `electron-forge start` with the control window and display window both running.

## Before opening a PR

Run all three checks locally — CI runs the same commands and will fail the build otherwise:

```bash
npm run ts-check
npm run lint
npm test
```

## House rules

- **Behavior-preserving defaults.** This app is used to run live sports streams, often mid-match. Any change to stored config (`config.json`) must be additive: new fields are optional, and existing saved matches load and behave exactly as before. Never change what an existing config produces.
- **Tests for logic.** New pure logic (clock math, phase transitions, parsing/formatting helpers, etc.) needs focused tests. Don't weaken or delete existing tests to make a change pass.
- **Don't crash mid-match.** Prefer graceful fallbacks over throwing. A broken control window or display window during a live stream is the worst possible failure mode for this app.
- **Match the existing style.** Look at neighbouring components before adding new patterns — state flows through zustand and IPC in a consistent way, and UI is built from the existing shared components (`SideMenu`, `CollapsiblePanel`, `ButtonGrid`, etc.) with Tailwind.

## PR guidance

- Keep PRs focused on one change.
- Describe what you tested and how (which checks you ran, and if applicable, that you exercised the change in a running app).
- Link any related issue.
