import Link from "next/link";
import { DocPage, docMetadata } from "@/components/docs/doc-page";
import { Callout } from "@/components/docs/callout";
import { Figure } from "@/components/figure";
import { ImageSlot } from "@/components/image-slot";

const SLUG = "phone-remote";
export const metadata = docMetadata(SLUG);

const SECTIONS = [
  { id: "set-up", title: "Set it up" },
  { id: "controls", title: "What the phone can do" },
  { id: "staying-in-sync", title: "Staying in sync" },
  { id: "security", title: "Security" },
];

export default function PhoneRemotePage() {
  return (
    <DocPage slug={SLUG} sections={SECTIONS}>
      <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="[&>*+*]:mt-4">
          <p>
            The phone remote is a small control page that PlayOverlay serves to phones on the same
            local network as the laptop, usually the same wifi. There is no app to install: the
            phone opens it in its web browser. It doesn&apos;t need an internet connection.
          </p>
          <p>
            It is off by default and stays off unless you turn it on.
          </p>
        </div>
        <Figure className="mx-auto w-full max-w-64">
          <ImageSlot name="phone-remote" sizes="256px" />
        </Figure>
      </div>

      <h2 id="set-up">Set it up</h2>
      <ol>
        <li>
          On the laptop, open <strong>System Settings → Phone Remote</strong> and switch it on. The
          default port is <code>3006</code>. The status should read Running.
        </li>
        <li>
          Connect the phone to the <strong>same network</strong> as the laptop.
        </li>
        <li>
          Scan the QR code shown in System Settings, or type the address shown there into the
          phone&apos;s browser. It looks like <code>http://192.168.1.20:3006/</code>, with your
          laptop&apos;s own address.
        </li>
        <li>
          Enter the six-digit <strong>PIN</strong> shown in System Settings. The phone now shows
          the live score, clock and on-air screen.
        </li>
      </ol>
      <p>
        System Settings also shows how many phones are connected. More than one can be paired at
        the same time.
      </p>

      <h2 id="controls">What the phone can do</h2>
      <ul>
        <li>Add or remove a goal for either team.</li>
        <li>Pause or resume the running clock.</li>
        <li>
          Step to the next match phase. This is also how you start each half from the phone.
        </li>
        <li>
          Switch the on-air graphic: score bug, match title, scoreboard, penalties, end screen or
          none.
        </li>
      </ul>
      <p>
        For anything else, such as stoppage time, scorers or penalties, use the dashboard.
      </p>
      <Callout>
        <p>
          The phone remote is in English only for now, whichever language the dashboard uses.
        </p>
      </Callout>

      <h2 id="staying-in-sync">Staying in sync</h2>
      <p>
        The phone mirrors the live match, so it always agrees with the dashboard and with any other
        paired phone. A tap on the phone goes through the same controls as a click on the laptop,
        so it can be undone in the same way.
      </p>
      <p>
        If a phone drops off the wifi, it reconnects by itself without asking for the PIN again.
        If PlayOverlay is offering to{" "}
        <Link href="/docs/running-a-match#crash-recovery">restore a match after a crash</Link>, the
        phone&apos;s controls pause and say why until someone answers on the laptop, so a tap
        can&apos;t overwrite the recovered score.
      </p>

      <h2 id="security">Security</h2>
      <p>
        While the phone remote is on, it listens on all of the laptop&apos;s network connections,
        so any device that can reach the laptop on your local network can open the page. It
        isn&apos;t reachable from the internet unless the network forwards that port to the laptop,
        which venue and home routers don&apos;t do by default.
      </p>
      <ul>
        <li>
          Pairing needs the six-digit PIN. A new PIN is made every time you turn the remote on and
          every time PlayOverlay restarts, so paired phones need the new PIN after that.
        </li>
        <li>
          Repeated wrong guesses are rate-limited per device. A device guessing PINs only locks
          itself out, never your phone.
        </li>
        <li>Other web pages can&apos;t send it commands.</li>
      </ul>
      <p>
        It is built for a trusted club or home network, not a busy public one. Leave it off when you
        don&apos;t need it, and treat the PIN like a password.
      </p>
      <p>
        Phone can&apos;t connect? See{" "}
        <Link href="/docs/troubleshooting#phone-remote">troubleshooting the phone remote</Link>.
      </p>
    </DocPage>
  );
}
