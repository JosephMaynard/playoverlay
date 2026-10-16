// @playoverlay/core: everything about a match that doesn't depend on where
// PlayOverlay runs. The Electron app, the mobile app and any future web app
// share this so a goal, a phase change or an undo behaves identically in all
// of them. Nothing here touches Electron, Node or a DOM window directly;
// platform services are handed in by the host app instead.
//
// Code that must stay free of React (the Electron main process) imports the
// pure modules through their own subpaths (@playoverlay/core/utils,
// /constants, /zodSchemas, /types, /liveMatch, /i18n) rather than this
// entry point, which also brings in the zustand stores and React hooks.

export * from './types';
export * from './zodSchemas';
export * from './constants';
export * from './utils';
export * from './goalLog';
export * from './liveMatch';
export * from './clubs';
export * from './customScreens';

export * from './store/appSettings';
export * from './store/customGraphics';
export * from './store/matchSettings';
export * from './store/matchState';
export * from './store/scores';
export * from './store/time';
export * from './store/undo';

export { default as useMatchClock } from './useMatchClock';
export type { StopTimeOptions, UseMatchClock } from './useMatchClock';

export { defaultNS, namespaces, resources } from './i18n';
export { initI18n } from './i18n/init';
