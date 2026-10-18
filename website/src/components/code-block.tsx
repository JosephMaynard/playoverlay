import { CopyButton } from "@/components/copy-button";

interface CodeBlockProps {
  code: string;
  /** Short label shown above the code, e.g. "Terminal". */
  label?: string;
}

/** A dark code block with a copy button, for commands and URLs. */
export function CodeBlock({ code, label = "Terminal" }: CodeBlockProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1f2e55] bg-[#071330] text-slate-100">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
