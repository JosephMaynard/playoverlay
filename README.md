# PlayOverlay

[![CI](https://github.com/JosephMaynard/playoverlay/actions/workflows/ci.yml/badge.svg)](https://github.com/JosephMaynard/playoverlay/actions/workflows/ci.yml)

**PlayOverlay** is a free desktop app for adding live score and match-clock graphics to sports video streams — built for streaming community football (soccer) matches to YouTube, and usable for any stream where you key graphics over a live feed.

It renders a broadcast-style score bug, match clock, penalty shootout tracker, and custom graphics on a solid-colour background (green screen by default). Feed that output into a vision mixer or capture device — for example a Blackmagic ATEM Mini — key out the background, and composite it over your camera feed before streaming.

## How it works

PlayOverlay runs two windows:

- **Control window** — the dashboard where the operator updates scores, runs the match clock, tracks penalties, and switches screens.
- **Display window** — a clean, fullscreen output showing the graphics on your chosen key colour. Put this on a second display connected to your mixer (e.g. via HDMI into an ATEM input), then chroma key it over the match feed.

If you're streaming through OBS instead of a hardware mixer, you can skip the second display and chroma key entirely — see [OBS browser source](#obs-browser-source) below.

## Features

- **Score bug** with team abbreviations, optional team logos, live scores, match clock, and stoppage time
- **Match clock** driven by the system clock (no drift over a half), with pause/resume and quick time adjustments
- **Crash recovery** — the score, clock, and match state are saved continuously; if the app closes mid-match you can restore where you left off
- **Match phases** — first/second half with configurable half lengths, and extra time that can be toggled off per match
- **Generic timer mode** — for sports that aren't halves-based, switch the timer to a configurable number of named periods (e.g. 4 × 12-minute quarters)
- **Penalty shootout tracker** — alternates teams automatically, records scored/missed, supports undo, and can be toggled off for matches that don't need it
- **Screens** — match title, score bug, penalties, end screen, plus your own uploaded full-screen graphics and overlay images linked to specific screens
- **Custom key colour** for whatever your mixer keys best
- **OBS browser source output** — an optional local server that serves the display graphics with a transparent background, so OBS users don't need a chroma key at all
- **Keyboard shortcuts** and **Elgato Stream Deck** support for goals, phase changes, and screen switching
- **Saved match settings** — store team line-ups/colours and reload them per fixture
- Multi-monitor aware: move the display window between screens, lock windows always-on-top, keep the machine awake while live

## Download

Grab the latest release from the [Releases page](https://github.com/JosephMaynard/playoverlay/releases):

| Platform | File |
| --- | --- |
| Windows | `playoverlay-…Setup.exe` |
| macOS (Apple Silicon) | `playoverlay-darwin-arm64-….zip` |
| macOS (Intel) | `playoverlay-darwin-x64-….zip` |

### A note on unsigned builds

The binaries are **not code-signed or notarized** (signing certificates cost money and this is a free project), so your OS will warn you on first launch:

- **Windows**: SmartScreen may show "Windows protected your PC" — click **More info**, then **Run anyway**.
- **macOS**: after unzipping, move `PlayOverlay.app` to Applications. If macOS reports the app is damaged or from an unidentified developer, clear the quarantine flag once from Terminal:

  ```bash
  xattr -cr /Applications/PlayOverlay.app
  ```

If you'd rather not trust an unsigned binary, build it yourself from source — see [Building from source](#building-from-source) below.

## Using it

1. Open **Match Settings** and set team names, abbreviations, colours, and logos, plus the venue, kick-off time, and half lengths. This is also where you choose between the football timer and generic periods, and toggle extra time and penalties for the match.
2. In **Window Settings**, pick your key colour and whether screens auto-switch on phase changes.
3. Move the display window to the output monitor and make it fullscreen.
4. Kick off: start the first half, add goals as they happen, add stoppage time, advance phases.

### Keyboard shortcuts

While PlayOverlay is focused, by default:

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl+Shift+Space` | Next match phase |
| `Cmd/Ctrl+Shift+H` | Home team scored |
| `Cmd/Ctrl+Shift+A` | Away team scored |

The same actions are also available system-wide (they work while OBS or your mixer software is focused) with `Alt` added, e.g. `Cmd/Ctrl+Alt+Shift+H` — unless the shortcut you've bound already includes `Alt`, in which case there's no separate system-wide variant.

These are rebindable: open **Window Settings → Keyboard Shortcuts**, click **Change** next to an action, then press the new key combination (a modifier other than Shift is required). **Reset** restores that action's default.

### Stream Deck

Connect an Elgato Stream Deck from **System Settings → Connect to Stream Deck**. The deck shows rotating button sets for scoring, match phases, and screen switching; the logo key cycles between sets. (Uses WebHID — close any other software that's holding the deck, including the official Stream Deck app.)

### OBS browser source

Off by default. If you'd rather not manage a second display and chroma key, PlayOverlay can serve the display graphics directly as an OBS Browser Source, with a transparent background instead of a key colour:

1. Open **Window Settings → OBS Browser Source** and switch it on (default port `4750`).
2. In OBS, add a **Browser Source** pointed at the URL shown there (`http://127.0.0.1:<port>/`), sized to your canvas resolution.
3. That's it — no chroma key needed, since the page background is transparent.

The server only listens on `127.0.0.1` (never reachable from the network) and stays off unless you enable it, so nothing changes for anyone who doesn't use it. It updates live over a local WebSocket connection and reconnects automatically if OBS is closed or the app restarts mid-stream.

#### Pinned views

Add `?screen=<name>` to the browser source URL to pin that page to a specific screen, regardless of what the operator currently has selected on the display. This lets you run the normal feed into OBS while a venue TV (or a second OBS scene) shows something else — e.g. the spectator scoreboard — from the same running app, both fed by the same local server.

| `?screen=` value | Shows                    |
| ---------------- | ------------------------- |
| _(none)_          | Follows the operator (default) |
| `matchTitle`      | Match title screen        |
| `scoreBug`        | Score bug                 |
| `penalties`       | Penalties screen           |
| `endScreen`       | End screen                 |
| `scoreboard`       | Spectator scoreboard       |

**Window Settings → OBS Browser Source** shows a ready-made copyable URL for the scoreboard view. An unrecognised or missing value falls back to following the operator.

## Updates

On launch the app checks this repository's GitHub Releases for a newer version and shows a notification with a download link. Nothing is downloaded or installed automatically.

## Building from source

Prerequisites: [Node.js](https://nodejs.org) 22.13+ (or 24+) and npm.

```bash
git clone https://github.com/JosephMaynard/playoverlay.git
cd playoverlay
npm install
npm start          # run in development
```

Package distributables for your current platform:

```bash
npm run make
```

Cross-build for Intel from an Apple Silicon Mac (or vice versa):

```bash
npm run make -- --arch=x64    # or --arch=arm64
```

Type-check with `npm run ts-check`, lint with `npm run lint`, run the test
suite with `npm test`, and generate coverage with `npm run test:coverage`.
The CI-only package sanity check is `npm run build:ci`; use `npm run make` to
produce distributables.

Tagged releases (`v*`) are built automatically for Windows and both macOS architectures by the [release workflow](.github/workflows/release.yml) and attached to a draft GitHub release.

## Privacy and telemetry

PlayOverlay does not include telemetry or crash reporting. The only network request a default build makes is the update check against the public GitHub API.

## Settings storage

Settings are stored with [electron-store](https://github.com/sindresorhus/electron-store) in `config.json`:

- **Windows**: `%APPDATA%/playoverlay`
- **macOS**: `~/Library/Application Support/playoverlay`
- **Linux**: `$XDG_CONFIG_HOME` or `~/.config/playoverlay`

Uploaded images live in an `images` folder alongside it.

## Contributing

Issues and pull requests are welcome. Before opening a PR, please run
`npm run lint`, `npm run ts-check`, and `npm test`, then describe how you tested the change
(this app's job is to not fall over mid-match, so reliability fixes are
especially appreciated).

## Source availability and licence

PlayOverlay is **source-available**, not Open Source as defined by the Open Source Initiative. You are welcome to inspect the code, report bugs, and submit pull requests.

PlayOverlay is free to use for anything, **including commercial streaming work**. You may not sell the software itself or redistribute it under a different name or brand. See [LICENSE](LICENSE) for the exact terms (MIT with the Commons Clause and a branding condition).
