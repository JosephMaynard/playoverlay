interface CalloutProps {
  title?: string;
  tone?: "note" | "warning";
  children: React.ReactNode;
}

/** A boxed aside inside guide content. */
export function Callout({ title, tone = "note", children }: CalloutProps) {
  const toneClass =
    tone === "warning"
      ? "border-warning-line bg-warning-bg text-warning-fg [&_strong]:text-warning-fg"
      : "border-line bg-subtle";
  return (
    <aside className={`rounded-xl border px-5 py-4 text-[0.9375rem] leading-relaxed ${toneClass}`}>
      {title && <p className="font-semibold text-fg">{title}</p>}
      <div className={`${title ? "mt-1" : ""} [&>*+*]:mt-2`}>{children}</div>
    </aside>
  );
}
