# PlayOverlay website

The marketing and docs site for [PlayOverlay](https://github.com/JosephMaynard/playoverlay), built
with Next.js (App Router) and Tailwind CSS. This is a standalone project living in a `website/`
subdirectory of the main PlayOverlay repo: it has its own `package.json`, its own dependencies,
and no code shared with (or imported from) the Electron app at the repo root.

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Run `npm run lint` and `npm run build`
before committing.

`npm run build` produces a standard Next.js build (not a static export), since this app may later
grow beyond a marketing site (accounts, a database, etc.) and Vercel's default Node.js runtime
keeps that door open.

## Pages

| Route | What it is |
| ----- | ---------- |
| `/` | Home: hero, how it works, features with screenshots, output options, FAQ, download call to action |
| `/download` | Fetches the latest GitHub release at request time (hourly ISR) and links straight to each platform's asset, falling back to the releases page if the API or an asset is missing. Also covers first launch of the unsigned builds |
| `/docs` | Guide overview, linking to every topic |
| `/docs/<slug>` | One page per guide topic: `getting-started`, `match-settings`, `running-a-match`, `screens`, `output-setup`, `phone-remote`, `shortcuts-and-stream-deck`, `languages`, `troubleshooting` |
| `/opengraph-image` | The social sharing image, generated with `ImageResponse` |
| `/sitemap.xml`, `/robots.txt` | Generated from `src/app/sitemap.ts` and `src/app/robots.ts` |

## Structure

```
src/
  app/
    layout.tsx            Root layout: fonts, metadata, header, footer, PostHog
    globals.css           Design tokens (light and dark), .prose-doc guide styles
    page.tsx              Home page, composed from components/home/*
    download/page.tsx
    docs/layout.tsx       Guide sidebar (desktop) and guide menu (mobile)
    docs/page.tsx         Guide overview
    docs/<slug>/page.tsx  One file per guide topic
    opengraph-image.tsx
  components/
    home/                 Home page sections
    docs/                 DocPage frame, sidebar list, mobile menu, Callout, Kbd
    image-slot.tsx        Image or labelled placeholder (see below)
    screenshot.tsx        The real app screenshots, via next/image
    site-header.tsx, site-footer.tsx, icons.tsx, code-block.tsx, ...
  lib/
    github.ts             Repo constants and release fetching
    docs-nav.ts           Guide pages: titles, intros, order, groups
    image-slots.ts        Every image slot: size, ratio, alt text
    site.ts               Site URL, name, Ko-fi link
    ui.ts                 Shared button and heading class strings
```

### Adding a guide page

Add an entry to `DOC_GROUPS` in `src/lib/docs-nav.ts` (slug, title, one-line
description), then create `src/app/docs/<slug>/page.tsx` using `DocPage` and
`docMetadata` like the existing pages. The sidebar, mobile menu, overview,
previous and next links, page title and sitemap all pick it up from the list.

### Colours

Navy (`#092049`) from the logo is the primary colour and green (`#2bb673`) is
the one accent, used sparingly. The other logo colours only appear together, as
the thin stripe at the foot of the page. Components use semantic Tailwind
colours (`bg-surface`, `text-muted`, `border-line`, `bg-primary`, ...) defined
as CSS variables in `globals.css`, which switch for dark mode via
`prefers-color-scheme`. Avoid raw Tailwind palette colours in components.

### GitHub links

Every GitHub URL is built from `REPO_OWNER` and `REPO_NAME` in
`src/lib/github.ts`. When the repo moves to the MagicZebraLtd organisation,
change those two constants and nothing else.

## Images

The three real screenshots live in `public/screenshots/` (shared with
`docs/screenshots/` in the main repo) and are rendered with `Screenshot`.

Everything else is an **image slot**: `<ImageSlot name="hero-match" />`. The
component checks for `public/images/<name>.<webp|avif|jpg|jpeg|png>` on the
server when the page renders, which for these static pages means at build
time. If the file exists it renders it with `next/image`, cropped to the slot's
aspect ratio. If not, it renders a striped placeholder showing the slot name,
size and ratio, so missing images are obvious and never break the layout.

[`IMAGES.md`](IMAGES.md) lists every slot with its size, what it should show,
and either a prompt for an AI image generator or instructions for capturing a
real screenshot. To fill a slot, save the file into `public/images/` with the
slot's name and rebuild. To add a slot, add it to `src/lib/image-slots.ts` and
to `IMAGES.md`.

## Writing style

Copy is British English, plain and specific. No exclamation marks and no em
dashes: use commas, colons or full stops. The main repo's
[`README.md`](../README.md) is the source of truth for how the app works; keep
the guide in step with it.

## Environment variables

Analytics are provided by [PostHog](https://posthog.com), configured to be cookieless (in-memory
persistence, no session recording). Initialization requires only the project key:

| Variable                   | Required | Description                                                                       |
| -------------------------- | -------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Yes      | Your PostHog project API key (a public token, not a secret). Leave unset to disable analytics. |
| `NEXT_PUBLIC_POSTHOG_HOST` | No       | Your PostHog ingestion host. Defaults to `https://us.i.posthog.com`; set it to `https://eu.i.posthog.com` for the EU region or your self-hosted URL. |

Analytics only run in a production deployment, and never in a Vercel preview, so a plain
`npm run dev` never sends events even with the key set. In Vercel, add the key (and optionally the
host) as project environment variables. `NEXT_PUBLIC_VERCEL_ENV` is provided automatically by
Vercel and is what keeps preview deployments dark.

## Deploying on Vercel

This site is meant to be deployed as its own Vercel project pointed at this repo, with:

- **Root Directory**: `website`
- **Ignored Build Step** (optional, to skip rebuilding on app-only commits):

  ```bash
  git diff --quiet HEAD^ HEAD -- .
  ```

  This tells Vercel to skip the build when nothing under `website/` changed in the last commit.
  (Vercel already scopes the working directory to `website/` for this check when Root Directory
  is set, so `.` refers to this folder.)

## Licence

PlayOverlay is open source under the MIT licence. The PlayOverlay name, logo, and branding are
owned by Magic Zebra Ltd and are not covered by the MIT licence.
