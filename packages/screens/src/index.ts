// @playoverlay/screens: the on-air graphics (score bug, match title,
// penalties, end screen, scoreboard, goal banner, custom screens and
// overlays) as plain React DOM components. The Electron display window, the
// dashboard preview and the OBS browser source render them, and other hosts
// (the mobile app's DOM components, a web app) can render the very same
// graphics. They take everything as props and read no stores, so each host
// decides where the match state comes from.

export { default } from './Screens';
export { default as Screens } from './Screens';
export type { Props as ScreensProps } from './Screens';

export { default as ScoresLayout } from './ScoresLayout/ScoresLayout';
export type { Props as ScoresLayoutProps } from './ScoresLayout/ScoresLayout';
export { default as ScoresTeamName } from './ScoresLayout/ScoresTeamName';
export type { Props as ScoresTeamNameProps } from './ScoresLayout/ScoresTeamName';
export { default as MatchTitleLayout } from './MatchTitleLayout/MatchTitleLayout';
export type { Props as MatchTitleLayoutProps } from './MatchTitleLayout/MatchTitleLayout';
export { default as EndScreenLayout } from './EndScreenLayout/EndScreenLayout';
export type { Props as EndScreenLayoutProps } from './EndScreenLayout/EndScreenLayout';
export { default as PenaltiesLayout } from './PenaltiesLayout/PenaltiesLayout';
export type { Props as PenaltiesLayoutProps } from './PenaltiesLayout/PenaltiesLayout';
export { default as PenaltiesBoard } from './PenaltiesLayout/PenaltiesBoard';
export type { Props as PenaltiesBoardProps } from './PenaltiesLayout/PenaltiesBoard';
export { default as PenaltyRow } from './PenaltiesLayout/PenaltyRow';
export type { Props as PenaltyRowProps } from './PenaltiesLayout/PenaltyRow';
export { default as CustomScreenLayout } from './CustomScreenLayout/CustomScreenLayout';
export type { Props as CustomScreenLayoutProps } from './CustomScreenLayout/CustomScreenLayout';
export { default as OverlaysLayout } from './OverlaysLayout/OverlaysLayout';
export type { Props as OverlaysLayoutProps } from './OverlaysLayout/OverlaysLayout';
export { default as ScoreboardLayout } from './ScoreboardLayout/ScoreboardLayout';
export type { Props as ScoreboardLayoutProps } from './ScoreboardLayout/ScoreboardLayout';
export { default as GoalBannerLayout } from './GoalBannerLayout/GoalBannerLayout';
export type { Props as GoalBannerLayoutProps } from './GoalBannerLayout/GoalBannerLayout';
