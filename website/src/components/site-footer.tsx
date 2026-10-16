import Image from "next/image";
import Link from "next/link";
import { ISSUES_URL, LICENSE_URL, RELEASES_PAGE_URL, REPO_URL, TRADEMARKS_URL } from "@/lib/github";
import { KOFI_URL } from "@/lib/site";
import { HeartIcon } from "@/components/icons";

const linkClass = "text-sm text-muted transition-colors hover:text-fg";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line bg-subtle">
      <div className="page-container grid grid-cols-1 gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex max-w-sm flex-col gap-3">
          <Link href="/" className="flex w-fit items-center gap-2.5 rounded-md">
            <Image src="/playoverlay-logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="font-semibold text-fg">PlayOverlay</span>
          </Link>
          <p className="text-sm leading-relaxed text-muted">
            Free, open-source score and match-clock graphics for community sports streams. For
            Windows, macOS and Linux.
          </p>
        </div>

        <nav aria-label="Product" className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-fg">Product</h2>
          <Link href="/download" className={linkClass}>
            Download
          </Link>
          <Link href="/docs" className={linkClass}>
            Guide
          </Link>
          <Link href="/docs/getting-started" className={linkClass}>
            Getting started
          </Link>
          <Link href="/docs/troubleshooting" className={linkClass}>
            Troubleshooting
          </Link>
        </nav>

        <nav aria-label="Project" className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-fg">Project</h2>
          <a href={REPO_URL} className={linkClass}>
            Source code
          </a>
          <a href={RELEASES_PAGE_URL} className={linkClass}>
            Releases
          </a>
          <a href={ISSUES_URL} className={linkClass}>
            Report a problem
          </a>
        </nav>

        <div className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-fg">Support</h2>
          <a href={KOFI_URL} className={`${linkClass} group inline-flex items-center gap-1.5`}>
            <HeartIcon className="h-4 w-4 transition-colors group-hover:text-[#ef4136]" />
            Support on Ko-fi
          </a>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="page-container flex flex-col gap-2 py-6 text-xs leading-relaxed text-faint lg:flex-row lg:justify-between lg:gap-8">
          <p>
            &copy; {year} Magic Zebra Ltd. PlayOverlay is open source under the{" "}
            <a href={LICENSE_URL} className="underline underline-offset-2 hover:text-fg">
              MIT licence
            </a>
            .
          </p>
          <p>
            The PlayOverlay name, logo and branding are owned by Magic Zebra Ltd and are not covered
            by the MIT licence.{" "}
            <a href={TRADEMARKS_URL} className="underline underline-offset-2 hover:text-fg">
              Trademarks
            </a>
          </p>
        </div>
      </div>
      <div className="brand-stripe" aria-hidden="true" />
    </footer>
  );
}
