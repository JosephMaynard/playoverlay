import type { Metadata } from "next";
import Link from "next/link";
import { ISSUES_URL } from "@/lib/github";
import { docHref, getDocGroupTitle, getDocNeighbours, getDocPage } from "@/lib/docs-nav";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";

export interface DocSection {
  id: string;
  title: string;
}

/** Metadata for a guide page, taken from the shared docs navigation. */
export function docMetadata(slug: string): Metadata {
  const page = getDocPage(slug);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: docHref(slug) },
  };
}

interface DocPageProps {
  slug: string;
  /** The page's h2 sections, listed as "On this page" on wide screens. */
  sections?: DocSection[];
  children: React.ReactNode;
}

/**
 * The frame every guide page shares: group label, title, intro, an
 * "On this page" list, the content (styled by .prose-doc) and previous/next
 * links.
 */
export function DocPage({ slug, sections = [], children }: DocPageProps) {
  const page = getDocPage(slug);
  const group = getDocGroupTitle(slug);
  const { previous, next } = getDocNeighbours(slug);

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-12">
      <article className="min-w-0 max-w-3xl">
        <header className="border-b border-line pb-8">
          {group && (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">
              {group}
            </p>
          )}
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{page.description}</p>
        </header>

        <div className="prose-doc mt-8">{children}</div>

        <nav
          aria-label="Previous and next pages"
          className="mt-16 grid grid-cols-1 gap-4 border-t border-line pt-8 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={docHref(previous.slug)}
              className="group rounded-xl border border-line p-4 transition-colors hover:border-line-strong hover:bg-subtle"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-faint">
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Previous
              </span>
              <span className="mt-1 block font-semibold text-fg">{previous.title}</span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next && (
            <Link
              href={docHref(next.slug)}
              className="group rounded-xl border border-line p-4 text-right transition-colors hover:border-line-strong hover:bg-subtle"
            >
              <span className="flex items-center justify-end gap-1.5 text-xs font-medium text-faint">
                Next
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </span>
              <span className="mt-1 block font-semibold text-fg">{next.title}</span>
            </Link>
          )}
        </nav>

        <p className="mt-8 text-sm text-faint">
          Something unclear or out of date on this page?{" "}
          <a
            href={ISSUES_URL}
            className="font-medium text-link underline underline-offset-[3px]"
          >
            Open an issue on GitHub
          </a>
          .
        </p>
      </article>

      {sections.length > 0 && (
        <aside className="hidden xl:block">
          <nav aria-label="On this page" className="sticky top-28">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
              On this page
            </h2>
            <ul className="mt-3 flex flex-col gap-2 border-l border-line text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l border-transparent pl-3 text-muted transition-colors hover:border-fg hover:text-fg"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  );
}
