let demoMode = true;

export function setIsDemoMode(demoModeValue: boolean) {
  demoMode = demoModeValue;
}

export default function isDemoMode() {
  return demoMode;
}
