import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { Figure } from "@/components/figure";
import { Screenshot } from "@/components/screenshot";

const SLUG = "getting-started";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "install", title: "Install PlayOverlay" },
  { id: "two-windows", title: "The two windows" },
  { id: "first-match", title: "Your first match in five minutes" },
  { id: "next", title: "Where to go next" },
];

export default function GettingStartedPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <h2 id="install">Install PlayOverlay</h2>
      <p>
        Download the build for your computer from the <Link href="/download">download page</Link>.
        There are versions for Windows, macOS (Apple Silicon and Intel) and Linux (.deb and .rpm).
      </p>
      <p>
        The builds aren&apos;t code-signed, so the first time you open PlayOverlay, Windows or macOS
        will warn you about it. That is expected. The{" "}
        <Link href="/download#first-launch">download page</Link> shows how to get past the warning,
        and on a Mac it is one Terminal command.
      </p>
      <p>
        On first launch PlayOverlay suggests a language based on your system. Confirm it or pick
        another. You can change it later in <strong>System Settings</strong>.
      </p>

      <h2 id="two-windows">The two windows</h2>
      <p>PlayOverlay always runs two windows:</p>
      <ul>
        <li>
          <strong>The control window</strong> is the dashboard you work from. It has the match
          clock, both scores, the penalty shootout, the buttons that choose what is on air, and a
          live preview of the output.
        </li>
        <li>
          <strong>The display window</strong> shows only the graphics, on a solid key colour (blue
          unless you change it). This is the window your mixer sees. Move it to the screen output
          that goes into your mixer and make it full screen.
        </li>
      </ul>
      <Figure caption="The control window. The preview in the top left mirrors the display window.">
        <Screenshot name="dashboard" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <Figure caption="The display window, full screen on the second output. The mixer keys out the blue.">
        <Screenshot name="scoreBug" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        If you stream with OBS on the same computer, you don&apos;t need the display window on a
        second screen. Turn on the OBS browser source instead and the graphics go straight into OBS
        with a transparent background. See <Link href="/docs/output-setup#obs">Output setup</Link>.
      </p>
      <p>
        The settings panels open from the column of icons on the right of the dashboard:{" "}
        <strong>Match Settings</strong> (the people icon, labelled Team Settings),{" "}
        <strong>Custom Graphics</strong> (the picture icon), <strong>Window Settings</strong> (the
        monitor icon) and <strong>System Settings</strong> (the cog).
      </p>

      <h2 id="first-match">Your first match in five minutes</h2>
      <ol>
        <li>
          <strong>Enter the teams.</strong> Open Match Settings and fill in each team&apos;s name, a
          short abbreviation for the score bug (three letters works best), and its background and
          text colours. Add logos if you have them. Set the venue, kick-off time and half length.
        </li>
        <li>
          <strong>Choose how the graphics leave the laptop.</strong> For a hardware mixer, check the
          key colour in Window Settings and pick one neither team wears. For OBS, open System
          Settings and switch on <strong>OBS Browser Source</strong>.
        </li>
        <li>
          <strong>Put the display window on the right screen.</strong> With the laptop connected to
          the mixer, open Window Settings, choose <strong>Move to Screen 2</strong>, then{" "}
          <strong>Toggle Fullscreen</strong>. <strong>Lock Windows</strong> keeps both windows where
          they are for the rest of the match.
        </li>
        <li>
          <strong>Run the Go live check.</strong> The green button under the preview checks the
          output window, the second display, team logos and graphics, keyboard shortcuts, the OBS
          source and the phone remote. It only looks and never changes anything.
        </li>
        <li>
          <strong>Before kick-off,</strong> put <strong>Match Title</strong> on air. It shows both
          teams, the venue and a countdown to kick-off.
        </li>
        <li>
          <strong>At kick-off,</strong> press <strong>First Half</strong>. The clock starts and,
          with <strong>Auto switch screens on start and stop</strong> turned on, the score bug goes
          on air by itself.
        </li>
        <li>
          <strong>When a goal goes in,</strong> press <strong>Home Team Scored</strong> or{" "}
          <strong>Away Team Scored</strong>. The score updates and a goal banner goes on air.
        </li>
        <li>
          <strong>At half-time,</strong> press <strong>Stop</strong>. The match title comes back
          on air. Press <strong>Second Half</strong> when play restarts.
        </li>
        <li>
          <strong>At full time,</strong> press <strong>Stop</strong> and put the{" "}
          <strong>End Screen</strong> on air for the final score and the scorers.
        </li>
      </ol>
      <Callout title="Practise before match day">
        <p>
          Run through a pretend match at home with the mixer connected. Ten minutes of pressing
          buttons is the quickest way to learn where everything is, and{" "}
          <strong>New match</strong> clears it all afterwards.
        </p>
      </Callout>

      <h2 id="next">Where to go next</h2>
      <ul>
        <li>
          <Link href="/docs/match-settings">Match settings and club presets</Link>: save the clubs
          you play every week.
        </li>
        <li>
          <Link href="/docs/output-setup">Output setup</Link>: keying on an ATEM Mini, the OBS
          browser source and venue screens in detail.
        </li>
        <li>
          <Link href="/docs/running-a-match">Running a match</Link>: stoppage time, scorers,
          penalties, undo and crash recovery.
        </li>
      </ul>
    </DocPage>
  );
}
