import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppSettings,
  Club,
  homeOrAway,
  MatchSettings,
  clubFromTeam,
  teamFieldsFromClub,
  upsertClub,
  classNames,
  MAX_PERIOD_COUNT,
} from '@playoverlay/core';
import SideMenu from '../SideMenu/SideMenu';
import TeamSettings from './TeamSettings';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ButtonGrid from '../ButtonGrid/ButtonGrid';
import SavedMatchSettings from './SavedMatchSettings';
import SavedClubs from './SavedClubs';
import ClubPicker from './ClubPicker';
import { nanoid } from 'nanoid';
import ActionButton from '../ui/ActionButton';
import Toggle from '../ui/Toggle';
import {
  errorTextClassName,
  inputClassName,
  labelClassName,
} from '../ui/fields';

// Upper bounds matching the persistence schema (zodSchemas.ts): a value the
// schema rejects is silently reset to the default on the next reload, so the
// UI must refuse it up front rather than show a number that won't survive.
const MAX_LENGTH_MINUTES = 300;

// The outcome of parsing a numeric timer input: an empty field is valid and
// means "use the engine's default" (undefined); anything else must be a
// finite positive number within the schema's bounds.
type ParsedNumberInput =
  { valid: true; value: number | undefined } | { valid: false };

function parseLengthInput(value: string): ParsedNumberInput {
  if (value.trim() === '') return { valid: true, value: undefined };
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_LENGTH_MINUTES
    ? { valid: true, value: parsed }
    : { valid: false };
}

// Same as parseLengthInput, but for periodCount, which must be a whole
// number of periods between 1 and MAX_PERIOD_COUNT.
function parsePeriodCountInput(value: string): ParsedNumberInput {
  if (value.trim() === '') return { valid: true, value: undefined };
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= MAX_PERIOD_COUNT
    ? { valid: true, value: parsed }
    : { valid: false };
}

// Numeric timer input that only commits once the user has finished typing
// (blur or Enter), committing on every keystroke would persist transient
// values like the "1" while typing "12", which can delete the running phase
// and stop the live clock. Same draft + commit + inline error pattern as the
// port fields in SystemSettingsMenu.
//
// The draft is null whenever the user isn't mid-edit, so the field always
// shows the canonical (in-effect) value: a valid commit drops the draft even
// when the canonical value doesn't change (e.g. clearing a field that was
// already on its default), and an invalid one keeps the typed text with an
// error beside it and leaves the settings untouched, rather than displaying
// a number the clock isn't actually using.
function DraftNumberInput({
  id,
  value,
  parse,
  commit,
  errorMessage,
  min,
  max,
  step,
}: {
  id: string;
  value: string;
  parse: (rawValue: string) => ParsedNumberInput;
  commit: (value: number | undefined) => void;
  errorMessage: string;
  min?: number;
  max: number;
  // 'any' for lengths, which may be fractional (e.g. 22.5 minutes).
  step?: number | 'any';
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  // Drop any draft when settings change from outside this input (e.g.
  // loaded from disk, a fixture restored, or the Reset button).
  useEffect(() => {
    setDraft(null);
    setInvalid(false);
  }, [value]);

  const handleCommit = () => {
    if (draft === null) return;
    const parsed = parse(draft);
    if (!parsed.valid) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(null);
    commit(parsed.value);
  };

  const errorId = `${id}-error`;

  return (
    <>
      <input
        type="number"
        name={id}
        id={id}
        min={min}
        max={max}
        step={step}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className={inputClassName}
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleCommit();
          }
        }}
      />
      {invalid && (
        <p id={errorId} className={errorTextClassName}>
          {errorMessage}
        </p>
      )}
    </>
  );
}

export interface Props {
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  matchSettings: MatchSettings;
  updateMatchSettings: (updatedSettings: Partial<MatchSettings>) => void;
  replaceMatchSettings: (matchSettings: MatchSettings) => void;
  appSettings: AppSettings;
}

export default function MatchSettingsMenu({
  sidebarOpen,
  setSidebarOpen,
  matchSettings,
  updateMatchSettings,
  replaceMatchSettings,
  appSettings,
}: Props) {
  const { t } = useTranslation();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubsLoadError, setClubsLoadError] = useState(false);

  // Loaded each time the menu opens, so it reflects the stored list.
  useEffect(() => {
    if (!sidebarOpen) return;
    const request = window?.electronAPI?.getClubs?.();
    if (!request) return;
    let cancelled = false;
    request
      .then((storedClubs) => {
        if (cancelled) return;
        setClubs(storedClubs ?? []);
        setClubsLoadError(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load saved clubs:', error);
        setClubsLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sidebarOpen]);

  // Writes the whole list, then shows what was actually stored: the main
  // process validates entries and can drop one it rejects while still
  // reporting success. The save only counts as successful when every club
  // sent is in the stored list, so the menu never claims a club it doesn't
  // have.
  const writeClubs = async (nextClubs: Club[]) => {
    try {
      const result = await window?.electronAPI?.setClubs(nextClubs);
      if (!result?.success) return false;
      const stored = (await window?.electronAPI?.getClubs?.()) ?? nextClubs;
      setClubs(stored);
      const storedIds = new Set(stored.map((club) => club.id));
      return nextClubs.every((club) => storedIds.has(club.id));
    } catch (error) {
      console.error('Failed to save clubs:', error);
      return false;
    }
  };

  const clubPicker = (team: homeOrAway) => (
    <ClubPicker
      idPrefix={team}
      clubs={clubs}
      loadClub={(club) => updateMatchSettings(teamFieldsFromClub(club, team))}
      saveAsClub={() =>
        writeClubs(
          upsertClub(clubs, clubFromTeam(nanoid(), matchSettings, team))
        )
      }
      canSave={
        (team === 'home'
          ? matchSettings.homeTeamNameFull
          : matchSettings.awayTeamNameFull
        ).trim() !== ''
      }
    />
  );

  return (
    <SideMenu
      title={t('settings:matchMenu.title')}
      open={sidebarOpen}
      setOpen={setSidebarOpen}
    >
      <SavedMatchSettings
        matchSettings={matchSettings}
        replaceMatchSettings={replaceMatchSettings}
      />
      <SavedClubs
        clubs={clubs}
        loadError={clubsLoadError}
        deleteClub={(clubId) =>
          writeClubs(clubs.filter((club) => club.id !== clubId))
        }
      />
      <TeamSettings
        title={t('settings:matchMenu.homeTeam')}
        clubPicker={clubPicker('home')}
        teamNameFull={matchSettings.homeTeamNameFull}
        setTeamNameFull={(homeTeamNameFull: string) =>
          updateMatchSettings({ homeTeamNameFull })
        }
        teamNameAbbreviated={matchSettings.homeTeamNameAbbreviated}
        setTeamNameAbbreviated={(homeTeamNameAbbreviated: string) =>
          updateMatchSettings({ homeTeamNameAbbreviated })
        }
        textColour={matchSettings.homeTeamTextColour}
        setTextColour={(homeTeamTextColour: string) =>
          updateMatchSettings({ homeTeamTextColour })
        }
        backgroundColour={matchSettings.homeTeamBackgroundColour}
        setBackgroundColour={(homeTeamBackgroundColour: string) =>
          updateMatchSettings({ homeTeamBackgroundColour })
        }
        teamLogo={matchSettings.homeTeamLogo}
        setTeamLogo={(homeTeamLogo: string | undefined) =>
          updateMatchSettings({ homeTeamLogo })
        }
        players={matchSettings.homeTeamPlayers}
        setPlayers={(homeTeamPlayers) =>
          updateMatchSettings({ homeTeamPlayers })
        }
        appSettings={appSettings}
      />
      <TeamSettings
        title={t('settings:matchMenu.awayTeam')}
        clubPicker={clubPicker('away')}
        teamNameFull={matchSettings.awayTeamNameFull}
        setTeamNameFull={(awayTeamNameFull: string) =>
          updateMatchSettings({ awayTeamNameFull })
        }
        teamNameAbbreviated={matchSettings.awayTeamNameAbbreviated}
        setTeamNameAbbreviated={(awayTeamNameAbbreviated: string) =>
          updateMatchSettings({ awayTeamNameAbbreviated })
        }
        textColour={matchSettings.awayTeamTextColour}
        setTextColour={(awayTeamTextColour: string) =>
          updateMatchSettings({ awayTeamTextColour })
        }
        backgroundColour={matchSettings.awayTeamBackgroundColour}
        setBackgroundColour={(awayTeamBackgroundColour: string) =>
          updateMatchSettings({ awayTeamBackgroundColour })
        }
        teamLogo={matchSettings.awayTeamLogo}
        setTeamLogo={(awayTeamLogo: string | undefined) =>
          updateMatchSettings({ awayTeamLogo })
        }
        players={matchSettings.awayTeamPlayers}
        setPlayers={(awayTeamPlayers) =>
          updateMatchSettings({ awayTeamPlayers })
        }
        appSettings={appSettings}
      />
      <CollapsiblePanel title={t('settings:matchMenu.details.title')}>
        <div className="space-y-4">
          <div className="col-span-full">
            <label htmlFor="matchVenue" className={labelClassName}>
              {t('settings:matchMenu.details.venue')}
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="matchVenue"
                id="matchVenue"
                className={inputClassName}
                onChange={(e) => {
                  updateMatchSettings({ venue: e.target.value || undefined });
                }}
                value={matchSettings.venue || ''}
              />
            </div>
          </div>
          <div className="col-span-full">
            <label htmlFor="kickOffTime" className={labelClassName}>
              {t('settings:matchMenu.details.kickOffTime')}
            </label>
            <div className="mt-2">
              <input
                type="time"
                name="kickOffTime"
                id="kickOffTime"
                className={inputClassName}
                onChange={(e) => {
                  updateMatchSettings({
                    kickOffTime: e.target.value || undefined,
                  });
                }}
                value={matchSettings.kickOffTime || ''}
              />
            </div>
          </div>
          <div>
            <label className={classNames(labelClassName, 'mb-2')}>
              {t('settings:matchMenu.details.timerMode')}
            </label>
            <ButtonGrid
              compact
              buttons={[
                {
                  label: t('settings:matchMenu.details.football'),
                  selected: matchSettings.timerMode !== 'generic',
                  onClick: () => updateMatchSettings({ timerMode: 'football' }),
                },
                {
                  label: t('settings:matchMenu.details.generic'),
                  selected: matchSettings.timerMode === 'generic',
                  onClick: () => updateMatchSettings({ timerMode: 'generic' }),
                },
              ]}
            />
          </div>
          {matchSettings.timerMode === 'generic' ? (
            // Two short number fields side by side, with the free-text name
            // on its own row: three columns are too narrow in a drawer.
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="periodCount" className={labelClassName}>
                  {t('settings:matchMenu.details.periodCount')}
                </label>
                <div className="mt-2">
                  <DraftNumberInput
                    id="periodCount"
                    value={String(matchSettings.periodCount ?? 4)}
                    parse={parsePeriodCountInput}
                    commit={(periodCount) =>
                      updateMatchSettings({ periodCount })
                    }
                    errorMessage={t(
                      'settings:matchMenu.details.periodCountError'
                    )}
                    min={1}
                    max={MAX_PERIOD_COUNT}
                    step={1}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="periodLength" className={labelClassName}>
                  {t('settings:matchMenu.details.periodLength')}
                </label>
                <div className="mt-2">
                  <DraftNumberInput
                    id="periodLength"
                    value={String(matchSettings.periodLength ?? 10)}
                    parse={parseLengthInput}
                    commit={(periodLength) =>
                      updateMatchSettings({ periodLength })
                    }
                    errorMessage={t('settings:matchMenu.details.lengthError')}
                    max={MAX_LENGTH_MINUTES}
                    step="any"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="periodName" className={labelClassName}>
                  {t('settings:matchMenu.details.periodNameLabel')}
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="periodName"
                    id="periodName"
                    className={inputClassName}
                    value={matchSettings.periodName || ''}
                    placeholder={t(
                      'settings:matchMenu.details.periodNamePlaceholder'
                    )}
                    onChange={(e) =>
                      updateMatchSettings({
                        periodName: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="halfLength" className={labelClassName}>
                  {t('settings:matchMenu.details.halfLength')}
                </label>
                <div className="mt-2">
                  <DraftNumberInput
                    id="halfLength"
                    // Show the length actually in effect: getPhaseList falls
                    // back to 45 when it's unset.
                    value={String(matchSettings.halfLength ?? 45)}
                    parse={parseLengthInput}
                    commit={(halfLength) => updateMatchSettings({ halfLength })}
                    errorMessage={t('settings:matchMenu.details.lengthError')}
                    max={MAX_LENGTH_MINUTES}
                    step="any"
                  />
                </div>
              </div>
              {matchSettings.hasExtraTime !== false && (
                <div>
                  <label
                    htmlFor="extraTimeHalfLength"
                    className={labelClassName}
                  >
                    {t('settings:matchMenu.details.extraTimeHalfLength')}
                  </label>
                  <div className="mt-2">
                    <DraftNumberInput
                      id="extraTimeHalfLength"
                      // getPhaseList falls back to 15 when it's unset.
                      value={String(matchSettings.extraTimeHalfLength ?? 15)}
                      parse={parseLengthInput}
                      commit={(extraTimeHalfLength) =>
                        updateMatchSettings({ extraTimeHalfLength })
                      }
                      errorMessage={t('settings:matchMenu.details.lengthError')}
                      max={MAX_LENGTH_MINUTES}
                      step="any"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {matchSettings.timerMode !== 'generic' && (
            <Toggle
              checked={matchSettings.hasExtraTime !== false}
              onChange={(hasExtraTime: boolean) =>
                updateMatchSettings({ hasExtraTime })
              }
              label={t('settings:matchMenu.details.extraTime')}
            />
          )}
          <Toggle
            checked={matchSettings.hasPenalties !== false}
            onChange={(hasPenalties: boolean) =>
              updateMatchSettings({ hasPenalties })
            }
            label={t('settings:matchMenu.details.penalties')}
          />
          <ActionButton
            size="md"
            onClick={() => {
              updateMatchSettings({
                timerMode: 'football',
                halfLength: 45,
                extraTimeHalfLength: 15,
                hasExtraTime: true,
                hasPenalties: true,
                periodCount: undefined,
                periodLength: undefined,
                periodName: undefined,
              });
            }}
          >
            {t('reset')}
          </ActionButton>
        </div>
      </CollapsiblePanel>
    </SideMenu>
  );
}
