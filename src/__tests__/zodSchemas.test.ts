import { describe, expect, it } from 'vitest';
import {
  appSettingsSchema,
  githubReleaseSchema,
  matchSetingsSchema,
  updatesSchema,
} from '../zodSchemas';
import { defaultAppSettings } from '../constants';

describe('zod schemas', () => {
  it('validates the public update response shape', () => {
    expect(
      updatesSchema.safeParse({
        latestVersion: '0.15.0',
        downloadUrl: 'https://example.com/download',
      }).success
    ).toBe(true);

    expect(
      updatesSchema.safeParse({
        latestVersion: '0.15.0',
      }).success
    ).toBe(false);
  });

  it('validates the GitHub release fields used by update checks', () => {
    expect(
      githubReleaseSchema.parse({
        tag_name: 'v0.15.0',
        html_url: 'https://github.com/JosephMaynard/playoverlay/releases/v0.15.0',
        ignored_field: true,
      })
    ).toEqual({
      tag_name: 'v0.15.0',
      html_url: 'https://github.com/JosephMaynard/playoverlay/releases/v0.15.0',
    });

    expect(
      githubReleaseSchema.safeParse({
        tag_name: 'v0.15.0',
      }).success
    ).toBe(false);
  });

  it('accepts the current match settings shape with optional tournament fields', () => {
    expect(
      matchSetingsSchema.safeParse({
        homeTeamNameFull: 'Tigers',
        homeTeamNameAbbreviated: 'TIG',
        homeTeamTextColour: '#ffffff',
        homeTeamBackgroundColour: '#111111',
        awayTeamNameFull: 'Bears',
        awayTeamNameAbbreviated: 'BEA',
        awayTeamTextColour: '#000000',
        awayTeamBackgroundColour: '#eeeeee',
        venue: 'Main Pitch',
        kickOffTime: '19:45',
        timerMode: 'football',
        halfLength: 45,
        extraTimeHalfLength: 15,
        hasExtraTime: true,
        hasPenalties: true,
        periodCount: 4,
        periodLength: 10,
        periodName: 'Quarter',
        saveDate: '2026-07-06',
        saveId: 'match-1',
        saveTitle: 'Final',
      }).success
    ).toBe(true);
  });

  it('rejects match settings without required team names', () => {
    expect(
      matchSetingsSchema.safeParse({
        homeTeamNameFull: 'Tigers',
        homeTeamNameAbbreviated: 'TIG',
        awayTeamNameAbbreviated: 'BEA',
      }).success
    ).toBe(false);
  });

  it('degrades out-of-range numeric timer fields to undefined instead of failing the whole object', () => {
    const result = matchSetingsSchema.safeParse({
      homeTeamNameFull: 'Tigers',
      homeTeamNameAbbreviated: 'TIG',
      awayTeamNameFull: 'Bears',
      awayTeamNameAbbreviated: 'BEA',
      periodCount: 0,
      halfLength: -5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.periodCount).toBeUndefined();
      expect(result.data.halfLength).toBeUndefined();
      // The rest of the settings, including team names, survive untouched.
      expect(result.data.homeTeamNameFull).toBe('Tigers');
      expect(result.data.awayTeamNameFull).toBe('Bears');
    }
  });

  it('accepts a full app settings shape', () => {
    const settings = {
      keyColour: '#00ff00',
      autoSwitchScreens: false,
      clockFormat: '12h',
      browserSource: { enabled: true, port: 4750 },
      keyboardShortcuts: {
        nextMatchPhase: 'CommandOrControl+Shift+Space',
        homeTeamScored: 'CommandOrControl+Shift+H',
        awayTeamScored: 'CommandOrControl+Shift+A',
      },
    };

    const result = appSettingsSchema.safeParse(settings);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(settings);
    }
  });

  it('degrades corrupt app settings fields individually instead of failing the whole parse', () => {
    const result = appSettingsSchema.safeParse({
      keyColour: 42,
      autoSwitchScreens: 'yes',
      clockFormat: '13h',
      browserSource: { enabled: 'maybe', port: 'high' },
      // A malformed accelerator shape must never reach
      // globalShortcut.register, which throws on invalid input.
      keyboardShortcuts: { nextMatchPhase: 123 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyColour).toBe(defaultAppSettings.keyColour);
      expect(result.data.autoSwitchScreens).toBe(
        defaultAppSettings.autoSwitchScreens
      );
      expect(result.data.clockFormat).toBeUndefined();
      expect(result.data.browserSource).toBeUndefined();
      expect(result.data.keyboardShortcuts).toBeUndefined();
    }
  });

  it('keeps valid app settings fields while degrading only the bad ones', () => {
    const result = appSettingsSchema.safeParse({
      keyColour: '#123456',
      autoSwitchScreens: true,
      keyboardShortcuts: 'not-an-object',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyColour).toBe('#123456');
      expect(result.data.autoSwitchScreens).toBe(true);
      expect(result.data.keyboardShortcuts).toBeUndefined();
    }
  });

  it('fills defaults for app settings fields that are missing entirely', () => {
    const result = appSettingsSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyColour).toBe(defaultAppSettings.keyColour);
      expect(result.data.autoSwitchScreens).toBe(
        defaultAppSettings.autoSwitchScreens
      );
      expect(result.data.clockFormat).toBeUndefined();
    }
  });
});
