// Fetches and maps the latest PlayOverlay GitHub release for the /download page.
//
// The release workflow attaches build artifacts to a *draft* release first,
// then a maintainer publishes it. That means the "latest" release the public
// API returns can lag behind, or (right after a tag is cut) there may be no
// published release with the assets we expect yet. Every function here is
// written to degrade gracefully: missing data just means "show the GitHub
// releases link instead", never a broken page or a thrown error.

export const REPO_OWNER = "JosephMaynard";
export const REPO_NAME = "playoverlay";
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
export const RELEASES_PAGE_URL = `${REPO_URL}/releases`;

const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

export interface GitHubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  assets: GitHubReleaseAsset[];
}

/**
 * Fetches the latest published release, revalidated roughly hourly (ISR).
 * Returns null on any error, a 404 (no published release), or a malformed
 * response, rather than throwing, so the page can always fall back to a
 * plain link to the releases page.
 */
export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const res = await fetch(LATEST_RELEASE_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Partial<GitHubRelease>;

    if (!data || typeof data.tag_name !== "string" || !Array.isArray(data.assets)) {
      return null;
    }

    return {
      tag_name: data.tag_name,
      name: data.name ?? null,
      html_url: typeof data.html_url === "string" ? data.html_url : RELEASES_PAGE_URL,
      published_at: data.published_at ?? null,
      assets: data.assets.filter(
        (asset): asset is GitHubReleaseAsset =>
          !!asset &&
          typeof asset.name === "string" &&
          typeof asset.browser_download_url === "string",
      ),
    };
  } catch {
    return null;
  }
}

export interface PlatformDefinition {
  id: string;
  label: string;
  helpText: string;
  /** Matches the release asset file name that belongs to this platform. */
  match: (assetName: string) => boolean;
}

export const PLATFORMS: PlatformDefinition[] = [
  {
    id: "windows",
    label: "Windows",
    helpText: "Installer (.exe)",
    match: (name) => name.endsWith("Setup.exe"),
  },
  {
    id: "macos-arm64",
    label: "macOS (Apple Silicon)",
    helpText: "M1/M2/M3/M4 Macs (.zip)",
    match: (name) => /darwin-arm64/i.test(name) && name.endsWith(".zip"),
  },
  {
    id: "macos-x64",
    label: "macOS (Intel)",
    helpText: "Intel Macs (.zip)",
    match: (name) => /darwin-x64/i.test(name) && name.endsWith(".zip"),
  },
  {
    id: "linux-deb",
    label: "Linux (Debian/Ubuntu)",
    helpText: "Package (.deb)",
    match: (name) => name.endsWith(".deb"),
  },
  {
    id: "linux-rpm",
    label: "Linux (Fedora/RHEL)",
    helpText: "Package (.rpm)",
    match: (name) => name.endsWith(".rpm"),
  },
];

export function findAssetForPlatform(
  release: GitHubRelease | null,
  platform: PlatformDefinition,
): GitHubReleaseAsset | undefined {
  return release?.assets.find((asset) => platform.match(asset.name));
}

export function formatAssetSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}
