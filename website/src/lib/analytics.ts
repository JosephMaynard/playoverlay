// Cookieless PostHog analytics, gated so it only ever runs in a production
// deployment that has been given a project key. Everything here is written
// to no-op silently otherwise (local dev, CI builds, previews without the
// env var set), never to throw and never to block rendering.
"use client";

import posthog from "posthog-js";

let initialized = false;

function isConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === "string" &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY.length > 0 &&
    process.env.NODE_ENV === "production"
  );
}

/** Initializes PostHog once, client-side only, if (and only if) configured. */
export function initAnalytics(): void {
  if (initialized || typeof window === "undefined" || !isConfigured()) return;

  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      // Cookieless by design: keep everything in memory for the tab's
      // lifetime instead of writing cookies or localStorage.
      persistence: "memory",
      disable_session_recording: true,
      capture_pageview: false, // pageviews are captured manually on route change
    });
    initialized = true;
  } catch {
    // Never let analytics break the page.
  }
}

export function isAnalyticsEnabled(): boolean {
  return initialized;
}

export function trackPageview(url: string): void {
  if (!isAnalyticsEnabled()) return;
  try {
    posthog.capture("$pageview", { $current_url: url });
  } catch {
    // no-op
  }
}

export function trackDownloadClick(platform: string): void {
  if (!isAnalyticsEnabled()) return;
  try {
    posthog.capture("download_click", { platform });
  } catch {
    // no-op
  }
}
