// The real screenshots, imported statically so next/image knows their size
// and can generate a blur placeholder. Shared with docs/screenshots/ in the
// main repo.
import dashboard from "../../public/screenshots/dashboard.png";
import scoreBug from "../../public/screenshots/score-bug.png";
import scoreboard from "../../public/screenshots/scoreboard.png";

export const SCREENSHOTS = {
  dashboard: {
    src: dashboard,
    alt: "The PlayOverlay dashboard: a preview of the output, screen buttons, the match clock with phase buttons, both teams' scores and the penalties panel",
  },
  scoreBug: {
    src: scoreBug,
    alt: "The display output: a score bug reading WIN 2-1 ROM with the clock at 2:42, in the top-left of a solid blue key-colour background",
  },
  scoreboard: {
    src: scoreboard,
    alt: "The spectator scoreboard: Winchester F.C. 2 and Romsey United 1 in their club colours, with the time of day and the match clock",
  },
} as const;

export type ScreenshotName = keyof typeof SCREENSHOTS;
