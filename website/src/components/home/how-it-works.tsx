import Link from "next/link";
import { eyebrow, sectionTitle, textLink } from "@/lib/ui";

const STEPS = [
  {
    title: "Set up the teams",
    body: "Enter both clubs' names, three-letter abbreviations, colours and logos, plus the venue, kick-off time and half length, and the line-ups if you have them. Save a club once and load it next week in one click.",
    href: "/docs/match-settings",
    linkLabel: "Match settings",
  },
  {
    title: "Send the display to your mixer or OBS",
    body: "PlayOverlay opens a second, clean window with just the graphics. Put it on the HDMI output going into your mixer and key out the background, or add it to OBS as a browser source with no keying at all.",
    href: "/docs/output-setup",
    linkLabel: "Output setup",
  },
  {
    title: "Run the match from the dashboard",
    body: "Start each half, add goals as they go in, set stoppage time and switch graphics. Every goal is logged with its minute and a banner goes on air without any typing.",
    href: "/docs/running-a-match",
    linkLabel: "Running a match",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="py-20 sm:py-24">
      <div className="page-container">
        <div className="max-w-2xl">
          <p className={eyebrow}>How it works</p>
          <h2 id="how-title" className={`mt-3 ${sectionTitle}`}>
            Three steps from laptop to live stream
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            One window for you, one for the stream. The first setup takes about five minutes, and
            after that your clubs and settings are saved.
          </p>
        </div>
        <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-text"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-fg">
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 flex-1 leading-relaxed text-muted">{step.body}</p>
              <Link href={step.href} className={`mt-5 w-fit text-sm ${textLink}`}>
                {step.linkLabel}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
