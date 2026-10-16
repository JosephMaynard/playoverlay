import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { Figure } from "@/components/figure";
import { ImageSlot } from "@/components/image-slot";

const SLUG = "match-settings";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "teams", title: "Teams" },
  { id: "match-details", title: "Match details" },
  { id: "timer-modes", title: "Football or generic timer" },
  { id: "club-presets", title: "Club presets" },
  { id: "saved-match-settings", title: "Saved match settings" },
];

export default function MatchSettingsPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <p>
        Open <strong>Match Settings</strong> from the people icon on the right of the dashboard.
        Everything here feeds the on-air graphics, so it is worth setting up properly once. After
        that, club presets and saved match settings mean you rarely type a team name twice.
      </p>
      <Figure caption="Match Settings opens beside the dashboard. Here the home team's line-up is being filled in.">
        <ImageSlot name="match-settings" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>

      <h2 id="teams">Teams</h2>
      <p>For both the home and away team you can set:</p>
      <ul>
        <li>
          <strong>Name</strong>, shown in full on the match title, end screen and scoreboard.
        </li>
        <li>
          <strong>Name abbreviated</strong>, shown on the score bug. Three letters, as broadcasters
          use, fits best: WIN, ROM.
        </li>
        <li>
          <strong>Background colour</strong> and <strong>text colour</strong>, used for the
          team&apos;s block on the score bug and its panel on the scoreboard. Pick the club&apos;s
          main kit colour and a text colour that reads clearly on it.
        </li>
        <li>
          <strong>Logo</strong>, optional. Upload a PNG, JPEG, WebP or SVG. A square image with a
          transparent background looks best.
        </li>
        <li>
          <strong>Line-up</strong>, optional. Up to 30 players with shirt numbers, typed in one at
          a time or pasted as a list. It gives the team a line-up screen and a list to pick goal
          scorers from. See <Link href="/docs/line-ups">Line-ups</Link>.
        </li>
      </ul>
      <Callout tone="warning" title="Watch out for the key colour">
        <p>
          If you use a chroma key, any part of a graphic that is close to the key colour turns
          see-through on the stream. The colour picker warns you when a team colour is too close.
          Change the key colour in Window Settings rather than the club&apos;s colours. See{" "}
          <Link href="/docs/screens#key-colour">choosing a key colour</Link>.
        </p>
      </Callout>

      <h2 id="match-details">Match details</h2>
      <ul>
        <li>
          <strong>Venue</strong> and <strong>kick-off time</strong> appear on the match title
          screen, which also counts down to kick-off.
        </li>
        <li>
          <strong>Half length</strong> in minutes. Seven-a-side and youth matches often play
          shorter halves, so set this to match the game.
        </li>
        <li>
          <strong>Extra time</strong> can be switched on or off for each match, with its own half
          length. With it off, the extra time buttons are hidden.
        </li>
        <li>
          <strong>Penalties</strong> can be switched off for matches that can&apos;t go to a
          shootout.
        </li>
      </ul>

      <h2 id="timer-modes">Football or generic timer</h2>
      <p>
        <strong>Timer Mode</strong> chooses how the match is divided. <strong>Football</strong>{" "}
        gives you a first and second half, plus extra time if it is switched on.{" "}
        <strong>Generic</strong> is for sports that don&apos;t play halves: set the number of
        periods, the length of each, and a period name such as Quarter or Period. Four 12-minute
        quarters, for example, becomes four buttons from Quarter 1 to Quarter 4.
      </p>

      <h2 id="club-presets">Club presets</h2>
      <p>
        If you film the same club every week, save it once. In a team&apos;s settings, press{" "}
        <strong>Save as club</strong> to keep its name, abbreviation, colours, logo and line-up. Next time,
        choose it from <strong>Load a saved club</strong> to fill the home or away slot in one
        step.
      </p>
      <p>
        Deleting a saved club removes it from the list only. Teams already using it in the current
        match keep their details.
      </p>

      <h2 id="saved-match-settings">Saved match settings</h2>
      <p>
        <strong>Save / Restore Match Settings</strong> stores a whole fixture: both teams with
        their line-ups, the venue, kick-off time and the timer setup. This is handy for a cup run or a fixture you
        stream every season. Restoring replaces the current match settings, so PlayOverlay asks you
        to confirm first.
      </p>
      <p>
        Between fixtures, <strong>New match</strong> clears the score, clock and on-air graphics
        but keeps your team settings. See{" "}
        <Link href="/docs/running-a-match#new-match">starting a new match</Link>.
      </p>
    </DocPage>
  );
}
