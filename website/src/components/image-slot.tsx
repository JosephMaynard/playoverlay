import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { IMAGE_SLOTS, type ImageSlotName } from "@/lib/image-slots";

const EXTENSIONS = ["webp", "avif", "jpg", "jpeg", "png"] as const;
const IMAGES_DIR = path.join(process.cwd(), "public", "images");

/**
 * Returns the public URL of the slot's image if a file for it exists, or
 * null. Runs on the server while the page renders, which for these static
 * pages means at build time: drop a file into public/images and rebuild.
 */
function findSlotImage(name: ImageSlotName): string | null {
  for (const ext of EXTENSIONS) {
    if (fs.existsSync(path.join(IMAGES_DIR, `${name}.${ext}`))) {
      return `/images/${name}.${ext}`;
    }
  }
  return null;
}

interface ImageSlotProps {
  name: ImageSlotName;
  /** Overrides the slot's default alt text. */
  alt?: string;
  /** Passed to next/image; describe the rendered width at each breakpoint. */
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Display aspect ratio (e.g. "4 / 3") when it must differ from the slot's
   * own, such as matching cards in a row. The image is cropped to fit. */
  aspectRatio?: string;
}

/**
 * A fixed-ratio image area. Shows public/images/<name>.<ext> when present,
 * otherwise a clearly marked placeholder naming the slot, its file name and
 * its size, so missing images are obvious in review and never break layout.
 */
export function ImageSlot({
  name,
  alt,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  className = "",
  aspectRatio,
}: ImageSlotProps) {
  const slot = IMAGE_SLOTS[name];
  const src = findSlotImage(name);
  const altText = alt ?? slot.alt;

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: aspectRatio ?? `${slot.width} / ${slot.height}` }}
    >
      {src ? (
        <Image
          src={src}
          alt={altText}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={altText}
          className="slot-placeholder absolute inset-0 flex items-center justify-center border-2 border-dashed border-line-strong p-4 text-center"
        >
          <div aria-hidden="true" className="max-w-xs">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              Image slot
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-fg">{name}</p>
            <p className="mt-1 text-xs text-muted">
              {slot.width} × {slot.height} ({slot.ratio})
            </p>
            <p className="mt-2 hidden text-xs leading-relaxed text-muted sm:block">
              {slot.summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
