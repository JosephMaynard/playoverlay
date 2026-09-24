import { describe, expect, it } from 'vitest';
import { defaultMatchSettings } from '../constants';
import { clubFromTeam, teamFieldsFromClub, upsertClub } from '../clubs';
import { Club } from '../types';
import { clubListSchema } from '../zodSchemas';

const rovers: Club = {
  id: 'c1',
  name: 'Rovers',
  abbreviation: 'ROV',
  textColour: '#ffffff',
  backgroundColour: '#aa0000',
  logo: 'file:///images/rovers.png',
};

describe('teamFieldsFromClub', () => {
  it('fills every field of the chosen slot', () => {
    expect(teamFieldsFromClub(rovers, 'away')).toEqual({
      awayTeamNameFull: 'Rovers',
      awayTeamNameAbbreviated: 'ROV',
      awayTeamTextColour: '#ffffff',
      awayTeamBackgroundColour: '#aa0000',
      awayTeamLogo: 'file:///images/rovers.png',
    });
  });

  it("clears the previous team's logo when the club has none", () => {
    const fields = teamFieldsFromClub({ ...rovers, logo: undefined }, 'home');
    expect(fields).toHaveProperty('homeTeamLogo', undefined);
    const merged = { ...defaultMatchSettings, homeTeamLogo: 'old', ...fields };
    expect(merged.homeTeamLogo).toBeUndefined();
  });
});

describe('clubFromTeam', () => {
  it('captures the slot as a club, trimming the name', () => {
    expect(
      clubFromTeam(
        'new',
        {
          ...defaultMatchSettings,
          homeTeamNameFull: '  Rovers ',
          homeTeamNameAbbreviated: 'ROV',
          homeTeamTextColour: '#ffffff',
          homeTeamBackgroundColour: '#aa0000',
          homeTeamLogo: 'file:///images/rovers.png',
        },
        'home'
      )
    ).toEqual({ ...rovers, id: 'new' });
  });
});

describe('upsertClub', () => {
  it('adds new clubs in name order', () => {
    const united = { ...rovers, id: 'c2', name: 'United' };
    const athletic = { ...rovers, id: 'c3', name: 'athletic' };
    expect(
      upsertClub(upsertClub([united], rovers), athletic).map((c) => c.name)
    ).toEqual(['athletic', 'Rovers', 'United']);
  });

  it('updates a club saved again under the same name, keeping its id', () => {
    const recoloured = {
      ...rovers,
      id: 'fresh-id',
      name: ' rovers ',
      backgroundColour: '#0000aa',
    };
    const clubs = upsertClub([rovers], recoloured);
    expect(clubs).toHaveLength(1);
    expect(clubs[0].id).toBe('c1');
    expect(clubs[0].backgroundColour).toBe('#0000aa');
  });
});

describe('clubListSchema', () => {
  it('drops malformed clubs rather than the whole list', () => {
    expect(
      clubListSchema.parse([
        rovers,
        { ...rovers, id: 'c2', name: '   ' },
        { name: 'No id' },
        'nonsense',
        { ...rovers, id: 'c3', abbreviation: 'TOOLONG' },
      ])
    ).toEqual([rovers]);
    expect(clubListSchema.parse(undefined)).toEqual([]);
  });
});
