export default function compareSemver(
  version1: string,
  version2: string
): number {
  // Strip any pre-release/build suffix ("0.16.0-beta.1", "1.0.0+build.5")
  // before parsing, and treat unparseable parts as 0 so a malformed version
  // never poisons the comparison with NaN (NaN !== NaN would report every
  // comparison as a difference).
  const parseSemver = (version: string) => {
    const core = version.split(/[-+]/, 1)[0];
    return core.split('.').map((part) => {
      const parsed = Number(part);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
  };

  const [major1, minor1, patch1] = parseSemver(version1);
  const [major2, minor2, patch2] = parseSemver(version2);

  if (major1 !== major2) {
    return major1 > major2 ? 1 : -1;
  }
  if (minor1 !== minor2) {
    return minor1 > minor2 ? 1 : -1;
  }
  if (patch1 !== patch2) {
    return patch1 > patch2 ? 1 : -1;
  }

  return 0;
}
