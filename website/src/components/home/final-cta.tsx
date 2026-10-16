import Link from "next/link";
import { KOFI_URL } from "@/lib/site";
import { ArrowRightIcon, DownloadIcon } from "@/components/icons";
import { buttonOnNavyPrimary, buttonOnNavySecondary } from "@/lib/ui";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="on-navy bg-navy py-20 sm:py-24">
      <div className="page-container text-center">
        <h2 id="cta-title" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Get the score on your next stream
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/80">
          Download PlayOverlay for Windows, macOS or Linux and set up your first match with the
          getting started guide.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/download" className={buttonOnNavyPrimary}>
            <DownloadIcon className="h-4 w-4" />
            Download PlayOverlay
          </Link>
          <Link href="/docs/getting-started" className={buttonOnNavySecondary}>
            Getting started
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <p className="mx-auto mt-10 max-w-xl text-sm leading-relaxed text-white/70">
          PlayOverlay is free and always will be. If it earns a place in your kit bag, you can{" "}
          <a href={KOFI_URL} className="font-medium text-white underline underline-offset-[3px] hover:decoration-2">
            support its development on Ko-fi
          </a>
          .
        </p>
      </div>
    </section>
  );
}
