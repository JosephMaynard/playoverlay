import { describe, expect, it } from 'vitest';
import {
  githubReleaseSchema,
  matchSetingsSchema,
  updatesSchema,
} from '../zodSchemas';

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
        hideCustomGraphics: ['sponsor-board'],
        hideScreens: ['endScreen'],
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
});
