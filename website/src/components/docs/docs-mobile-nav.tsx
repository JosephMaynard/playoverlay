"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { DOC_PAGES, docHref } from "@/lib/docs-nav";
import { ChevronDownIcon } from "@/components/icons";
import { DocsNavList } from "@/components/docs/docs-nav-list";

/** The guide menu for small screens: a bar under the header that expands. */
export function DocsMobileNav() {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn !== null && openOn === pathname;
  const current =
    DOC_PAGES.find((page) => docHref(page.slug) === pathname)?.title ?? "Guide overview";

  return (
    <div
      className="sticky top-16 z-30 -mx-4 border-b border-line bg-bg/95 backdrop-blur sm:-mx-8 lg:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpenOn(null);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="docs-mobile-menu"
        onClick={() => setOpenOn(open ? null : pathname)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-8"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-faint">
            Guide menu
          </span>
          <span className="block truncate text-sm font-medium text-fg">{current}</span>
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 flex-none text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <nav
          id="docs-mobile-menu"
          aria-label="Guide"
          className="max-h-[70vh] overflow-y-auto border-t border-line px-1 py-5 sm:px-5"
        >
          <DocsNavList onNavigate={() => setOpenOn(null)} />
        </nav>
      )}
    </div>
  );
}
