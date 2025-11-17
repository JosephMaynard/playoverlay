// Disable Demo Mode
// let demoMode = true;
let demoMode = false;

export function setIsDemoMode(demoModeValue: boolean) {
  demoMode = demoModeValue;
}

export default function isDemoMode() {
  return demoMode;
}
