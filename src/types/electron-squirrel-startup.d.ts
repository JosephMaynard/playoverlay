// electron-squirrel-startup ships no types. It runs its Windows Squirrel
// install/uninstall check at import time and its default export is truthy
// only when Squirrel handled a startup event (so the app should quit).
declare module 'electron-squirrel-startup' {
  const startedViaSquirrelEvent: boolean;
  export default startedViaSquirrelEvent;
}
