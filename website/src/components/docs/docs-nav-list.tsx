"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_GROUPS, docHref } from "@/lib/docs-nav";

/** The grouped list of guide pages, shared by the sidebar and mobile menu. */
export function DocsNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href="/docs"
          onClick={onNavigate}
          aria-current={pathname === "/docs" ? "page" : undefined}
          className={`block rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            pathname === "/docs"
              ? "bg-subtle text-fg"
              : "text-muted hover:bg-subtle hover:text-fg"
          }`}
        >
          Guide overview
        </Link>
      </div>
      {DOC_GROUPS.map((group) => (
        <div key={group.title}>
          <h2 className="px-3 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
            {group.title}
          </h2>
          <ul className="mt-2 flex flex-col gap-0.5">
            {group.pages.map((page) => {
              const href = docHref(page.slug);
              const active = pathname === href;
              return (
                <li key={page.slug}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`relative block rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-subtle font-semibold text-fg before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent"
                        : "text-muted hover:bg-subtle hover:text-fg"
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
