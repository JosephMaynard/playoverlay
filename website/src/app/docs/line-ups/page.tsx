import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { Kbd } from "@/components/docs/kbd";
import { CodeBlock } from "@/components/code-block";
import { Figure } from "@/components/figure";
import { ImageSlot } from "@/components/image-slot";

const SLUG = "line-ups";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "entering-players", title: "Entering the players" },
  { id: "pasting", title: "Pasting a team sheet" },
  { id: "saved-squads", title: "Squads saved with your clubs" },
  { id: "scorers", title: "Picking the scorer" },
  { id: "line-up-screens", title: "The line-up screens" },
  { id: "rotating", title: "Rotating screens" },
  { id: "half-time", title: "Starting by itself at half-time" },
];

export default function LineUpsPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <p>
        Line-ups are optional. Until a team has players, its line-up screen and scorer list
        don&apos;t appear, and PlayOverlay works exactly as it does without them. Add a squad when
        you have one, and you get a line-up screen for that team and a list to pick its goal
        scorers from.
      </p>

      <h2 id="entering-players">Entering the players</h2>
      <Figure caption="The Line-up section of a team's panel in Match Settings.">
        <ImageSlot name="match-settings" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        Open <strong>Match Settings</strong> from the people icon on the dashboard. Each
        team&apos;s panel has a <strong>Line-up</strong> section.
      </p>
      <ul>
        <li>
          <strong>Add player</strong> gives you a row with a shirt number and a name. The number
          can be up to three characters, so 9, 00 and GK all work.
        </li>
        <li>
          Press <Kbd>Enter</Kbd> in a row to move straight on to the next player, so you can type
          a whole squad without touching the mouse.
        </li>
        <li>The bin icon at the end of a row removes that player.</li>
        <li>
          A team can have up to 30 players. The count next to the buttons shows how many you have.
        </li>
      </ul>

      <h2 id="pasting">Pasting a team sheet</h2>
      <p>
        If the team sheet arrives as a message or a spreadsheet, press{" "}
        <strong>Paste a list</strong> and paste it in. Put one player on each line, with the shirt
        number first if you have it:
      </p>
      <CodeBlock
        label="Team sheet"
        code={"1 Jack Doyle\n2 Harry Cole\n3 Ben Oduya\n9 Ali Smith\nGK Sam Reid"}
      />
      <p>
        <strong>Add players</strong> adds them to the end of the line-up. Blank lines are skipped,
        and a number written as #9, 9. or 9 - works too, as does a list copied from a spreadsheet
        with the number and name in separate columns. A line without a number becomes a player
        without one. Anything past the 30th player is left out.
      </p>

      <h2 id="saved-squads">Squads saved with your clubs</h2>
      <p>
        <strong>Save as club</strong> stores the squad along with the club&apos;s name, colours
        and logo, so you only type it once. Choosing the club from{" "}
        <strong>Load a saved club</strong> next week brings the players back too. A saved fixture
        in <strong>Save / Restore Match Settings</strong> keeps both line-ups as well. See{" "}
        <Link href="/docs/match-settings#club-presets">club presets</Link>.
      </p>

      <h2 id="scorers">Picking the scorer</h2>
      <Figure caption="Typing in a scorer field offers that team's players. Anyone else can still be typed in by name.">
        <ImageSlot name="scorer-picker" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        Once a team has players, the scorer field next to each of its goals in the{" "}
        <strong>Goals</strong> panel becomes a list of that squad. Start typing a name or a shirt
        number and pick the player. Their number appears beside the field, and the goal banner
        shows the number with the name, for example 9 Ali Smith. Use{" "}
        <strong>Show on air</strong> next to the goal to put that banner up again with the name on
        it.
      </p>
      <p>
        The list is there to save typing, not to restrict you. For a player who isn&apos;t in the
        line-up, a late substitute or an own goal, type the name as before. The end screen lists
        every scorer either way. See{" "}
        <Link href="/docs/running-a-match#goals">goals and scorers</Link>.
      </p>

      <h2 id="line-up-screens">The line-up screens</h2>
      <Figure caption="The Home Line-up screen. With more than eleven players the list splits into two columns.">
        <ImageSlot name="screen-home-lineup" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        When a team has players, <strong>Home Line-up</strong> or <strong>Away Line-up</strong>{" "}
        appears with the other screens in <strong>Display Controls</strong>. Each shows the
        team&apos;s name, logo and colours above its players and their shirt numbers, in one
        column for up to eleven players and two columns for more.
      </p>
      <p>The same screens are available in two other places:</p>
      <ul>
        <li>
          On the Stream Deck, with the other screen buttons. See{" "}
          <Link href="/docs/shortcuts-and-stream-deck">Keyboard shortcuts and Stream Deck</Link>.
        </li>
        <li>
          As OBS pinned views, by adding <code>?screen=homeLineup</code> or{" "}
          <code>?screen=awayLineup</code> to the browser source URL. See{" "}
          <Link href="/docs/output-setup#pinned-views">pinned views</Link>.
        </li>
      </ul>

      <h2 id="rotating">Rotating screens</h2>
      <Figure caption="The Rotate screens panel sits under Display Controls on the dashboard.">
        <ImageSlot name="rotation-panel" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        Before kick-off and at half-time there is often nothing to do but leave a graphic up. The{" "}
        <strong>Rotate screens</strong> panel under Display Controls cycles the display through
        screens you choose, so you can put the laptop down and the stream still has something
        worth watching.
      </p>
      <ol>
        <li>
          Under <strong>Screens to show</strong>, tick the screens you want: the match title, the
          line-ups, the score bug, the scoreboard, penalties, the end screen and any full-screen
          graphics you have added. Choose at least two.
        </li>
        <li>
          Set <strong>Seconds per screen</strong>, anything from 3 to 600. The default is 10.
        </li>
        <li>
          Press <strong>Start rotating</strong>. The screens take turns in the order the panel
          lists them.
        </li>
      </ol>
      <p>
        The rotation stops as soon as you take over. Choosing a screen yourself, whether on the
        dashboard, the Stream Deck or the phone remote, stops it. So does starting the clock,
        pressing <strong>New match</strong> or restoring a match. You can also press{" "}
        <strong>Stop rotating</strong>.
      </p>

      <h2 id="half-time">Starting by itself at half-time</h2>
      <p>
        Switch on <strong>Start automatically at half-time</strong> and the rotation starts by
        itself whenever you stop the clock for a break with more of the match to come. That covers
        half-time, the breaks between periods with the generic timer, and the break before extra
        time. It never starts at full time, so the final score stays on air.
      </p>
      <p>
        Kicking off the next half starts the clock, which stops the rotation. With{" "}
        <strong>Auto switch screens on start and stop</strong> turned on, the score bug then goes
        back on air as usual.
      </p>
      <Callout>
        <p>
          The automatic start needs at least two screens it can show. It skips a custom graphic
          you have since deleted and a line-up you have emptied, so a gap in the list never puts a
          blank screen on air.
        </p>
      </Callout>
    </DocPage>
  );
}
