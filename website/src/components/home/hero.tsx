import Link from "next/link";
import { ImageSlot } from "@/components/image-slot";
import { ArrowRightIcon, DownloadIcon } from "@/components/icons";
import { buttonOnNavyPrimary, buttonOnNavySecondary } from "@/lib/ui";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="on-navy relative overflow-hidden bg-navy pb-16 pt-14 sm:pb-24 sm:pt-20"
    >
      {/* Soft light from the top so the navy has some depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(39,170,225,0.22),transparent_70%)]"
      />
      <div className="page-container relative">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/85">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Free and open source for Windows, macOS and Linux
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Live score graphics for grassroots football streams
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            PlayOverlay is a desktop app that puts a score bug, match clock and goal banners on your
            stream. Send it to a vision mixer such as an ATEM Mini, or straight into OBS.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/download" className={buttonOnNavyPrimary}>
              <DownloadIcon className="h-4 w-4" />
              Download PlayOverlay
            </Link>
            <Link href="/docs/getting-started" className={buttonOnNavySecondary}>
              Read the guide
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/65">
            No account, no subscription, no watermark. MIT licensed.
          </p>
        </div>

        <figure className="mt-12 sm:mt-16">
          <div className="overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/15">
            <ImageSlot
              name="hero-match"
              priority
              sizes="(min-width: 1216px) 1152px, (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2rem)"
            />
          </div>
          <figcaption className="mt-3 text-sm text-white/60">
            The score bug and match clock, keyed over the camera feed by the vision mixer.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
