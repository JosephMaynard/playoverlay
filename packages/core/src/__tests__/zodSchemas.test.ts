import { describe, expect, it } from 'vitest';
import {
  appSettingsSchema,
  clubListSchema,
  customScreenListSchema,
  customScreenSchema,
  githubReleaseSchema,
  liveMatchSchema,
  matchEventLogSchema,
  matchSetingsSchema,
  matchSettingsListSchema,
  matchStateSchema,
  playerListSchema,
  scoresSchema,
  timeSchema,
  updatesSchema,
} from '../zodSchemas';
import {
  defaultAppSettings,
  defaultBrowserSourceSettings,
  defaultMatchSettings,
  defaultMatchState,
  defaultRemoteControlSettings,
  defaultScores,
  defaultScreenRotationSettings,
  MAX_PLAYERS_PER_TEAM,
} from '../constants';

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
        html_url:
          'https://github.com/MagicZebraLtd/playoverlay/releases/v0.15.0',
        ignored_field: true,
      })
    ).toEqual({
      tag_name: 'v0.15.0',
      html_url: 'https://github.com/MagicZebraLtd/playoverlay/releases/v0.15.0',
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

  it('degrades an out-of-range browser-source/remote-control port to the shipped default, keeping enabled', () => {
    const result = appSettingsSchema.safeParse({
      keyColour: '#123456',
      autoSwitchScreens: true,
      browserSource: { enabled: true, port: 70000 },
      remoteControl: { enabled: true, port: 0 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.browserSource).toEqual({
        enabled: true,
        port: defaultBrowserSourceSettings.port,
      });
      expect(result.data.remoteControl).toEqual({
        enabled: true,
        port: defaultRemoteControlSettings.port,
      });
    }
  });

  it('degrades a non-integer port to the shipped default', () => {
    const result = appSettingsSchema.safeParse({
      keyColour: '#123456',
      autoSwitchScreens: true,
      browserSource: { enabled: false, port: 4750.5 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.browserSource).toEqual({
        enabled: false,
        port: defaultBrowserSourceSettings.port,
      });
    }
  });

  it('keeps a valid in-range port unchanged', () => {
    const result = appSettingsSchema.safeParse({
      keyColour: '#123456',
      autoSwitchScreens: true,
      browserSource: { enabled: true, port: 8080 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.browserSource).toEqual({
        enabled: true,
        port: 8080,
      });
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

describe('scoresSchema', () => {
  it('accepts a normal scoreline unchanged', () => {
    const scores = {
      homeTeam: 2,
      awayTeam: 1,
      penalties: [{ team: 'home', result: 'scored' }],
    };

    expect(scoresSchema.parse(scores)).toEqual(scores);
  });

  it('degrades a negative or non-integer team score to the default instead of failing the whole scoreline', () => {
    const result = scoresSchema.safeParse({
      homeTeam: -3,
      awayTeam: 1.5,
      penalties: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.homeTeam).toBe(defaultScores.homeTeam);
      expect(result.data.awayTeam).toBe(defaultScores.awayTeam);
    }
  });

  it('drops a malformed penalty entry while keeping the rest of the list', () => {
    const result = scoresSchema.safeParse({
      homeTeam: 0,
      awayTeam: 0,
      penalties: [
        { team: 'away', result: 'missed' },
        'not-a-penalty',
        { team: 'nonsense', result: 'scored' },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // The unparseable string is dropped; the malformed `team` degrades to
      // its default ('home') rather than dropping that whole entry.
      expect(result.data.penalties).toEqual([
        { team: 'away', result: 'missed' },
        { team: 'home', result: 'scored' },
      ]);
    }
  });

  it('degrades a wholly non-array penalties value to no penalties', () => {
    const result = scoresSchema.safeParse({
      homeTeam: 1,
      awayTeam: 1,
      penalties: 'not-an-array',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.penalties).toEqual([]);
    }
  });
});

describe('timeSchema', () => {
  it('accepts a normal clock state unchanged', () => {
    const time = {
      time: '45:00',
      paused: false,
      matchPhase: 'firstHalf',
    };

    expect(timeSchema.parse(time)).toEqual(time);
  });

  it('degrades individually malformed fields to undefined instead of failing the whole update', () => {
    const result = timeSchema.safeParse({
      time: 45, // should be a string
      paused: 'no', // should be a boolean
      matchPhase: 'firstHalf',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.time).toBeUndefined();
      expect(result.data.paused).toBeUndefined();
      expect(result.data.matchPhase).toBe('firstHalf');
    }
  });
});

describe('customScreenSchema and customScreenListSchema', () => {
  it('accepts a normal custom screen unchanged', () => {
    const screen = {
      title: 'Sponsor',
      filePath: '/images/sponsor.png',
      url: 'file:///images/sponsor.png',
      type: 'overlay',
      overlayLinks: ['scoreBug'],
    };

    expect(customScreenSchema.parse(screen)).toEqual(screen);
  });

  it('drops an entry missing a required field, keeping valid siblings', () => {
    const valid = {
      title: 'Sponsor',
      filePath: '/images/sponsor.png',
      url: 'file:///images/sponsor.png',
    };

    const result = customScreenListSchema.parse([
      valid,
      { title: 'Missing filePath/url' },
    ]);

    expect(result).toEqual([valid]);
  });

  it('degrades a wholly non-array value to an empty list', () => {
    expect(customScreenListSchema.parse('not-an-array')).toEqual([]);
  });
});

describe('matchStateSchema', () => {
  it('accepts a normal match state unchanged', () => {
    const matchState = {
      matchPhase: 'firstHalf',
      displayScreen: 'scoreBug',
      penaltiesFirstTeam: 'home',
      overlays: [],
    };

    expect(matchStateSchema.parse(matchState)).toEqual(matchState);
  });

  it('degrades an invalid displayScreen/penaltiesFirstTeam to their defaults', () => {
    const result = matchStateSchema.safeParse({
      displayScreen: 'not-a-real-screen',
      penaltiesFirstTeam: 'neither',
      overlays: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayScreen).toBe(defaultMatchState.displayScreen);
      expect(result.data.penaltiesFirstTeam).toBe(
        defaultMatchState.penaltiesFirstTeam
      );
    }
  });
});

describe('matchSettingsListSchema', () => {
  it('drops a saved match missing required team names, keeping the rest', () => {
    const valid = {
      ...defaultMatchSettings,
      saveId: 'match-1',
      saveTitle: 'Final',
    };

    const result = matchSettingsListSchema.parse([
      valid,
      { homeTeamNameFull: 'Incomplete' },
    ]);

    expect(result).toEqual([valid]);
  });
});

describe('liveMatchSchema', () => {
  it('accepts a normal live-match snapshot unchanged', () => {
    const liveMatch = {
      scores: { homeTeam: 2, awayTeam: 1, penalties: [] },
      time: { time: '75:00', paused: false },
      matchState: {
        displayScreen: 'scoreBug',
        penaltiesFirstTeam: 'home',
        overlays: [],
      },
      savedAt: 12345,
    };

    expect(liveMatchSchema.parse(liveMatch)).toEqual(liveMatch);
  });

  it('degrades a wholly corrupt nested field to its own default rather than failing the snapshot', () => {
    const result = liveMatchSchema.safeParse({
      scores: 'not-an-object',
      time: { time: '10:00' },
      matchState: {
        displayScreen: 'scoreBug',
        penaltiesFirstTeam: 'home',
        overlays: [],
      },
      savedAt: 1,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scores).toEqual(defaultScores);
      expect(result.data.time).toEqual({ time: '10:00' });
    }
  });
});

describe('matchEventLogSchema', () => {
  it('keeps an omitted source as undefined', () => {
    const result = matchEventLogSchema.safeParse({
      action: 'undo:actions.homeGoal',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBeUndefined();
    }
  });

  it('keeps a recognised source unchanged', () => {
    const result = matchEventLogSchema.safeParse({
      action: 'undo:actions.homeGoal',
      source: 'streamDeck',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('streamDeck');
    }
  });

  it('maps a present-but-unrecognised source to "unknown" instead of undefined', () => {
    const result = matchEventLogSchema.safeParse({
      action: 'undo:actions.homeGoal',
      source: 'tablet',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('unknown');
    }
  });
});

describe('line-up schemas', () => {
  it('keeps a normal line-up unchanged', () => {
    const players = [{ name: 'Ali Smith', number: '9' }, { name: 'Jo Bloggs' }];
    expect(playerListSchema.parse(players)).toEqual(players);
  });

  it('tidies each player and drops the ones that cannot be repaired', () => {
    expect(
      playerListSchema.parse([
        { name: '  Ali Smith ', number: ' 9 ' },
        { name: '   ' },
        { number: '4' },
        'nonsense',
        { name: 'Kim Lee', number: 1234 },
        { name: 'Pat Jones', number: '1234' },
        { name: 'x'.repeat(60) },
      ])
    ).toEqual([
      { name: 'Ali Smith', number: '9' },
      { name: 'Kim Lee' },
      { name: 'Pat Jones' },
      { name: 'x'.repeat(40) },
    ]);
  });

  it('caps a line-up at the most players a team can have', () => {
    const players = Array.from(
      { length: MAX_PLAYERS_PER_TEAM + 3 },
      (_, i) => ({
        name: `Player ${i + 1}`,
      })
    );
    expect(playerListSchema.parse(players)).toHaveLength(MAX_PLAYERS_PER_TEAM);
  });

  it('carries line-ups in match settings, degrading a non-array to none', () => {
    const parsed = matchSetingsSchema.parse({
      ...defaultMatchSettings,
      homeTeamPlayers: [{ name: 'Ali Smith', number: '9' }],
      awayTeamPlayers: 'eleven of them',
    });
    expect(parsed.homeTeamPlayers).toEqual([
      { name: 'Ali Smith', number: '9' },
    ]);
    expect(parsed.awayTeamPlayers).toBeUndefined();
    expect(
      'awayTeamPlayers' in matchSetingsSchema.parse(defaultMatchSettings)
    ).toBe(false);
  });

  it("keeps a saved club's players, and a club saved before line-ups loads unchanged", () => {
    const club = {
      id: 'c1',
      name: 'Rovers',
      abbreviation: 'ROV',
      textColour: '#ffffff',
      backgroundColour: '#aa0000',
    };
    expect(clubListSchema.parse([club])).toEqual([club]);
    expect(
      clubListSchema.parse([{ ...club, players: [{ name: 'Ali Smith' }] }])
    ).toEqual([{ ...club, players: [{ name: 'Ali Smith' }] }]);
    expect(clubListSchema.parse([{ ...club, players: 7 }])).toEqual([club]);
  });

  it("keeps a goal's scorer number only beside a scorer", () => {
    const parsed = scoresSchema.parse({
      homeTeam: 2,
      awayTeam: 0,
      penalties: [],
      goals: [
        { id: 'g1', team: 'home', scorer: 'Smith', scorerNumber: ' 9 ' },
        { id: 'g2', team: 'home', scorerNumber: '9' },
        { id: 'g3', team: 'home', scorer: 'Jones', scorerNumber: 'TOOLONG' },
      ],
    });
    expect(parsed.goals).toEqual([
      { id: 'g1', team: 'home', scorer: 'Smith', scorerNumber: '9' },
      { id: 'g2', team: 'home' },
      { id: 'g3', team: 'home', scorer: 'Jones' },
    ]);
  });
});

describe('screen rotation schema', () => {
  const base = { keyColour: '#0000FF', autoSwitchScreens: true };

  it('keeps a normal rotation unchanged', () => {
    const screenRotation = {
      screens: [
        { screen: 'matchTitle' },
        { screen: 'custom', customScreenImageUrl: 'file:///sponsor.png' },
      ],
      intervalSeconds: 15,
      autoStartAtHalfTime: true,
    };
    expect(
      appSettingsSchema.parse({ ...base, screenRotation }).screenRotation
    ).toEqual(screenRotation);
  });

  it('is absent until set, so older settings load unchanged', () => {
    expect('screenRotation' in appSettingsSchema.parse(base)).toBe(false);
    expect(
      appSettingsSchema.parse({ ...base, screenRotation: 'on' }).screenRotation
    ).toBeUndefined();
  });

  it('degrades each field on its own and drops entries that cannot be shown', () => {
    const parsed = appSettingsSchema.parse({
      ...base,
      screenRotation: {
        screens: [
          { screen: 'scoreBug' },
          { screen: 'none' },
          { screen: 'notAScreen' },
          { screen: 'custom' },
          { screen: 'scoreboard', customScreenImageUrl: 'file:///stray.png' },
          'nonsense',
        ],
        intervalSeconds: 1,
        autoStartAtHalfTime: 'yes',
      },
    }).screenRotation;
    expect(parsed).toEqual({
      screens: [{ screen: 'scoreBug' }, { screen: 'scoreboard' }],
      intervalSeconds: defaultScreenRotationSettings.intervalSeconds,
      autoStartAtHalfTime: false,
    });

    expect(
      appSettingsSchema.parse({
        ...base,
        screenRotation: { screens: 'all', intervalSeconds: 600.5 },
      }).screenRotation
    ).toEqual(defaultScreenRotationSettings);
  });
});
