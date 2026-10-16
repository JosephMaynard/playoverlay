import Image from "next/image";
import { SCREENSHOTS, type ScreenshotName } from "@/lib/screenshots";

interface ScreenshotProps {
  name: ScreenshotName;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/** One of the real app screenshots, at its natural aspect ratio. */
export function Screenshot({
  name,
  alt,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  className = "",
}: ScreenshotProps) {
  const shot = SCREENSHOTS[name];
  return (
    <Image
      src={shot.src}
      alt={alt ?? shot.alt}
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      className={`h-auto w-full ${className}`}
    />
  );
}
