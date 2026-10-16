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
    alt: "A laptop running PlayOverlay connected by HDMI to a Blackmagic ATEM Mini, with a camera on a tripod beside the pitch",
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
    alt: "An Elgato Stream Deck next to a laptop running PlayOverlay, with scoring and screen buttons lit",
    summary: "Stream Deck beside the laptop on the operator's table",
  },
  "obs-browser-source": {
    width: 1920,
    height: 1200,
    ratio: "16:10",
    alt: "OBS Studio with a Browser Source pointed at PlayOverlay, the score bug showing over the camera scene",
    summary: "Screenshot: OBS with the PlayOverlay browser source added",
  },
  "match-settings": {
    width: 1600,
    height: 1200,
    ratio: "4:3",
    alt: "The PlayOverlay Match Settings panel with team names, colours, logos and match details filled in",
    summary: "Screenshot: the Match Settings panel, filled in",
  },
  "screen-match-title": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The PlayOverlay match title screen showing both teams, the venue and the kick-off time",
    summary: "Screenshot: the match title screen on the display output",
  },
  "screen-goal-banner": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The PlayOverlay goal banner on air, showing the scoring team and the minute",
    summary: "Screenshot: the goal banner on the display output",
  },
  "screen-end-screen": {
    width: 2560,
    height: 1440,
    ratio: "16:9",
    alt: "The PlayOverlay end screen showing the final score and each team's scorers with their minutes",
    summary: "Screenshot: the end screen with scorers listed",
  },
} satisfies Record<string, ImageSlotDefinition>;

export type ImageSlotName = keyof typeof IMAGE_SLOTS;
