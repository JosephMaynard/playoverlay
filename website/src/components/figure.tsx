interface FigureProps {
  children: React.ReactNode;
  caption?: React.ReactNode;
  className?: string;
}

/** A framed image (screenshot or image slot) with an optional caption. */
export function Figure({ children, caption, className = "" }: FigureProps) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-xl border border-line bg-subtle shadow-sm">
        {children}
      </div>
      {caption && (
        <figcaption className="mt-3 text-sm leading-relaxed text-faint">{caption}</figcaption>
      )}
    </figure>
  );
}
