# PlayOverlay

**PlayOverlay** is a desktop Electron application used to overlay real-time graphics—such as score bugs and penalty indicators—onto live soccer match video streams. It's designed for use during local league matches, with a dual-window setup to enable professional-quality visuals on a second display connected via HDMI.

The graphics are keyed out using a solid color background and composited with the live feed using an external device like the Blackmagic ATEM Mini before being streamed to platforms like YouTube.

This repository is now distributed as a plain open source desktop app:

- No copy protection or licensing flow
- No activation or demo mode
- No bundled code obfuscation or V8 bytecode build step
- App signing and notarization are left to whoever packages the app

---

## Features

- Dual-window layout:
  - **Main Window**: Control panel for entering scores, penalties, and managing overlays.
  - **Display Window**: Fullscreen chroma-keyed output on a secondary display.
- Score bug with:
  - 3-letter team abbreviations
  - Live score updates
  - Match timer with stoppage time
- Penalty shootout tracking:
  - Automatically alternates between home/away
  - Supports scored/missed outcomes
  - Undo functionality to correct user mistakes
- Custom key color for external compositing
- Built with Electron + React + TypeScript

---

## Development

Install dependencies with:

```bash
npm install
```

Run the app in development with:

```bash
npm start
```

Type-check the project with:

```bash
npm run ts-check
```

### Build for Intel Mac on M1 Mac

Run:

```
npm run make -- --arch=x64
```

### Electron Store File Locations

- %APPDATA% on Windows
- $XDG_CONFIG_HOME or ~/.config on Linux
- ~/Library/Application Support/playoverlay/config.json on MacOS

## Packaging Notes

- Builds are produced with Electron Forge
- Code signing and notarization are not configured in this repository
- If you plan to distribute binaries, you will need to add your own platform-specific signing setup
