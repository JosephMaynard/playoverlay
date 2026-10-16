import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { Kbd } from "@/components/docs/kbd";
import { Figure } from "@/components/figure";
import { ImageSlot } from "@/components/image-slot";

const SLUG = "running-a-match";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "clock", title: "The match clock" },
  { id: "phases", title: "Match phases" },
  { id: "stoppage-time", title: "Stoppage time" },
  { id: "goals", title: "Goals and scorers" },
  { id: "goal-banner", title: "The goal banner" },
  { id: "penalties", title: "Penalty shootouts" },
  { id: "undo", title: "Undo and redo" },
  { id: "new-match", title: "Starting a new match" },
  { id: "crash-recovery", title: "Crash recovery" },
];

export default function RunningAMatchPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <h2 id="clock">The match clock</h2>
      <p>
        The <strong>Time</strong> panel shows the elapsed match time in large figures, and the
        current phase with the time remaining in it. The clock is driven by your computer&apos;s
        system clock rather than counting ticks, so it doesn&apos;t drift over a half even if the
        laptop is busy.
      </p>
      <ul>
        <li>
          <strong>Pause</strong> and <strong>Resume</strong> stop and restart the running clock,
          for a long injury break or a stoppage the referee stops the watch for.
        </li>
        <li>
          The pencil icon on the clock opens <strong>Adjust Time</strong>, with buttons to move the
          clock forwards or back by seconds or minutes. Use it to line up with the referee&apos;s
          watch.
        </li>
        <li>
          <strong>Stop</strong> ends the current phase. Use it at half-time and full time.
        </li>
      </ul>

      <h2 id="phases">Match phases</h2>
      <p>
        Each phase has its own button: <strong>First Half</strong>, <strong>Second Half</strong>,
        and <strong>Extra Time First Half</strong> and <strong>Extra Time Second Half</strong> if
        extra time is switched on for the match. With the generic timer you get one button per
        period instead. Pressing a phase button starts the clock from that phase&apos;s start time,
        so <strong>Second Half</strong> in a 45-minute game starts at 45:00.
      </p>
      <p>
        The <strong>Next match phase</strong> shortcut (<Kbd>Cmd/Ctrl+Shift+Space</Kbd>), the
        Stream Deck and the phone remote all step to the next phase, so you can start the second
        half without reaching for the mouse.
      </p>
      <p>
        <strong>Auto switch screens on start and stop</strong>, under the phase buttons, changes
        the on-air graphic for you: starting a phase puts the score bug on air, and pressing Stop
        brings back the match title. Turn it off if you&apos;d rather choose every screen yourself.
      </p>
      <p>
        To keep the display busy during the break, the <strong>Rotate screens</strong> panel can
        cycle through the match title, line-ups and other screens, and can start by itself when
        you stop the clock at half-time. See{" "}
        <Link href="/docs/line-ups#rotating">rotating screens</Link>.
      </p>

      <h2 id="stoppage-time">Stoppage time</h2>
      <p>
        When the fourth official (or the referee&apos;s raised fingers) shows the added time, press{" "}
        <strong>Set Additional Time</strong> and choose from 1 to 17 minutes. The score bug shows
        it next to the clock, for example +3. <strong>Clear</strong> removes it. Goals scored in
        stoppage time are logged in the broadcast style, such as 45+2&apos;.
      </p>

      <h2 id="goals">Goals and scorers</h2>
      <p>
        Press <strong>Home Team Scored</strong> or <strong>Away Team Scored</strong> when a goal
        goes in. PlayOverlay logs the goal and, if the clock is running, its minute: 23&apos; or
        45+2&apos;. To correct a score without logging a goal, use the pencil icon on that
        team&apos;s score to raise or lower it.
      </p>
      <p>
        The <strong>Goals</strong> panel lists every goal as it happens. When there is a quiet
        moment, usually at half-time, type each scorer&apos;s name next to their goal. The end
        screen then lists each team&apos;s scorers with their minutes, like
        &quot;Smith 23&apos;, 67&apos;&quot;. Goals without a name still appear, as bare minutes.
        You can also remove a goal from the log there.
      </p>
      <p>
        If you have entered the team&apos;s line-up, the scorer field offers its players as you
        type, by name or shirt number, and you can still type any other name. See{" "}
        <Link href="/docs/line-ups#scorers">picking the scorer</Link>.
      </p>

      <h2 id="goal-banner">The goal banner</h2>
      <Figure caption="The goal banner, with the scoring team, the scorer picked from the line-up and the minute.">
        <ImageSlot name="screen-goal-banner" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        Every goal puts a banner on air straight away, with the team and the minute and no typing.
        To show a banner again later, for a replay or a highlight, press{" "}
        <strong>Show on air</strong> next to that goal in the Goals panel. Once you have added
        the scorer, the banner includes their name, with the shirt number if you picked them from
        the line-up.
      </p>
      <p>
        If you&apos;d rather not show banners automatically, turn off{" "}
        <strong>Show the goal banner on air as soon as a goal is scored</strong> in the Goals
        panel. Goals are still logged.
      </p>

      <h2 id="penalties">Penalty shootouts</h2>
      <p>
        The <strong>Penalties</strong> panel tracks a shootout kick by kick. Choose which team goes
        first, then press <strong>Score</strong> or <strong>Miss</strong> after each kick.
        PlayOverlay alternates the teams for you and shows whose kick is next.{" "}
        <strong>Undo Last Action</strong> takes back a mistaken entry, and{" "}
        <strong>Reset Penalties</strong> clears the shootout after asking you to confirm.
      </p>
      <p>
        Put the <strong>Penalties</strong> screen on air to show the shootout board on the stream.
        The end screen includes the shootout result. If a match can&apos;t go to penalties, switch
        them off in <Link href="/docs/match-settings#match-details">Match Settings</Link>.
      </p>

      <h2 id="undo">Undo and redo</h2>
      <p>
        The undo and redo arrows in the dashboard header step back and forward through goals, score
        changes, scorer names, clock and phase changes, stoppage time, screen switches and
        penalties. Hover over them to see exactly what will be undone, for example &quot;Undo home
        goal&quot;. The keyboard shortcuts are <Kbd>Cmd/Ctrl+Z</Kbd> and{" "}
        <Kbd>Cmd/Ctrl+Shift+Z</Kbd>.
      </p>
      <p>Undo never rewinds a running clock, so taking back a goal doesn&apos;t lose match time.</p>

      <h2 id="new-match">Starting a new match</h2>
      <p>
        <strong>New match</strong>, next to undo and redo, gets you ready for the next fixture. It
        resets the scores, penalties, goal log, clock and on-air graphics, clears the undo history,
        and puts the match title on air. Team settings are kept, so you only change what is
        different about the next game. PlayOverlay asks you to confirm first.
      </p>

      <h2 id="crash-recovery">Crash recovery</h2>
      <p>
        PlayOverlay saves the score, clock and match state as the match goes on. If the app closes
        mid-match, because the laptop restarted or the battery ran out, it offers to restore the
        match the next time it opens:{" "}
        <em>Restore previous match?</em>, with the teams, score and time when it closed.
      </p>
      <ul>
        <li>Restoring brings back the score and clock, with the clock paused. Resume when ready.</li>
        <li>
          Until you answer, the outputs stay blank rather than showing a false 0-0 on the stream.
        </li>
        <li>
          Paired phones and system-wide shortcuts wait too, so a tap can&apos;t overwrite the
          recovered score.
        </li>
      </ul>
      <Callout>
        <p>
          The Go live check warns you if there is an unfinished match from an earlier session, so
          you can restore or dismiss it before kick-off.
        </p>
      </Callout>
    </DocPage>
  );
}
