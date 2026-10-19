// Every image slot on the site. A slot renders public/images/<name>.<ext>
// when that file exists at build time, and a labelled placeholder otherwise.
// IMAGES.md (in the website root) describes each slot in full, with a prompt
// or capture instructions. Keep the two in step when adding a slot.

export interface ImageSlotDefinition {
  /** Intended pixel size of the finished image. Sets the aspect ratio. */
  width: number;
  height: number;
  /** Human-readable ratio for the placeholder, e.g. "16:9". */
  ratio: string;
  /** Alt text used once the real image is in place. */
  alt: string;
  /** One line shown on the placeholder so it's clear what goes here. */
  summary: string;
}

export const IMAGE_SLOTS = {
  "hero-match": {
    width: 2400,
    height: 1350,
    ratio: "16:9",
    alt: "A grassroots football match on a stream, with the PlayOverlay score bug and match clock in the top-left corner",
    summary: "Match footage with the real score bug keyed over the top-left corner",
  },
  "setup-atem": {
    width: 1600,
    height: 1200,
    ratio: "4:3",
    alt: "A laptop running PlayOverlay beside a compact HDMI video switcher, with a camera on a tripod beside the pitch",
    summary: "Laptop, ATEM Mini and camera on a pitchside table",
  },
  "phone-remote": {
    width: 1200,
    height: 1500,
    ratio: "4:5",
    alt: "A hand holding a phone at the touchline, showing the PlayOverlay phone remote with the score and clock",
    summary: "Phone remote in hand at the touchline",
  },
  "venue-scoreboard": {
    width: 1920,
    height: 1080,
    ratio: "16:9",
    alt: "A TV in a clubhouse showing the PlayOverlay spectator scoreboard with both teams, the score and the time",
    summary: "Clubhouse TV showing the spectator scoreboard",
  },
  "stream-deck": {
    width: 1600,
    height: 1200,
    ratio: "4:3",
    alt: "A fifteen-key control pad with coloured keys next to a laptop running PlayOverlay on a pitchside table",
    summary: "Stream Deck beside the laptop on the operator's table",
  },
  "obs-browser-source": {
    width: 1920,
    height: 1200,
    ratio: "16:10",
    alt: "OBS Studio with a Browser Source pointed at PlayOverlay, the score bug showing over a demo match image",
    summary: "Screenshot: OBS with the PlayOverlay browser source added",
  },
  "match-settings": {
    width: 1600,
    height: 1000,
    ratio: "16:10",
    alt: "The Match Settings panel open beside the dashboard, showing the home team's line-up of numbered players, each with a Starts box, and the Add player and Paste a list buttons",
    summary: "Screenshot: the Match Settings panel with a team's line-up",
  },
  "screen-match-title": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The match title screen: the venue, Kick-off 18:20 and Starts in 41:18 above Winchester F.C. and Romsey United in their club colours",
    summary: "Screenshot: the match title screen on the display output",
  },
  "screen-goal-banner": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The display output with the score bug reading WIN 2-1 ROM at 63:12 and a goal banner reading GOAL, Winchester F.C., 9 Ali Smith, 23'",
    summary: "Screenshot: the goal banner on the display output",
  },
  "screen-end-screen": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The end screen: Winchester F.C. 2-1 Romsey United, with Ali Smith 23', 62' under the home team and Tom Baker 39' under the away team",
    summary: "Screenshot: the end screen with scorers listed",
  },
  "screen-home-lineup": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The Home Line-up screen: Winchester F.C. above eleven players on the pitch, each with a shirt number in the club's red, and a smaller Bench group of three beneath",
    summary: "Screenshot: the home line-up screen on the display output",
  },
  "screen-away-lineup": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The Away Line-up screen: Romsey United above eleven players in one column, each with a shirt number in the club's blue",
    summary: "Screenshot: the away line-up screen on the display output",
  },
  "scorer-picker": {
    width: 1600,
    height: 1000,
    ratio: "16:10",
    alt: "The Who scored? question over the dashboard after a Winchester goal: the players on the pitch as large tiles, the bench beneath, and Not a goal, Own goal and No scorer buttons",
    summary: "Screenshot: the scorer question after a goal key is tapped",
  },
  "substitution-modal": {
    width: 1600,
    height: 1000,
    ratio: "16:10",
    alt: "The substitution picker over the dashboard: Coming off 10 Marcus Lane, Coming on 16 Nathan Brooks chosen from the bench, with Confirm substitution lit green",
    summary: "Screenshot: a substitution with both players chosen",
  },
  "screen-substitution-banner": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The display output with the score bug and a substitution banner reading SUB, Winchester F.C., 16 Nathan Brooks on, 10 Marcus Lane off, 64'",
    summary: "Screenshot: the substitution banner on the display output",
  },
  "rotation-panel": {
    width: 1600,
    height: 1000,
    ratio: "16:10",
    alt: "The Rotate screens set-up over the dashboard: the screens to show ticked in rotation order, seconds per screen and the half-time start",
    summary: "Screenshot: the Rotate screens set-up on the dashboard",
  },
} satisfies Record<string, ImageSlotDefinition>;

export type ImageSlotName = keyof typeof IMAGE_SLOTS;
