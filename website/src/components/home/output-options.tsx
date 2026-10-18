import Link from "next/link";
import { ImageSlot } from "@/components/image-slot";
import { ArrowRightIcon } from "@/components/icons";
import { eyebrow, sectionTitle } from "@/lib/ui";
import type { ImageSlotName } from "@/lib/image-slots";

interface OutputOption {
  id: string;
  title: string;
  bestFor: string;
  slot: ImageSlotName;
  chain: string[];
  body: string;
  needs: string;
  href: string;
}

const OPTIONS: OutputOption[] = [
  {
    id: "mixer",
    title: "Vision mixer over HDMI",
    bestFor: "Hardware mixers such as the ATEM Mini",
    slot: "setup-atem",
    chain: ["Laptop", "HDMI", "Mixer", "Stream"],
    body: "The display window goes full screen on the laptop's HDMI output, which plugs into a spare mixer input. The mixer keys out the solid background colour and lays the graphics over the camera.",
    needs: "A laptop with an HDMI output and a mixer with a chroma keyer.",
    href: "/docs/output-setup#chroma-key",
  },
  {
    id: "obs",
    title: "OBS browser source",
    bestFor: "Streaming from OBS on the same computer",
    slot: "obs-browser-source",
    chain: ["PlayOverlay", "Browser Source", "OBS"],
    body: "Turn on the browser source and add one URL to OBS. The graphics arrive with a transparent background, so there is no second display and nothing to key.",
    needs: "OBS Studio running on the same computer as PlayOverlay.",
    href: "/docs/output-setup#obs",
  },
  {
    id: "venue",
    title: "Venue scoreboard",
    bestFor: "A TV or projector at the ground",
    slot: "venue-scoreboard",
    chain: ["Laptop", "HDMI", "TV"],
    body: "Put the Scoreboard screen on a TV in the clubhouse or by the pitch. It shows the teams in club colours, the score, the time of day and the match clock, and works with or without a stream.",
    needs: "A TV or projector connected to the PlayOverlay computer.",
    href: "/docs/output-setup#venue-scoreboard",
  },
];

export function OutputOptions() {
  return (
    <section aria-labelledby="output-title" className="py-20 sm:py-24">
      <div className="page-container">
        <div className="max-w-2xl">
          <p className={eyebrow}>Output options</p>
          <h2 id="output-title" className={`mt-3 ${sectionTitle}`}>
            Works with the kit you already have
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Pick the route that matches your setup. You can switch between them, or use two at once.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {OPTIONS.map((option) => (
            <li
              key={option.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
            >
              <div className="border-b border-line">
                <ImageSlot
                  name={option.slot}
                  aspectRatio="16 / 10"
                  sizes="(min-width: 1024px) 380px, 100vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-sm font-medium text-accent-text">{option.bestFor}</p>
                <h3 className="mt-1 text-xl font-semibold text-fg">{option.title}</h3>
                <p
                  className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-xs text-muted"
                  aria-label={`Signal path: ${option.chain.join(" to ")}`}
                >
                  {option.chain.map((step, index) => (
                    <span key={step} className="inline-flex items-center gap-1.5" aria-hidden="true">
                      {index > 0 && <span className="text-faint">→</span>}
                      <span className="rounded border border-line bg-subtle px-1.5 py-0.5">{step}</span>
                    </span>
                  ))}
                </p>
                <p className="mt-4 leading-relaxed text-muted">{option.body}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  <strong className="font-semibold text-fg">You need: </strong>
                  {option.needs}
                </p>
                <Link
                  href={option.href}
                  className="mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-link hover:underline"
                >
                  Setup guide
                  <span className="sr-only">: {option.title}</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
