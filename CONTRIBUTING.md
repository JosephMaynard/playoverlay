# Contributing

Thanks for taking a look at PlayOverlay. It's a small project, so this is short.

## Dev setup

Requires Node 22.13+ (or 24+).

```bash
npm install
npm start
```

`npm start` launches the app via `electron-forge start` with the control window and display window both running.

## Project layout

The repo is an npm workspace. The Electron app lives at the root, and the code that PlayOverlay's other apps (a mobile app, and later a web app) share with it lives in `packages/`:

- **`packages/core`** (`@playoverlay/core`): everything about a match that doesn't depend on the platform. Types, zod schemas, constants and utils, the goal log, the zustand stores and undo, the `useMatchClock` hook, the match actions (`createMatchActions`: goals, penalties, clock and phases, screen switches, restoring or starting a match), and every translation catalogue. It never touches Electron or `window.electronAPI` directly: the app connects the stores to IPC with `mirrorStores` and sets the undo log with `setMatchEventLogger` (see `src/electronBridge.ts`).
- **`packages/screens`** (`@playoverlay/screens`): the on-air graphics, as React DOM components that take everything as props.
- **The app (`src/`)**: the Electron main process, preload, the control window (dashboard and settings menus) and the display window, plus everything else that talks to Electron.

The packages ship TypeScript source with no build step, so Vite, vitest and the mobile app's Metro bundler all consume them directly. Inside a package, use relative imports only (Metro can't resolve the app's `src/...` paths). The main process and preload import core's pure modules by subpath (`@playoverlay/core/utils` and so on) rather than the package entry, so React and the stores stay out of the main bundle; ESLint enforces this.

A runtime dependency a package uses must also be listed in the root `package.json`: that is what the app is built from and what its bundled third-party notices are generated from.

## Before opening a PR

Run all three checks locally (they cover `packages/` as well as the app), CI runs the same commands and will fail the build otherwise:

```bash
npm run ts-check
npm run lint
npm test
```

## House rules

- **Behavior-preserving defaults.** This app is used to run live sports streams, often mid-match. Any change to stored config (`config.json`) must be additive: new fields are optional, and existing saved matches load and behave exactly as before. Never change what an existing config produces.
- **Tests for logic.** New pure logic (clock math, phase transitions, parsing/formatting helpers, etc.) needs focused tests. Don't weaken or delete existing tests to make a change pass.
- **Don't crash mid-match.** Prefer graceful fallbacks over throwing. A broken control window or display window during a live stream is the worst possible failure mode for this app.
- **Match the existing style.** Look at neighbouring components before adding new patterns, state flows through zustand and IPC in a consistent way, and UI is built from the existing shared components (`SideMenu`, `CollapsiblePanel`, `ButtonGrid`, etc.) with Tailwind.

## PR guidance

- Keep PRs focused on one change.
- Describe what you tested and how (which checks you ran, and if applicable, that you exercised the change in a running app).
- Link any related issue.

## Licensing of contributions

PlayOverlay is licensed under the [MIT License](LICENSE). By submitting a pull request, you agree that your contribution is licensed under the same MIT terms. Contributions do not grant any rights to the PlayOverlay name, logo, or branding, which are owned by Magic Zebra Ltd (see [TRADEMARKS.md](TRADEMARKS.md)).
