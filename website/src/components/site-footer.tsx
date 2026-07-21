import Image from "next/image";
import Link from "next/link";
import { REPO_URL } from "@/lib/github";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="page-container flex flex-col gap-8 py-12 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <div className="flex items-center gap-2">
            <Image src="/playoverlay-logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="font-semibold text-slate-900 dark:text-white">PlayOverlay</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Free, open-source score and match-clock graphics for community sports streams.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project</h3>
            <Link href="/download" className="text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              Download
            </Link>
            <Link href="/docs" className="text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              Docs
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              GitHub
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">More</h3>
            <a
              href={`${REPO_URL}/issues`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              Report an issue
            </a>
            <a
              href={`${REPO_URL}/releases`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              Releases
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="page-container flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <p>&copy; {year} Magic Zebra Ltd. PlayOverlay is open source under the MIT licence.</p>
          <p>The PlayOverlay name, logo, and branding are owned by Magic Zebra Ltd and are not covered by the MIT licence.</p>
        </div>
      </div>
    </footer>
  );
}
