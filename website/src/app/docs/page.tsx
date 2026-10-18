import type { Metadata } from "next";
import Link from "next/link";
import { DOC_GROUPS, docHref } from "@/lib/docs-nav";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Guide",
  description:
    "How to install PlayOverlay, set up a match, run it live, and get the graphics into an ATEM Mini, OBS or a venue screen.",
  alternates: { canonical: "/docs" },
};

export default function DocsIndexPage() {
  return (
    <div className="max-w-3xl">
      <header className="border-b border-line pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">Guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          The PlayOverlay guide
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Everything you need to put live graphics on a match: installing the app, setting up the
          teams, running the match, and getting the output into your mixer, OBS or a venue screen.
          New to PlayOverlay? Start with{" "}
          <Link
            href="/docs/getting-started"
            className="font-medium text-link underline underline-offset-[3px]"
          >
            Getting started
          </Link>
          .
        </p>
      </header>

      {DOC_GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={`group-${group.title.toLowerCase().replace(/\s+/g, "-")}`} className="mt-10">
          <h2
            id={`group-${group.title.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-xs font-semibold uppercase tracking-[0.12em] text-faint"
          >
            {group.title}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.pages.map((page) => (
              <li key={page.slug} className={group.pages.length === 1 ? "sm:col-span-2" : ""}>
                <Link
                  href={docHref(page.slug)}
                  className="group flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-subtle"
                >
                  <span className="flex items-center justify-between gap-3 font-semibold text-fg">
                    {page.title}
                    <ArrowRightIcon className="h-4 w-4 flex-none text-faint transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-2 text-sm leading-relaxed text-muted">{page.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
