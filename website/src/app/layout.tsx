import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PostHogProvider } from "@/components/posthog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://playoverlay.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PlayOverlay: live score and match-clock graphics for your stream",
    template: "%s | PlayOverlay",
  },
  description:
    "PlayOverlay is a free, open-source desktop app for adding a live score bug, match clock, and penalty tracker to your sports stream, chroma key or OBS browser source, no signup required.",
  openGraph: {
    title: "PlayOverlay: live score and match-clock graphics for your stream",
    description:
      "A free, open-source desktop app for live sports-score graphics, built for streaming community football to YouTube.",
    url: SITE_URL,
    siteName: "PlayOverlay",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PlayOverlay: live score and match-clock graphics for your stream",
    description:
      "A free, open-source desktop app for live sports-score graphics, built for streaming community football to YouTube.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <PostHogProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </PostHogProvider>
      </body>
    </html>
  );
}
