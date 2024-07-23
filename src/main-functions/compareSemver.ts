export default function compareSemver(
  version1: string,
  version2: string
): number {
  const parseSemver = (version: string) => version.split('.').map(Number);

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
