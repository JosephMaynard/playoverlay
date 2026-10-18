import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/code-block";
import { Figure } from "@/components/figure";
import { ImageSlot } from "@/components/image-slot";

const SLUG = "output-setup";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "which", title: "Which one do I need?" },
  { id: "chroma-key", title: "Chroma key into an ATEM Mini" },
  { id: "obs", title: "OBS browser source" },
  { id: "pinned-views", title: "Pinned views" },
  { id: "venue-scoreboard", title: "Venue scoreboard" },
];

export default function OutputSetupPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <h2 id="which">Which one do I need?</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">If you stream with</th>
            <th scope="col">Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A hardware vision mixer, such as an ATEM Mini</td>
            <td>
              <a href="#chroma-key">Chroma key over HDMI</a>
            </td>
          </tr>
          <tr>
            <td>OBS on the same computer as PlayOverlay</td>
            <td>
              <a href="#obs">OBS browser source</a>
            </td>
          </tr>
          <tr>
            <td>No stream, but there is a TV at the ground</td>
            <td>
              <a href="#venue-scoreboard">Venue scoreboard</a>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        These combine. You can key the score bug on your mixer and show the scoreboard on a
        clubhouse TV from the same laptop.
      </p>

      <h2 id="chroma-key">Chroma key into an ATEM Mini</h2>
      <Figure caption="A typical touchline setup: camera and laptop both plugged into the ATEM Mini.">
        <ImageSlot name="setup-atem" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        The laptop treats the mixer as a second monitor. PlayOverlay&apos;s display window goes
        full screen on it, and the mixer keys out the solid background colour so only the graphics
        sit over the camera picture. These steps use a Blackmagic ATEM Mini. Other mixers with a
        chroma keyer work the same way, with different button names.
      </p>
      <h3>1. Connect the laptop</h3>
      <ol>
        <li>
          Plug the laptop&apos;s HDMI output into a spare HDMI input on the ATEM Mini, for example
          input 4. Your cameras stay on the other inputs.
        </li>
        <li>
          Set the laptop to <strong>extend</strong> its desktop onto the new display, not mirror
          it. On Windows press <strong>Windows key + P</strong> and choose{" "}
          <strong>Extend</strong>. On a Mac, open <strong>System Settings → Displays</strong> and
          make sure the ATEM is not set to mirror. On Linux, use your desktop&apos;s display
          settings.
        </li>
        <li>
          Set that display to <strong>1920 × 1080</strong>. The ATEM Mini converts what it is
          given, but a matching resolution keeps the graphics sharp.
        </li>
      </ol>
      <h3>2. Put the display window on the ATEM</h3>
      <ol>
        <li>
          In PlayOverlay, open <strong>Window Settings</strong> and press{" "}
          <strong>Move to Screen 2</strong> (or whichever number the ATEM is).
        </li>
        <li>
          Press <strong>Toggle Fullscreen</strong>, then <strong>Lock Windows</strong> so nothing
          gets dragged off by accident.
        </li>
        <li>
          Run the <strong>Go live check</strong>. It warns you if the display window is still on
          the same screen as the dashboard.
        </li>
      </ol>
      <h3>3. Set up the key</h3>
      <ol>
        <li>
          Open <strong>ATEM Software Control</strong> on the laptop (or another computer connected
          to the ATEM) and go to the <strong>Switcher</strong> page.
        </li>
        <li>
          In the palette on the right, open <strong>Upstream Key 1</strong> and choose{" "}
          <strong>Chroma</strong> as the key type.
        </li>
        <li>
          Set <strong>Fill Source</strong> to the HDMI input the laptop is plugged into.
        </li>
        <li>
          Pick the key colour: use the sample tool on the blue background, or set the hue to blue
          on models without one. Adjust the key until the background disappears and the edges of
          the graphics stay clean.
        </li>
        <li>
          Put the key on air with <strong>On Air</strong> next to Upstream Key 1, or{" "}
          <strong>KEY ON</strong> on the ATEM Mini&apos;s panel. The graphics now sit over whichever
          camera is live, and stay there as you cut between cameras.
        </li>
      </ol>
      <p>
        Leave the key on for the whole match. To take the graphics off the stream, choose{" "}
        <strong>None</strong> in PlayOverlay&apos;s Display Controls. The mixer keeps keying an
        empty screen, so you don&apos;t have to touch it.
      </p>
      <Callout tone="warning" title="If a team turns see-through">
        <p>
          Something in the graphics is too close to the key colour, usually a team in blue. Change
          the key colour in PlayOverlay&apos;s <strong>Window Settings → Key Colour</strong> to one
          neither team wears, then re-sample it on the mixer. See{" "}
          <Link href="/docs/screens#key-colour">choosing a key colour</Link>.
        </p>
      </Callout>

      <h2 id="obs">OBS browser source</h2>
      <Figure>
        <ImageSlot name="obs-browser-source" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        If you stream with OBS, you can skip the second display and the chroma key. PlayOverlay
        serves the graphics as a web page with a transparent background, and OBS lays it over your
        scene. It is off by default.
      </p>
      <ol>
        <li>
          In PlayOverlay, open <strong>System Settings → OBS Browser Source</strong> and switch it
          on. The default port is <code>4750</code>. The status should read Running.
        </li>
        <li>
          In OBS, add a <strong>Browser</strong> source to your scene, above the camera.
        </li>
        <li>
          Set its URL to the one shown in PlayOverlay, and its width and height to your OBS canvas
          size, for example 1920 and 1080.
        </li>
      </ol>
      <CodeBlock label="Browser source URL" code="http://127.0.0.1:4750/" />
      <p>
        That&apos;s all. The background is transparent, so there is nothing to key. The page
        updates live and reconnects by itself if OBS or PlayOverlay restarts mid-stream.
      </p>
      <Callout title="Same computer only">
        <p>
          The browser source only listens on <code>127.0.0.1</code>, so OBS has to run on the same
          computer as PlayOverlay. Other devices on the network can&apos;t connect to it. If you
          change the port, use the new number in the URL.
        </p>
      </Callout>

      <h2 id="pinned-views">Pinned views</h2>
      <p>
        By default the browser source shows whatever the operator has on air. Add{" "}
        <code>?screen=</code> and a screen name to the URL to pin a view to one screen,
        whatever the operator selects. This lets a second OBS scene, or a venue TV, show something
        different from the main feed while both come from the same running app.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">
              <code>?screen=</code> value
            </th>
            <th scope="col">Shows</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>(none)</td>
            <td>Follows the operator (the default)</td>
          </tr>
          <tr>
            <td>
              <code>matchTitle</code>
            </td>
            <td>Match title</td>
          </tr>
          <tr>
            <td>
              <code>scoreBug</code>
            </td>
            <td>Score bug</td>
          </tr>
          <tr>
            <td>
              <code>penalties</code>
            </td>
            <td>Penalties</td>
          </tr>
          <tr>
            <td>
              <code>endScreen</code>
            </td>
            <td>End screen</td>
          </tr>
          <tr>
            <td>
              <code>scoreboard</code>
            </td>
            <td>Spectator scoreboard</td>
          </tr>
          <tr>
            <td>
              <code>homeLineup</code>
            </td>
            <td>Home team line-up</td>
          </tr>
          <tr>
            <td>
              <code>awayLineup</code>
            </td>
            <td>Away team line-up</td>
          </tr>
        </tbody>
      </table>
      <p>
        Only the built-in screens can be pinned. Custom screens, and any value PlayOverlay
        doesn&apos;t recognise, follow the operator. System Settings shows a ready-made URL for the
        scoreboard view with a copy button.
      </p>

      <h2 id="venue-scoreboard">Venue scoreboard</h2>
      <Figure caption="The Scoreboard screen on a clubhouse TV.">
        <ImageSlot name="venue-scoreboard" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        The Scoreboard screen is made for spectators: both teams in their club colours, the score,
        the time of day and the match clock, big enough to read across a room. There are two ways
        to get it onto a TV or projector.
      </p>
      <h3>Without a stream</h3>
      <p>
        Connect the TV to the laptop as a second display, move the display window onto it as you
        would for a mixer, and put <strong>Scoreboard</strong> on air. The TV shows the scoreboard
        with no key colour around it.
      </p>
      <h3>Alongside a stream</h3>
      <p>
        Keep the stream fed as usual, and give the TV its own pinned view. Turn on the OBS browser
        source, then on the PlayOverlay computer open this address in a web browser, move that
        browser window to the display connected to the TV and make it full screen:
      </p>
      <CodeBlock label="Scoreboard view" code="http://127.0.0.1:4750/?screen=scoreboard" />
      <p>
        Because the browser source only serves the computer it runs on, the TV has to be connected
        to the PlayOverlay computer. A smart TV&apos;s own browser can&apos;t reach it.
      </p>
    </DocPage>
  );
}
