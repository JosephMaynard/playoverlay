import type { Metadata } from "next";
import {
  PLATFORMS,
  RELEASES_PAGE_URL,
  fetchLatestRelease,
  findAssetForPlatform,
  formatAssetSize,
} from "@/lib/github";
import { DownloadButton } from "@/components/download-button";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download PlayOverlay for Windows, macOS, and Linux. Free and open source, straight from GitHub Releases.",
};

export default async function DownloadPage() {
  const release = await fetchLatestRelease();

  return (
    <div className="page-container py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Download PlayOverlay
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Free, open source, no account required. Choose your platform below.
        </p>
        {release && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Latest release: <span className="font-medium">{release.name || release.tag_name}</span>{" "}
            ({release.tag_name})
          </p>
        )}
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
        {PLATFORMS.map((platform) => {
          const asset = findAssetForPlatform(release, platform);

          return (
            <div
              key={platform.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {platform.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{platform.helpText}</p>
                {asset && asset.size > 0 && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {formatAssetSize(asset.size)}
                  </p>
                )}
              </div>

              {asset ? (
                <DownloadButton
                  href={asset.browser_download_url}
                  platform={platform.id}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                >
                  Download for {platform.label}
                </DownloadButton>
              ) : (
                <DownloadButton
                  href={RELEASES_PAGE_URL}
                  platform={`${platform.id}-fallback`}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
                >
                  Download from GitHub releases
                </DownloadButton>
              )}
            </div>
          );
        })}
      </div>

      {!release && (
        <div className="mx-auto mt-8 max-w-4xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          We couldn&rsquo;t reach the latest published release just now. Every button above links
          straight to the{" "}
          <a href={RELEASES_PAGE_URL} target="_blank" rel="noreferrer noopener" className="font-medium underline">
            GitHub releases page
          </a>{" "}
          instead, where you can grab the newest build directly.
        </div>
      )}

      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          A note on unsigned builds
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          These binaries are not code-signed or notarized (signing certificates cost money, and
          this is a free project), so your operating system will warn you the first time you run
          it. That&rsquo;s expected, and it only comes up once.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white">Windows</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              SmartScreen may show &ldquo;Windows protected your PC&rdquo;. Click{" "}
              <strong>More info</strong>, then <strong>Run anyway</strong>.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white">macOS</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              After unzipping, move <code>PlayOverlay.app</code> to Applications. If macOS reports
              the app is damaged or from an unidentified developer, clear the quarantine flag once
              from Terminal:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 dark:bg-black">
              <code>xattr -cr /Applications/PlayOverlay.app</code>
            </pre>
          </div>
        </div>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          If you&rsquo;d rather not trust an unsigned binary, you can build PlayOverlay yourself
          from source, see the{" "}
          <a
            href="https://github.com/JosephMaynard/playoverlay#building-from-source"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            building from source
          </a>{" "}
          instructions in the README.
        </p>
      </div>
    </div>
  );
}
