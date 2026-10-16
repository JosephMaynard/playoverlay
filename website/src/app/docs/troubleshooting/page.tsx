import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/code-block";
import { NEW_ISSUE_URL } from "@/lib/github";

const SLUG = "troubleshooting";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "first-launch", title: "Security warnings on first launch" },
  { id: "display", title: "Graphics not showing on the mixer" },
  { id: "keying", title: "Problems with the key" },
  { id: "obs", title: "OBS shows nothing" },
  { id: "stream-deck", title: "Stream Deck won't connect" },
  { id: "phone-remote", title: "Phone can't reach the remote" },
  { id: "shortcuts", title: "A shortcut doesn't work" },
  { id: "diagnostics", title: "Export diagnostics" },
];

export default function TroubleshootingPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <Callout title="Before kick-off, run the Go live check">
        <p>
          The green <strong>Go live check</strong> button under the dashboard preview catches most
          of the problems on this page: the output window on the wrong screen, missing logos,
          shortcuts another app has taken, and the OBS source or phone remote failing to start. It
          only looks, it never changes anything.
        </p>
      </Callout>

      <h2 id="first-launch">Security warnings on first launch</h2>
      <p>
        PlayOverlay&apos;s builds aren&apos;t code-signed (the certificates cost money every year
        and the app is free), so Windows and macOS warn you the first time you open it. You only
        need to do this once.
      </p>
      <h3>Windows: &quot;Windows protected your PC&quot;</h3>
      <p>
        SmartScreen shows this for apps it doesn&apos;t recognise. Click{" "}
        <strong>More info</strong>, then <strong>Run anyway</strong>.
      </p>
      <h3>macOS: &quot;PlayOverlay is damaged&quot; or &quot;unidentified developer&quot;</h3>
      <p>
        The app isn&apos;t damaged. macOS adds a quarantine flag to downloaded apps and refuses to
        open unsigned ones that have it. Move <code>PlayOverlay.app</code> to your Applications
        folder, open Terminal, and run:
      </p>
      <CodeBlock code="xattr -cr /Applications/PlayOverlay.app" />
      <p>Then open PlayOverlay again.</p>
      <p>
        If you&apos;d rather not run an unsigned build, you can build PlayOverlay from source. See
        the <Link href="/download#first-launch">download page</Link>.
      </p>

      <h2 id="display">Graphics not showing on the mixer</h2>
      <ul>
        <li>
          <strong>The laptop is mirroring, not extending.</strong> Set the display to extend (on
          Windows, <strong>Windows key + P</strong> then <strong>Extend</strong>). With mirroring,
          the mixer shows your dashboard.
        </li>
        <li>
          <strong>The display window is on the wrong screen.</strong> Open Window Settings and use{" "}
          <strong>Move to Screen</strong>. If a window has ended up somewhere you can&apos;t see it,{" "}
          <strong>Reset positions</strong> brings both windows back.
        </li>
        <li>
          <strong>Nothing is on air.</strong> Check that Display Controls isn&apos;t set to{" "}
          <strong>None</strong>, and that the mixer&apos;s key is on air.
        </li>
        <li>
          <strong>The output is blank after a restart.</strong> PlayOverlay is waiting for you to
          answer <em>Restore previous match?</em> on the dashboard. The outputs stay blank until
          you do, so they never show a wrong score.
        </li>
      </ul>

      <h2 id="keying">Problems with the key</h2>
      <ul>
        <li>
          <strong>Part of a team&apos;s graphic is see-through.</strong> A team colour is too close
          to the key colour. Change the key colour in{" "}
          <strong>Window Settings → Key Colour</strong> and re-sample it on the mixer.
        </li>
        <li>
          <strong>A coloured fringe around text and logos.</strong> Tighten the keyer&apos;s edge
          or spill settings, and check the laptop output is 1920 × 1080 so the mixer isn&apos;t
          scaling it.
        </li>
        <li>
          <strong>The whole frame is solid blue.</strong> The key isn&apos;t on air, or its fill
          source is set to the wrong input. See{" "}
          <Link href="/docs/output-setup#chroma-key">setting up the key</Link>.
        </li>
      </ul>

      <h2 id="obs">OBS shows nothing</h2>
      <ul>
        <li>
          Check <strong>System Settings → OBS Browser Source</strong> is switched on and the status
          reads Running. If it shows an error, another program may be using the port: change the
          port and update the URL in OBS.
        </li>
        <li>
          OBS must run on the same computer as PlayOverlay, and the URL must start with{" "}
          <code>http://127.0.0.1:</code> followed by the port.
        </li>
        <li>
          Set the browser source&apos;s width and height to your canvas size, and make sure it sits
          above the camera in the scene&apos;s source list.
        </li>
        <li>
          If the URL ends in <code>?screen=</code>, that view is pinned and won&apos;t follow what
          you put on air. See <Link href="/docs/output-setup#pinned-views">pinned views</Link>.
        </li>
      </ul>

      <h2 id="stream-deck">Stream Deck won&apos;t connect</h2>
      <p>
        Only one app can use a Stream Deck at a time. If <strong>Connect to Stream Deck</strong>{" "}
        does nothing, or the deck stays dark:
      </p>
      <ol>
        <li>
          Quit the Elgato Stream Deck app completely, including from the menu bar on a Mac or the
          system tray on Windows, and any other software that controls the deck.
        </li>
        <li>Unplug the deck and plug it back in.</li>
        <li>
          Press <strong>Connect to Stream Deck</strong> in System Settings again.
        </li>
      </ol>

      <h2 id="phone-remote">Phone can&apos;t reach the remote</h2>
      <ul>
        <li>
          <strong>Check it is running.</strong> <strong>System Settings → Phone Remote</strong>{" "}
          should be on with the status Running. If it shows an error, try a different port.
        </li>
        <li>
          <strong>Same network.</strong> The phone must be on the same wifi as the laptop, not on
          mobile data. Turn mobile data off on the phone while you test.
        </li>
        <li>
          <strong>Guest wifi.</strong> Many venue and guest networks stop devices seeing each other.
          If that is the case, connect the laptop to a hotspot on the phone instead, which needs no
          internet connection for this.
        </li>
        <li>
          <strong>Firewall.</strong> If your computer asked whether PlayOverlay may accept incoming
          connections, allow it. Check your firewall settings if you dismissed the prompt.
        </li>
        <li>
          <strong>Old address or PIN.</strong> The laptop&apos;s address can change between
          networks, and the PIN changes every time PlayOverlay restarts or the remote is turned on.
          Scan the QR code again and enter the current PIN.
        </li>
        <li>
          <strong>Locked out after wrong PINs.</strong> Wrong guesses are rate-limited per device.
          Wait a little, then try the correct PIN.
        </li>
      </ul>

      <h2 id="shortcuts">A shortcut doesn&apos;t work</h2>
      <p>
        If a system-wide shortcut does nothing while another app has focus, that app has probably
        claimed the same combination. The Go live check lists any shortcut PlayOverlay couldn&apos;t
        register. Pick a different combination in{" "}
        <Link href="/docs/shortcuts-and-stream-deck#rebinding">System Settings → Keyboard Shortcuts</Link>.
      </p>

      <h2 id="diagnostics">Export diagnostics</h2>
      <p>
        If something goes wrong that this page doesn&apos;t cover, a diagnostics report helps get it
        fixed.
      </p>
      <ol>
        <li>
          Open <strong>System Settings</strong> and press <strong>Export diagnostics</strong>{" "}
          under Diagnostics.
        </li>
        <li>
          Choose where to save the text file. It contains the app and system versions, your
          settings, the status of the OBS source and phone remote, and recent log entries. It
          contains no passwords, and the remote&apos;s PIN is left out.
        </li>
        <li>
          <a href={NEW_ISSUE_URL}>Open an issue on GitHub</a>, describe what happened and what you
          expected, and attach the file.
        </li>
      </ol>
    </DocPage>
  );
}
