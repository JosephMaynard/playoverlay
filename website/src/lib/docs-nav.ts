// The guide's structure: one route per topic under /docs/<slug>. The sidebar,
// the mobile menu, the /docs index, page titles and the previous/next links
// all read from here, so adding a page means adding it here and creating
// src/app/docs/<slug>/page.tsx.

export interface DocPageInfo {
  slug: string;
  title: string;
  /** One or two sentences: the page intro and its meta description. */
  description: string;
}

export interface DocGroup {
  title: string;
  pages: DocPageInfo[];
}

export const DOC_GROUPS: DocGroup[] = [
  {
    title: "Start here",
    pages: [
      {
        slug: "getting-started",
        title: "Getting started",
        description:
          "Install PlayOverlay, learn what its two windows do, and get a first match on screen in about five minutes.",
      },
    ],
  },
  {
    title: "Using PlayOverlay",
    pages: [
      {
        slug: "match-settings",
        title: "Match settings and club presets",
        description:
          "Set up the teams, colours, logos and match details, save clubs you play often, and store whole fixtures to reload later.",
      },
      {
        slug: "running-a-match",
        title: "Running a match",
        description:
          "The clock, match phases, stoppage time, goals and scorers, the goal banner, undo and redo, starting a new match, and what happens if the app closes mid-match.",
      },
      {
        slug: "line-ups",
        title: "Line-ups",
        description:
          "Enter or paste each team's players, pick goal scorers from the squad, put a line-up on air, and let the display rotate through screens by itself before kick-off and at half-time.",
      },
      {
        slug: "screens",
        title: "Screens and graphics",
        description:
          "Every graphic PlayOverlay can put on air, when to use each one, how to add your own images, and how to choose a key colour.",
      },
      {
        slug: "output-setup",
        title: "Output setup",
        description:
          "Three ways to get the graphics out: chroma key over HDMI into an ATEM Mini or similar mixer, a browser source in OBS, or a scoreboard on a venue screen.",
      },
      {
        slug: "phone-remote",
        title: "Phone remote",
        description:
          "Run goals, the clock and the on-air screen from a phone on the same wifi, so you can stand at the touchline instead of behind the laptop.",
      },
      {
        slug: "shortcuts-and-stream-deck",
        title: "Keyboard shortcuts and Stream Deck",
        description:
          "Score goals and change phases without the mouse, including while OBS or your mixer software has focus, and connect an Elgato Stream Deck.",
      },
      {
        slug: "languages",
        title: "Languages",
        description:
          "PlayOverlay's dashboard and on-air graphics come in eight languages. Here is how to choose one and what does and doesn't get translated.",
      },
    ],
  },
  {
    title: "Help",
    pages: [
      {
        slug: "troubleshooting",
        title: "Troubleshooting",
        description:
          "Fixes for the common problems: first-launch security warnings, a Stream Deck that won't connect, a phone that can't reach the remote, and how to send a diagnostics report.",
      },
    ],
  },
];

export const DOC_PAGES: DocPageInfo[] = DOC_GROUPS.flatMap((group) => group.pages);

export function docHref(slug: string): string {
  return `/docs/${slug}`;
}

export function getDocPage(slug: string): DocPageInfo {
  const page = DOC_PAGES.find((candidate) => candidate.slug === slug);
  if (!page) throw new Error(`Unknown docs page: ${slug}`);
  return page;
}

export function getDocGroupTitle(slug: string): string | undefined {
  return DOC_GROUPS.find((group) => group.pages.some((page) => page.slug === slug))?.title;
}

export function getDocNeighbours(slug: string): {
  previous?: DocPageInfo;
  next?: DocPageInfo;
} {
  const index = DOC_PAGES.findIndex((page) => page.slug === slug);
  return {
    previous: index > 0 ? DOC_PAGES[index - 1] : undefined,
    next: index >= 0 && index < DOC_PAGES.length - 1 ? DOC_PAGES[index + 1] : undefined,
  };
}
