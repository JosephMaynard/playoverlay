"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, trackPageview } from "@/lib/analytics";

/**
 * Initializes PostHog (if configured) once on mount, then fires a manual
 * $pageview on every client-side route change. App Router navigations don't
 * trigger a full page load, so pageviews have to be captured from a client
 * component watching the pathname rather than relying on PostHog's own
 * automatic pageview capture.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    trackPageview(window.location.origin + pathname);
  }, [pathname]);

  return <>{children}</>;
}
