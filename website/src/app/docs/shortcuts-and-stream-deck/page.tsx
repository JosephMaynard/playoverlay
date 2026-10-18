import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { Kbd } from "@/components/docs/kbd";
import { Figure } from "@/components/figure";
import { ImageSlot } from "@/components/image-slot";

const SLUG = "shortcuts-and-stream-deck";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "shortcuts", title: "Keyboard shortcuts" },
  { id: "system-wide", title: "Shortcuts while OBS has focus" },
  { id: "rebinding", title: "Changing a shortcut" },
  { id: "stream-deck", title: "Stream Deck" },
];

const SHORTCUTS = [
  { keys: "Cmd/Ctrl+Shift+Space", action: "Next match phase" },
  { keys: "Cmd/Ctrl+Shift+H", action: "Home team scored" },
  { keys: "Cmd/Ctrl+Shift+A", action: "Away team scored" },
  { keys: "Cmd/Ctrl+Z", action: "Undo" },
  { keys: "Cmd/Ctrl+Shift+Z", action: "Redo" },
];

export default function ShortcutsPage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <h2 id="shortcuts">Keyboard shortcuts</h2>
      <p>While PlayOverlay&apos;s window has focus, these work by default:</p>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table>
          <thead>
            <tr>
              <th scope="col">Shortcut</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((row) => (
              <tr key={row.keys}>
                <td>
                  <Kbd>{row.keys}</Kbd>
                </td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Use <Kbd>Cmd</Kbd> on a Mac and <Kbd>Ctrl</Kbd> on Windows and Linux. The first three can
        be changed. Undo and redo can&apos;t.
      </p>

      <h2 id="system-wide">Shortcuts while OBS has focus</h2>
      <p>
        During a stream you are often clicking around in OBS or your mixer software. The same
        actions work system-wide, whichever app has focus, with <Kbd>Alt</Kbd> added: for example{" "}
        <Kbd>Cmd/Ctrl+Alt+Shift+H</Kbd> for a home goal.
      </p>
      <p>
        If a shortcut you have set already includes <Kbd>Alt</Kbd>, there is no separate
        system-wide version of it. If another app has already claimed a system-wide shortcut, the
        Go live check lists it so you can pick a different one.
      </p>

      <h2 id="rebinding">Changing a shortcut</h2>
      <ol>
        <li>
          Open <strong>System Settings → Keyboard Shortcuts</strong>.
        </li>
        <li>
          Press <strong>Change</strong> next to the action, then press the new key combination.
        </li>
        <li>
          <strong>Reset</strong> puts that action back to its default.
        </li>
      </ol>
      <p>A few rules keep shortcuts from clashing with the rest of the app:</p>
      <ul>
        <li>The combination needs a modifier other than Shift: Cmd, Ctrl or Alt.</li>
        <li>
          Combinations PlayOverlay already uses are refused, such as undo and redo, copy, cut,
          paste and select all, and the shortcuts that quit or close the app.
        </li>
        <li>Two actions can&apos;t share a shortcut.</li>
        <li>
          On a Mac, Cmd and Ctrl are separate keys and are recorded as pressed. On Windows and
          Linux, use Ctrl or Alt. The Windows or Super key can&apos;t be used.
        </li>
      </ul>

      <h2 id="stream-deck">Stream Deck</h2>
      <Figure>
        <ImageSlot name="stream-deck" sizes="(min-width: 1024px) 768px, 100vw" />
      </Figure>
      <p>
        An Elgato Stream Deck gives you physical buttons for scoring, match phases and switching
        screens. PlayOverlay drives the deck directly, so you don&apos;t need Elgato&apos;s software
        or any plugin.
      </p>
      <ol>
        <li>Plug the Stream Deck into the laptop.</li>
        <li>
          Quit the Elgato Stream Deck app if it is running, including from the menu bar or system
          tray. Only one app can use the deck at a time.
        </li>
        <li>
          In PlayOverlay, open <strong>System Settings</strong> and press{" "}
          <strong>Connect to Stream Deck</strong>. The button changes to Stream Deck connected.
        </li>
      </ol>
      <p>
        The deck shows sets of buttons for scoring, match phases and screens. Press the PlayOverlay
        logo key to move to the next set.
      </p>
      <Callout>
        <p>
          Deck not connecting? It is nearly always another app holding it. See{" "}
          <Link href="/docs/troubleshooting#stream-deck">troubleshooting the Stream Deck</Link>.
        </p>
      </Callout>
    </DocPage>
  );
}
