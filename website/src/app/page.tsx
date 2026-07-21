import Image from "next/image";
import Link from "next/link";
import { REPO_URL } from "@/lib/github";

const FEATURES: { title: string; description: string }[] = [
  {
    title: "Score bug",
    description:
      "Team abbreviations, optional logos, live scores, match clock, and stoppage time, styled like a broadcast graphic.",
  },
  {
    title: "Match clock",
    description:
      "Driven by the system clock, so it never drifts over a half. Pause, resume, and adjust the time in a couple of clicks.",
  },
  {
    title: "Penalty shootout tracker",
    description:
      "Alternates teams automatically, records scored and missed attempts, supports undo, and can be switched off for matches that don't need it.",
  },
  {
    title: "Screens for every moment",
    description:
      "Match title, score bug, penalties, and end screen, plus a spectator scoreboard for a venue big screen, no chroma key required.",
  },
  {
    title: "OBS browser source",
    description:
      "Skip the second display and chroma key entirely: serve the graphics straight into OBS with a transparent background.",
  },
  {
    title: "Phone remote (LAN)",
    description:
      "A PIN-gated control page for a phone on the same wifi, so you can run goals, the clock, and the on-air screen from the touchline.",
  },
  {
    title: "Stream Deck and shortcuts",
    description:
      "Elgato Stream Deck support plus rebindable keyboard shortcuts for goals, phase changes, and screen switching.",
  },
  {
    title: "8 languages",
    description:
      "English, French, German, Italian, Spanish (Spain and Latin America), and Portuguese (Portugal and Brazil).",
  },
  {
    title: "Crash recovery",
    description:
      "Score, clock, and match state are saved continuously, so a crash mid-match doesn't mean starting over.",
  },
];

const SCREENSHOTS: { src: string; alt: string; caption: string }[] = [
  {
    src: "/screenshots/dashboard.png",
    alt: "The PlayOverlay operator dashboard, showing match controls, score, and clock",
    caption: "The operator dashboard: scores, clock, phases, and screens, all in one control window.",
  },
  {
    src: "/screenshots/score-bug.png",
    alt: "The score bug rendered on the chroma-key display output",
    caption: "The score bug on the chroma-key display output, ready to key over your feed.",
  },
  {
    src: "/screenshots/scoreboard.png",
    alt: "The spectator scoreboard screen, showing both teams, the score, and the time",
    caption: "The spectator scoreboard: point a venue screen at it, no stream required.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="page-container flex flex-col items-center gap-8 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            Free and open source (MIT)
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-white">
            Live score and match-clock graphics for your stream
          </h1>
          <p className="max-w-2xl text-lg text-slate-600 sm:text-xl dark:text-slate-300">
            PlayOverlay is a free desktop app for adding a broadcast-style score bug, match clock,
            and penalty tracker to a sports stream, built for community football on YouTube, and
            usable for any stream where you key graphics over a live feed.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/download"
              className="rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Download
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-md border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="page-container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Everything you need to run a match
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              One control window for the operator, one clean output for the graphics, and enough
              flexibility to fit however you&rsquo;re already streaming.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="page-container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              See it in action
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              The operator dashboard on one screen, the clean graphics output on another.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {SCREENSHOTS.map((shot) => (
              <figure
                key={shot.src}
                className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={960}
                  height={600}
                  className="h-auto w-full object-cover"
                />
                <figcaption className="border-t border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                  {shot.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="page-container grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              How it works
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              PlayOverlay runs two windows. The <strong>control window</strong> is where the
              operator updates scores, runs the match clock, tracks penalties, and switches
              screens. The <strong>display window</strong> is a clean, fullscreen output showing
              the graphics on your chosen key colour.
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Put the display window on a second monitor connected to a vision mixer (for example
              a Blackmagic ATEM Mini), key out the background colour, and composite it over your
              camera feed. If you&rsquo;re streaming through OBS instead of a hardware mixer, skip
              the second display and chroma key entirely: PlayOverlay can serve the graphics
              directly into an OBS Browser Source with a transparent background.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/docs"
                className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
              >
                Read the docs
              </Link>
              <Link
                href="/download"
                className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
              >
                Get PlayOverlay
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <ol className="flex flex-col gap-5">
              {[
                {
                  title: "Set up your match",
                  body: "Team names, colours, logos, venue, kick-off time, and half lengths in Match Settings.",
                },
                {
                  title: "Choose your output",
                  body: "Pick a key colour for a chroma key setup, or switch on the OBS browser source.",
                },
                {
                  title: "Move the display",
                  body: "Send the display window to your output monitor and make it fullscreen.",
                },
                {
                  title: "Kick off",
                  body: "Start the clock, add goals as they happen, and advance phases as the match runs.",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{step.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
