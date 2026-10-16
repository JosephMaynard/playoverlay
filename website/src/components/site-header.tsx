"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPO_URL } from "@/lib/github";
import { KOFI_URL } from "@/lib/site";
import { GitHubIcon, HeartIcon, MenuIcon, CloseIcon } from "@/components/icons";

const NAV_LINKS = [
  { href: "/docs", label: "Guide" },
  { href: "/download", label: "Download" },
];

function isActive(pathname: string | null, href: string) {
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  // The menu is open "for" the page it was opened on, so navigating anywhere
  // closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn !== null && openOn === pathname;

  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpenOn(null);
      }}
    >
      <div className="page-container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 rounded-md font-semibold text-fg">
          <Image
            src="/playoverlay-logo.svg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="text-lg tracking-tight">PlayOverlay</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href={REPO_URL}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            <GitHubIcon className="h-4 w-4" />
            GitHub
          </a>
          <a
            href={KOFI_URL}
            className="group inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            <HeartIcon className="h-4 w-4 transition-colors group-hover:text-[#ef4136]" />
            Support
          </a>
          <Link
            href="/download"
            className="ml-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
          >
            Download
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpenOn(menuOpen ? null : pathname)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-fg md:hidden"
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          {menuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="border-t border-line bg-bg md:hidden"
        >
          <ul className="page-container flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  onClick={() => setOpenOn(null)}
                  className="block rounded-md px-3 py-2.5 text-base font-medium text-fg hover:bg-subtle"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={REPO_URL}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-fg hover:bg-subtle"
              >
                <GitHubIcon className="h-4 w-4" />
                GitHub
              </a>
            </li>
            <li>
              <a
                href={KOFI_URL}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-fg hover:bg-subtle"
              >
                <HeartIcon className="h-4 w-4" />
                Support PlayOverlay
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
