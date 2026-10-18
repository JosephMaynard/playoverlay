import Link from "next/link";
import { Figure } from "@/components/figure";
import { ImageSlot } from "@/components/image-slot";
import { Screenshot } from "@/components/screenshot";
import {
  BookmarkIcon,
  GlobeIcon,
  ImageIcon,
  KeyboardIcon,
  RocketIcon,
  ShieldIcon,
  TargetIcon,
  TimerIcon,
  UndoIcon,
} from "@/components/icons";
import { eyebrow, sectionTitle, textLink } from "@/lib/ui";

interface FeatureRowProps {
  label: string;
  title: string;
  children: React.ReactNode;
  media: React.ReactNode;
  caption?: string;
  link?: { href: string; label: string };
  reverse?: boolean;
  /** Narrow media column, for portrait images. */
  narrowMedia?: boolean;
}

function FeatureRow({
  label,
  title,
  children,
  media,
  caption,
  link,
  reverse = false,
  narrowMedia = false,
}: FeatureRowProps) {
  return (
    <div
      className={`grid grid-cols-1 items-center gap-8 lg:gap-14 ${
        narrowMedia
          ? "lg:grid-cols-[1fr_minmax(0,24rem)]"
          : reverse
            ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
            : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      }`}
    >
      <div className={reverse ? "lg:order-2" : ""}>
        <p className={eyebrow}>{label}</p>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h3>
        <div className="mt-4 space-y-4 text-lg leading-relaxed text-muted">{children}</div>
        {link && (
          <Link href={link.href} className={`mt-5 inline-block ${textLink}`}>
            {link.label}
          </Link>
        )}
      </div>
      <Figure caption={caption} className={`${reverse ? "lg:order-1" : ""} ${narrowMedia ? "mx-auto w-full max-w-sm" : ""}`}>
        {media}
      </Figure>
    </div>
  );
}

const MORE_FEATURES = [
  {
    icon: UndoIcon,
    title: "Undo and redo",
    body: "Step back through goals, clock and phase changes, screen switches and penalties. The running clock is never rewound.",
  },
  {
    icon: ShieldIcon,
    title: "Crash recovery",
    body: "The score, clock and match state are saved as you go. If the app closes mid-match, restore it and carry on. Until you do, the outputs stay blank rather than showing a wrong 0-0.",
  },
  {
    icon: BookmarkIcon,
    title: "Club presets",
    body: "Save a club's name, abbreviation, colours, logo and squad once, then load it into the home or away slot for the next fixture.",
  },
  {
    icon: TargetIcon,
    title: "Penalty shootouts",
    body: "A shootout board that alternates the teams for you, records scored and missed kicks, and can be turned off for matches that can't go to penalties.",
  },
  {
    icon: ImageIcon,
    title: "Your own graphics",
    body: "Upload full-screen graphics for half-time, or overlays such as a sponsor's logo that appear on the screens you choose.",
  },
  {
    icon: RocketIcon,
    title: "Go live check",
    body: "One button checks the output window, the second display, logos, shortcuts, the OBS source and the phone remote before kick-off. It only looks, it never changes anything.",
  },
  {
    icon: KeyboardIcon,
    title: "Stream Deck and shortcuts",
    body: "Score goals, change phase and switch screens from an Elgato Stream Deck, or from keyboard shortcuts that also work while OBS has focus.",
  },
  {
    icon: GlobeIcon,
    title: "Eight languages",
    body: "The dashboard and the on-air graphics in English, French, German, Italian, Spanish (Spain and Latin America) and Portuguese (Portugal and Brazil).",
  },
  {
    icon: TimerIcon,
    title: "Other sports too",
    body: "Built for football, but the generic timer runs any number of named periods, such as four 12-minute quarters, for any sport you put graphics over.",
  },
];

export function Features() {
  return (
    <section aria-labelledby="features-title" className="border-t border-line bg-subtle py-20 sm:py-24">
      <div className="page-container">
        <div className="max-w-2xl">
          <p className={eyebrow}>Features</p>
          <h2 id="features-title" className={`mt-3 ${sectionTitle}`}>
            Made for one person running a whole match
          </h2>
        </div>

        <div className="mt-14 flex flex-col gap-20 sm:gap-24">
          <FeatureRow
            label="The dashboard"
            title="Everything for the match in one window"
            media={
              <Screenshot
                name="dashboard"
                sizes="(min-width: 1216px) 660px, (min-width: 1024px) 55vw, 100vw"
              />
            }
            caption="The dashboard. The live preview on the left shows exactly what is on air."
            link={{ href: "/docs/running-a-match", label: "How to run a match" }}
          >
            <p>
              The clock, both scores, the penalty shootout and every on-air graphic are on one
              screen, with a live preview of the output. Big buttons, so you can hit the right one
              while watching the game.
            </p>
            <p>
              Undo and redo sit in the corner for the goal that turns out to be offside.
            </p>
          </FeatureRow>

          <FeatureRow
            reverse
            label="The score bug"
            title="A proper score bug, keyed over your camera"
            media={
              <Screenshot
                name="scoreBug"
                sizes="(min-width: 1216px) 660px, (min-width: 1024px) 55vw, 100vw"
              />
            }
            caption="The display output as your mixer receives it. The blue is keyed out, leaving only the bug over the camera picture."
            link={{ href: "/docs/screens", label: "All the screens" }}
          >
            <p>
              Team abbreviations in club colours, the score, the match clock and stoppage time, in
              the top corner where viewers expect them.
            </p>
            <p>
              The clock follows your computer&apos;s system clock, so it doesn&apos;t drift over a
              half. Pause it, resume it or nudge it by a few seconds if the referee&apos;s watch
              disagrees.
            </p>
          </FeatureRow>

          <FeatureRow
            label="Goals"
            title="Every goal logged, with a banner on air"
            media={<ImageSlot name="screen-goal-banner" sizes="(min-width: 1216px) 660px, (min-width: 1024px) 55vw, 100vw" />}
            caption="The goal banner goes on air by itself when a goal is scored. Here it is shown again with the scorer added."
            link={{ href: "/docs/running-a-match#goals", label: "Goals, scorers and the banner" }}
          >
            <p>
              Press the goal button and PlayOverlay logs the minute (23&apos;, or 45+2&apos; in
              stoppage time) and puts a goal banner on air with the team and minute. No typing
              during play.
            </p>
            <p>
              Add the scorers&apos; names at half-time and the end screen lists who scored and
              when.
            </p>
          </FeatureRow>

          <FeatureRow
            reverse
            label="Line-ups"
            title="Line-ups and scorers from the team sheet"
            media={
              <ImageSlot
                name="screen-home-lineup"
                sizes="(min-width: 1216px) 660px, (min-width: 1024px) 55vw, 100vw"
              />
            }
            caption="The Home Line-up screen, in the club's colours."
            link={{ href: "/docs/line-ups", label: "Line-ups and rotating screens" }}
          >
            <p>
              Paste each team sheet into Match Settings and each team gets a line-up screen. When
              you add the scorers, pick them from the squad and the banner shows their number and
              name.
            </p>
            <p>
              At half-time the display can cycle through the line-ups, the scoreboard and your own
              graphics by itself, and it stops when you kick off again.
            </p>
          </FeatureRow>

          <FeatureRow
            narrowMedia
            label="Phone remote"
            title="Run it from the touchline"
            media={<ImageSlot name="phone-remote" sizes="(min-width: 1024px) 384px, 100vw" />}
            link={{ href: "/docs/phone-remote", label: "Setting up the phone remote" }}
          >
            <p>
              Turn on the phone remote, scan the QR code and enter the PIN. Your phone can then add
              goals, pause the clock, start the next half and change what&apos;s on air.
            </p>
            <p>
              It works over the venue&apos;s wifi with no internet connection and no app to
              install, and it stays in step with the laptop.
            </p>
          </FeatureRow>

          <FeatureRow
            reverse
            label="Spectator scoreboard"
            title="A scoreboard for the clubhouse TV"
            media={
              <Screenshot
                name="scoreboard"
                sizes="(min-width: 1216px) 660px, (min-width: 1024px) 55vw, 100vw"
              />
            }
            caption="The Scoreboard screen: club colours, the score, the time of day and the match clock."
            link={{ href: "/docs/output-setup#venue-scoreboard", label: "Setting up a venue screen" }}
          >
            <p>
              Point a TV or projector at PlayOverlay and the Scoreboard screen fills it with both
              teams, the score, the time of day and the match clock. No chroma key, and no stream
              needed.
            </p>
            <p>You can stream the score bug and show the scoreboard at the same time.</p>
          </FeatureRow>
        </div>

        <div className="mt-24">
          <h3 className="text-xl font-semibold text-fg">And the details that matter on match day</h3>
          <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {MORE_FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-fg shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <h4 className="mt-4 font-semibold text-fg">{title}</h4>
                <p className="mt-1.5 leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
