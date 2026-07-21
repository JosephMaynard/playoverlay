"use client";

import { trackDownloadClick } from "@/lib/analytics";

interface DownloadButtonProps {
  href: string;
  platform: string;
  children: React.ReactNode;
  className?: string;
}

/** A download link that records which platform was clicked before navigating. */
export function DownloadButton({ href, platform, children, className }: DownloadButtonProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackDownloadClick(platform)}
    >
      {children}
    </a>
  );
}
