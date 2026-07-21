import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Getting started with PlayOverlay: match setup, chroma key vs OBS browser source, keyboard shortcuts, Stream Deck, the phone remote, and languages.",
};

const SECTIONS = [
  { id: "getting-started", label: "Getting started" },
  { id: "output", label: "Chroma key or OBS" },
  { id: "shortcuts", label: "Keyboard shortcuts" },
  { id: "stream-deck", label: "Stream Deck" },
  { id: "phone-remote", label: "Phone remote (LAN)" },
  { id: "languages", label: "Languages" },
];

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Cmd/Ctrl+Shift+Space", action: "Next match phase" },
  { keys: "Cmd/Ctrl+Shift+H", action: "Home team scored" },
  { keys: "Cmd/Ctrl+Shift+A", action: "Away team scored" },
];

export default function DocsPage() {
  return (
    <div className="page-container py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Docs
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Everything you need to set up a match, choose an output, and use the extras.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            On this page
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex max-w-3xl flex-col gap-16">
          <section id="getting-started" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Getting started
            </h2>
            <ol className="mt-6 flex flex-col gap-6">
              <li>
                <h3 className="font-semibold text-slate-900 dark:text-white">1. Match Settings</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Set team names, abbreviations, colours, and logos, plus the venue, kick-off time,
                  and half lengths. This is also where you choose between the football timer and
                  generic periods (for sports that aren&rsquo;t halves-based, e.g. 4 &times;
                  12-minute quarters), and toggle extra time and penalties for the match. Saved
                  match settings can be reloaded per fixture, so you don&rsquo;t have to re-enter
                  the same line-up every week.
                </p>
              </li>
              <li>
                <h3 className="font-semibold text-slate-900 dark:text-white">2. Window Settings</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Pick your key colour and whether screens auto-switch on phase changes. This is
                  also where the OBS browser source and keyboard shortcuts live, see below.
                </p>
              </li>
              <li>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  3. Move the display to your output
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Move the display window to the output monitor and make it fullscreen. PlayOverlay
                  is multi-monitor aware: you can lock windows always-on-top and keep the machine
                  awake for the whole stream.
                </p>
              </li>
              <li>
                <h3 className="font-semibold text-slate-900 dark:text-white">4. Kick off</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Start the first half, add goals as they happen, add stoppage time, and advance
                  phases. If the app closes mid-match, the score, clock, and match state are saved
                  continuously, so you can restore where you left off.
                </p>
              </li>
            </ol>
          </section>

          <section id="output" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Chroma key or OBS browser source
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              There are two ways to get PlayOverlay&rsquo;s graphics into your stream.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="font-semibold text-slate-900 dark:text-white">Chroma key via a mixer</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Feed the display window&rsquo;s solid-colour output into a vision mixer or
                  capture device, for example a Blackmagic ATEM Mini, key out the background, and
                  composite it over your camera feed before streaming. You can set a custom key
                  colour under Window Settings to suit whatever your mixer keys best.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="font-semibold text-slate-900 dark:text-white">OBS browser source</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Off by default. Open <strong>Window Settings &rarr; OBS Browser Source</strong> and
                  switch it on (default port <code>4750</code>). In OBS, add a Browser Source
                  pointed at <code>http://127.0.0.1:&lt;port&gt;/</code>, sized to your canvas
                  resolution. The background is transparent, so no chroma key is needed. The
                  server only listens on <code>127.0.0.1</code> (never reachable from the network)
                  and stays off unless you enable it, and it reconnects automatically if OBS or the
                  app restarts mid-stream.
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
              <h3 className="font-semibold text-slate-900 dark:text-white">Pinned views</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Add <code>?screen=&lt;name&gt;</code> to the browser source URL to pin that page to
                a specific screen, regardless of what the operator currently has selected. This
                lets one venue TV (or a second OBS scene) show something different, such as the
                spectator scoreboard, from the same running app. Valid values are{" "}
                <code>matchTitle</code>, <code>scoreBug</code>, <code>penalties</code>,{" "}
                <code>endScreen</code>, and <code>scoreboard</code>; leaving it out follows the
                operator. Window Settings shows a ready-made copyable URL for the scoreboard view.
              </p>
            </div>
          </section>

          <section id="shortcuts" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Keyboard shortcuts
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              While PlayOverlay is focused, these work by default:
            </p>
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Shortcut</th>
                    <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {SHORTCUTS.map((row) => (
                    <tr key={row.keys}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {row.keys}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              The same actions also work system-wide (while OBS or your mixer software is focused)
              with <code>Alt</code> added, for example <code>Cmd/Ctrl+Alt+Shift+H</code>, unless
              the shortcut you&rsquo;ve bound already includes <code>Alt</code>, in which case
              there&rsquo;s no separate system-wide variant. Shortcuts are rebindable: open{" "}
              <strong>Window Settings &rarr; Keyboard Shortcuts</strong>, click <strong>Change</strong>{" "}
              next to an action, then press the new key combination (a modifier other than Shift is
              required). <strong>Reset</strong> restores that action&rsquo;s default.
            </p>
          </section>

          <section id="stream-deck" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Stream Deck
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Connect an Elgato Stream Deck from <strong>System Settings &rarr; Connect to
              Stream Deck</strong>. The deck shows rotating button sets for scoring, match phases,
              and screen switching, and the logo key cycles between sets. PlayOverlay talks to the
              deck over WebHID, so close any other software that&rsquo;s holding it, including the
              official Stream Deck app.
            </p>
          </section>

          <section id="phone-remote" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Phone remote (LAN)
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Off by default. When you&rsquo;d rather run the match from the touchline than the
              laptop, PlayOverlay can serve a small control page to a phone on the same local
              network (usually the same wifi):
            </p>
            <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-slate-600 dark:text-slate-400">
              <li>
                Open <strong>System Settings &rarr; Phone Remote</strong> and switch it on (default
                port <code>3006</code>).
              </li>
              <li>
                On the phone, connected to the same local network as the laptop, scan the QR code
                shown there or open <code>http://&lt;laptop-ip&gt;:&lt;port&gt;/</code>.
              </li>
              <li>
                Enter the 6-digit PIN shown in Settings. Once paired, the phone shows the live
                score, clock, and on-air screen.
              </li>
            </ol>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              From the phone you can add or remove a goal for either team, start or stop the match
              clock, advance to the next match phase, and switch which graphic is on air. It
              mirrors the live match state, so it stays in sync with the operator and any other
              paired phone: a phone tap and an on-screen click behave identically.
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              <strong>Security</strong>: the remote server binds to the local network only and is
              never reachable from the internet. Pairing is gated by a 6-digit PIN that&rsquo;s
              regenerated every time you enable the feature (and again on every app restart), and
              repeated wrong guesses are rate-limited. It&rsquo;s built for a trusted venue
              network, not a hostile public one, so leave it off when you don&rsquo;t need it and
              treat the PIN like any other password.
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Note: the phone remote interface is English-only, regardless of which language
              you&rsquo;ve chosen for the operator dashboard.
            </p>
          </section>

          <section id="languages" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Languages
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              The operator dashboard and the on-screen graphics are available in 8 locales:
              English, French, German, Italian, Spanish (Spain and Latin America), and Portuguese
              (Portugal and Brazil). On first launch, PlayOverlay suggests a language based on your
              system and asks you to confirm it or pick another. You can change it any time under{" "}
              <strong>System Settings &rarr; Language</strong>, and it applies to both the operator
              dashboard and the on-air graphics. Anything you type yourself, team names,
              abbreviations, venues, and the titles of saved match settings or custom screens, is
              always shown exactly as you enter it and is never translated.
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              These translations are machine-generated and haven&rsquo;t been reviewed by native
              speakers, so some wording, especially the on-air football terms, may read a little
              off. If you spot a mistake, please{" "}
              <a
                href="https://github.com/JosephMaynard/playoverlay/issues"
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                open an issue
              </a>{" "}
              and it&rsquo;ll get fixed.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Ready to try it?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Grab the latest build for your platform, it&rsquo;s free.
            </p>
            <Link
              href="/download"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Download PlayOverlay
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
