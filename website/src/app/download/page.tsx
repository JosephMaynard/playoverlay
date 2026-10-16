import type { Metadata } from "next";
import Link from "next/link";
import {
  BUILD_FROM_SOURCE_URL,
  PLATFORMS,
  RELEASES_PAGE_URL,
  fetchLatestRelease,
  findAssetForPlatform,
  formatAssetSize,
  type PlatformDefinition,
} from "@/lib/github";
import { DownloadButton } from "@/components/download-button";
import { CodeBlock } from "@/components/code-block";
import { ArrowRightIcon, DownloadIcon } from "@/components/icons";
import { textLink } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download PlayOverlay for Windows, macOS (Apple Silicon and Intel) and Linux (.deb and .rpm). Free and open source, straight from GitHub Releases.",
  alternates: { canonical: "/download" },
};

interface OsGroup {
  id: string;
  name: string;
  note: React.ReactNode;
  platforms: { id: string; buttonLabel: string }[];
}

const OS_GROUPS: OsGroup[] = [
  {
    id: "windows",
    name: "Windows",
    note: "Download the installer (.exe) and run it. PlayOverlay is added to the Start menu.",
    platforms: [{ id: "windows", buttonLabel: "Windows installer" }],
  },
  {
    id: "macos",
    name: "macOS",
    note: (
      <>
        Not sure which Mac you have? Open the Apple menu, then <strong>About This Mac</strong>. If
        it lists a <strong>Chip</strong> starting &quot;Apple M&quot;, choose Apple Silicon.
        If it lists an Intel <strong>Processor</strong>, choose Intel.
      </>
    ),
    platforms: [
      { id: "macos-arm64", buttonLabel: "Apple Silicon" },
      { id: "macos-x64", buttonLabel: "Intel" },
    ],
  },
  {
    id: "linux",
    name: "Linux",
    note: "A .deb package for Debian, Ubuntu and their derivatives, and an .rpm package for Fedora, RHEL and theirs.",
    platforms: [
      { id: "linux-deb", buttonLabel: "Debian / Ubuntu (.deb)" },
      { id: "linux-rpm", buttonLabel: "Fedora / RHEL (.rpm)" },
    ],
  },
];

function platformById(id: string): PlatformDefinition | undefined {
  return PLATFORMS.find((platform) => platform.id === id);
}

function formatReleaseDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default async function DownloadPage() {
  const release = await fetchLatestRelease();
  const releaseDate = formatReleaseDate(release?.published_at ?? null);

  return (
    <>
      <section aria-labelledby="download-title" className="border-b border-line bg-subtle">
        <div className="page-container py-14 sm:py-20">
          <div className="max-w-2xl">
            <h1 id="download-title" className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
              Download PlayOverlay
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Free and open source, with no account to create. Downloads come straight from the
              project&apos;s GitHub releases.
            </p>
            {release && (
              <p className="mt-4 text-sm text-faint">
                Latest version{" "}
                <span className="font-semibold text-fg">{release.name || release.tag_name}</span>
                {release.name && release.name !== release.tag_name && <> ({release.tag_name})</>}
                {releaseDate && <>, released {releaseDate}</>}.{" "}
                <a href={release.html_url} className={textLink}>
                  Release notes
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="page-container py-12 sm:py-16">
        {!release && (
          <div
            role="status"
            className="mb-8 rounded-xl border border-warning-line bg-warning-bg p-4 text-sm leading-relaxed text-warning-fg"
          >
            We couldn&apos;t reach the latest release just now, so each button below opens the{" "}
            <a href={RELEASES_PAGE_URL} className="font-semibold underline underline-offset-2">
              GitHub releases page
            </a>{" "}
            instead. The newest build is at the top there.
          </div>
        )}

        <ul className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {OS_GROUPS.map((group) => (
            <li
              key={group.id}
              className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-fg">{group.name}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{group.note}</p>
              <div className="mt-6 flex flex-col gap-3">
                {group.platforms.map(({ id, buttonLabel }) => {
                  const platform = platformById(id);
                  if (!platform) return null;
                  const asset = findAssetForPlatform(release, platform);
                  const size = asset ? formatAssetSize(asset.size) : "";

                  return asset ? (
                    <DownloadButton
                      key={id}
                      href={asset.browser_download_url}
                      platform={platform.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
                    >
                      <span className="flex items-center gap-2">
                        <DownloadIcon className="h-4 w-4 flex-none" />
                        {buttonLabel}
                      </span>
                      {size && <span className="text-xs font-medium opacity-75">{size}</span>}
                    </DownloadButton>
                  ) : (
                    <DownloadButton
                      key={id}
                      href={RELEASES_PAGE_URL}
                      platform={`${platform.id}-fallback`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line-strong px-4 py-3 text-sm font-semibold text-fg transition-colors hover:bg-subtle"
                    >
                      <span>{buttonLabel}</span>
                      <span className="text-xs font-medium text-muted">GitHub releases</span>
                    </DownloadButton>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>

        <section
          id="first-launch"
          aria-labelledby="first-launch-title"
          className="mt-20 grid scroll-mt-24 grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16"
        >
          <div>
            <h2 id="first-launch-title" className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              A note on unsigned builds
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              The downloads aren&apos;t code-signed or notarised. Signing certificates cost money
              every year and PlayOverlay is free, so your operating system will warn you the first
              time you open it. That is expected, and you only have to deal with it once.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              If you&apos;d rather not run an unsigned app, you can{" "}
              <a href={BUILD_FROM_SOURCE_URL} className={textLink}>
                build PlayOverlay from source
              </a>{" "}
              instead.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-semibold text-fg">Windows</h3>
              <p className="mt-2 leading-relaxed text-muted">
                SmartScreen may say &quot;Windows protected your PC&quot;. Click{" "}
                <strong className="text-fg">More info</strong>, then{" "}
                <strong className="text-fg">Run anyway</strong>.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-semibold text-fg">macOS</h3>
              <p className="mt-2 leading-relaxed text-muted">
                Unzip the download and move <code className="rounded bg-code px-1 py-0.5 font-mono text-sm text-fg">PlayOverlay.app</code>{" "}
                to your Applications folder. If macOS says the app is damaged or from an
                unidentified developer, open Terminal, run this once to clear the quarantine flag,
                then open the app again:
              </p>
              <div className="mt-4">
                <CodeBlock code="xattr -cr /Applications/PlayOverlay.app" />
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-semibold text-fg">Linux</h3>
              <p className="mt-2 leading-relaxed text-muted">
                Install the package with your package manager, for example{" "}
                <code className="rounded bg-code px-1 py-0.5 font-mono text-sm text-fg">sudo apt install ./playoverlay_*.deb</code>{" "}
                or{" "}
                <code className="rounded bg-code px-1 py-0.5 font-mono text-sm text-fg">sudo dnf install ./playoverlay-*.rpm</code>{" "}
                from the folder you downloaded it to.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-20 flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-subtle p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="text-xl font-semibold text-fg">Installed? Set up your first match</h2>
            <p className="mt-1 text-muted">
              The getting started guide takes you from first launch to kick-off in about five
              minutes.
            </p>
          </div>
          <Link
            href="/docs/getting-started"
            className="inline-flex flex-none items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
          >
            Getting started
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
