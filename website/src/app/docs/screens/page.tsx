import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { Figure } from "@/components/figure";
import { ImageSlot } from "@/components/image-slot";
import { Screenshot } from "@/components/screenshot";

const SLUG = "screens";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "choosing", title: "Choosing what is on air" },
  { id: "score-bug", title: "Score bug" },
  { id: "match-title", title: "Match title" },
  { id: "scoreboard", title: "Scoreboard" },
  { id: "penalties", title: "Penalties" },
  { id: "end-screen", title: "End screen" },
  { id: "line-ups", title: "Home and away line-ups" },
  { id: "custom-graphics", title: "Custom graphics and overlays" },
  { id: "key-colour", title: "Choosing a key colour" },
];

export default function ScreensPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <h2 id="choosing">Choosing what is on air</h2>
      <p>
        The <strong>Display Controls</strong> panel on the dashboard has a button for each screen:{" "}
        <strong>None</strong>, <strong>Match Title</strong>, <strong>Score Bug</strong>,{" "}
        <strong>Penalties</strong>, <strong>End Screen</strong> and <strong>Scoreboard</strong>,
        plus <strong>Home Line-up</strong> and <strong>Away Line-up</strong> once a team has
        players, and any custom screens you have added. The highlighted button is what is on air,
        and the preview above it shows the output exactly. Screens animate in and out, so
        switching looks deliberate on the stream.
      </p>
      <p>
        To leave the display cycling through several screens before kick-off or at half-time, use
        the <strong>Rotate screens</strong> panel under Display Controls. See{" "}
        <Link href="/docs/line-ups#rotating">rotating screens</Link>.
      </p>
      <p>
        <strong>None</strong> clears the graphics and leaves only the key colour, so the camera
        picture is shown clean without touching the mixer.
      </p>

      <h2 id="score-bug">Score bug</h2>
      <Figure caption="The score bug on the display output, top left of the frame.">
        <Screenshot name="scoreBug" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        The graphic that stays on screen during play: both team abbreviations in club colours,
        optional logos, the score, the match clock and any stoppage time. Goal banners appear with
        it when a goal is scored. See{" "}
        <Link href="/docs/running-a-match#goal-banner">the goal banner</Link>.
      </p>

      <h2 id="match-title">Match title</h2>
      <Figure>
        <ImageSlot name="screen-match-title" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        For before kick-off and half-time. It shows both teams with their club colours, the
        current score, the venue and the kick-off time. Until kick-off it also counts down: Starts
        in 4:59.
      </p>

      <h2 id="scoreboard">Scoreboard</h2>
      <Figure caption="The Scoreboard screen, meant for a TV or projector at the ground.">
        <Screenshot name="scoreboard" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        A full-screen scoreboard for spectators rather than the stream. Each team gets a band in
        its club colours with its score, alongside the time of day and the match clock.
        It doesn&apos;t need a chroma key. Choose a 24-hour or AM/PM clock under{" "}
        <strong>System Settings → Scoreboard Clock</strong>.
      </p>
      <p>
        To show the scoreboard on a venue screen while the stream carries the score bug, see{" "}
        <Link href="/docs/output-setup#venue-scoreboard">venue scoreboard</Link>.
      </p>

      <h2 id="penalties">Penalties</h2>
      <p>
        The shootout board: both teams with a mark for every kick taken, scored or missed, and the
        running total. It updates as you record kicks in the Penalties panel. See{" "}
        <Link href="/docs/running-a-match#penalties">penalty shootouts</Link>.
      </p>

      <h2 id="end-screen">End screen</h2>
      <Figure>
        <ImageSlot name="screen-end-screen" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        For full time: the final score, the shootout result if there was one, and each team&apos;s
        scorers with their minutes. Add scorer names in the Goals panel before you put it on air.
      </p>

      <h2 id="line-ups">Home and away line-ups</h2>
      <Figure caption="The Away Line-up screen, in the away team's colours.">
        <ImageSlot name="screen-away-lineup" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        <strong>Home Line-up</strong> and <strong>Away Line-up</strong> show a team&apos;s name,
        logo and colours above its players and their shirt numbers, in two columns for more than
        eleven players. Each button appears once that team has players in Match Settings. See{" "}
        <Link href="/docs/line-ups">Line-ups</Link> for entering a squad.
      </p>

      <h2 id="custom-graphics">Custom graphics and overlays</h2>
      <p>
        Open <strong>Custom Graphics</strong> (the picture icon) and press{" "}
        <strong>Add Custom Graphic</strong> to upload your own images. PlayOverlay accepts PNG,
        JPEG, WebP and SVG files. There are two types:
      </p>
      <ul>
        <li>
          <strong>Custom Screen</strong> is a full-screen graphic with its own button in Display
          Controls, such as a half-time sponsor board, a club notice or a &quot;back
          shortly&quot; card.
        </li>
        <li>
          <strong>Overlay</strong> sits on top of the built-in screens you choose under{" "}
          <strong>Show overlay on screens</strong>, or <strong>All Screens</strong>. A
          sponsor&apos;s logo in the corner of the score bug is the usual example. Turn overlays
          on and off in the Overlays section of Display Controls.
        </li>
      </ul>
      <Callout title="Making overlay images">
        <p>
          Make overlays the same size as your output, for example 1920 × 1080, as a PNG with a
          transparent background. Place the logo where you want it in the frame and leave the rest
          empty. Keep clear of the top-left corner, where the score bug sits.
        </p>
      </Callout>
      <p>
        You can edit a graphic&apos;s title, type and screens later. If you delete a graphic that
        is on air, PlayOverlay takes it off air.
      </p>

      <h2 id="key-colour">Choosing a key colour</h2>
      <p>
        When you use a chroma key, the display window draws every graphic on a solid background
        colour and your mixer makes that colour transparent. The default is pure blue (#0000FF).
        Change it in <strong>Window Settings → Key Colour</strong>.
      </p>
      <ul>
        <li>
          <strong>Pick a colour neither team wears.</strong> Anything close to the key colour,
          whether a kit colour, part of a logo or text, turns see-through on the stream. If a team
          plays in blue, switch to green (#00FF00) or magenta (#FF00FF).
        </li>
        <li>
          <strong>Use a pure, saturated colour.</strong> Keyers separate those most cleanly.
        </li>
        <li>
          <strong>Listen to the warning.</strong> The team colour pickers warn you when a colour is
          too close to the key colour.
        </li>
        <li>
          <strong>Check on the mixer.</strong> Look at the keyed output before kick-off, especially
          the edges of logos and text.
        </li>
      </ul>
      <p>
        Streaming through OBS? The browser source has a transparent background, so the key colour
        doesn&apos;t matter there. See <Link href="/docs/output-setup#obs">OBS browser source</Link>.
      </p>
    </DocPage>
  );
}
