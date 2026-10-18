/** A keyboard key or shortcut, e.g. <Kbd>Cmd/Ctrl+Shift+H</Kbd>. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="whitespace-nowrap rounded-md border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[0.8125rem] font-medium text-fg shadow-[0_1px_0_var(--border-strong)]">
      {children}
    </kbd>
  );
}
