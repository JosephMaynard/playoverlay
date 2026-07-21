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

Then open [http://localhost:3000](http://localhost:3000). Pages:

- `/` - landing page
- `/download` - fetches the latest GitHub release at request time (with hourly ISR) and links
  straight to each platform's asset on GitHub
- `/docs` - getting-started guide, sourced from the main repo's README

`npm run build` produces a standard Next.js build (not a static export), since this app may later
grow beyond a marketing site (accounts, a database, etc.) and Vercel's default Node.js runtime
keeps that door open.

## Environment variables

Analytics are provided by [PostHog](https://posthog.com), configured to be cookieless (in-memory
persistence, no session recording) and to skip initialization entirely unless both of these are
set:

| Variable                    | Description                                          |
| ---------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Your PostHog project API key. Leave blank to disable. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Your PostHog ingestion host, e.g. `https://us.i.posthog.com`. |

Copy `.env.example` to `.env.local` and fill these in if you want analytics locally (analytics
also require `NODE_ENV=production`, so a plain `npm run dev` never sends events even with the key
set). In Vercel, add both as project environment variables.

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

## Content

Copy on the landing and docs pages is adapted from the main repo's [`README.md`](../README.md).
The three screenshots in `public/screenshots/` are shared with `docs/screenshots/` in the main
repo.

PlayOverlay is open source under the MIT licence. The PlayOverlay name, logo, and branding are
owned by Magic Zebra Ltd and are not covered by the MIT licence.
