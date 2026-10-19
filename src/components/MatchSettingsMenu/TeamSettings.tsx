import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, Player, classNames } from '@playoverlay/core';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ColourPicker from '../ColorPicker/ColorPicker';
import LineupEditor from './LineupEditor';
import { ScoresTeamName } from '@playoverlay/screens';
import ActionButton from '../ui/ActionButton';
import {
  errorTextClassName,
  inputClassName,
  labelClassName,
} from '../ui/fields';

export interface Props {
  title: string;
  teamNameFull: string;
  teamNameAbbreviated: string;
  setTeamNameFull: (teamName: string) => void;
  setTeamNameAbbreviated: (teamName: string) => void;
  textColour?: string;
  setTextColour: (textColour: string) => void;
  backgroundColour?: string;
  setBackgroundColour: (backgroundColour: string) => void;
  teamLogo?: string;
  setTeamLogo: (teamLogo: string | undefined) => void;
  // The team's line-up. The section is only shown when setPlayers is given.
  players?: Player[];
  setPlayers?: (players: Player[] | undefined) => void;
  appSettings: AppSettings;
  disabled?: boolean;
  // Club presets controls (load/save a saved club), shown above the fields.
  clubPicker?: React.ReactNode;
}

export default function TeamSettings({
  title,
  teamNameFull,
  teamNameAbbreviated,
  setTeamNameFull,
  setTeamNameAbbreviated,
  textColour,
  setTextColour,
  backgroundColour,
  setBackgroundColour,
  teamLogo,
  setTeamLogo,
  players,
  setPlayers,
  appSettings,
  disabled,
  clubPicker,
}: Props) {
  const { t } = useTranslation();
  // This component is rendered once per team, so DOM ids must be unique
  // per panel, otherwise labels focus the other team's input.
  const idPrefix = title.toLowerCase().replace(/\s+/g, '-');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  // Bumped on every new upload and on Remove, so a slow upload that resolves
  // after a newer action has already started can never overwrite it, even
  // if the disabled styling below is somehow bypassed.
  const logoUploadGenerationRef = useRef(0);

  const handleLogoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    const generation = ++logoUploadGenerationRef.current;
    setLogoUploadError(null);
    setLogoUploading(true);
    try {
      const result = await window?.electronAPI?.uploadLogo(file);
      if (logoUploadGenerationRef.current !== generation) return;
      if (result) {
        setTeamLogo(result.url);
      } else {
        setLogoUploadError(t('settings:matchMenu.team.logoUploadError'));
      }
    } catch (error) {
      if (logoUploadGenerationRef.current !== generation) return;
      console.error('Error uploading logo:', error);
      setLogoUploadError(t('settings:matchMenu.team.logoUploadError'));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    logoUploadGenerationRef.current += 1;
    setLogoUploadError(null);
    setTeamLogo(undefined);
  };

  return (
    <CollapsiblePanel title={title}>
      <div className="space-y-4">
        {clubPicker}
        <div className="col-span-full">
          <label
            htmlFor={`${idPrefix}-teamNameFull`}
            className={labelClassName}
          >
            {t('settings:matchMenu.team.nameLabel', { team: title })}
          </label>
          <div className="mt-2">
            <input
              type="text"
              name={`${idPrefix}-teamNameFull`}
              id={`${idPrefix}-teamNameFull`}
              className={inputClassName}
              onChange={(e) => {
                if (disabled !== true) {
                  setTeamNameFull(e.target.value);
                }
              }}
              disabled={disabled}
              readOnly={disabled}
              value={teamNameFull}
            />
          </div>
        </div>
        <div className="col-span-full">
          <label
            htmlFor={`${idPrefix}-teamNameAbbreviated`}
            className={labelClassName}
          >
            {t('settings:matchMenu.team.abbreviatedLabel', { team: title })}
          </label>
          {/* The badge sits beside the field it previews, so the effect of
              each letter is visible without looking away. */}
          <div className="mt-2 flex items-center gap-3">
            <input
              type="text"
              name={`${idPrefix}-teamNameAbbreviated`}
              id={`${idPrefix}-teamNameAbbreviated`}
              className={classNames(inputClassName, 'min-w-0 flex-1')}
              maxLength={3}
              onChange={(e) => {
                if (disabled !== true) {
                  setTeamNameAbbreviated(e.target.value.toLocaleUpperCase());
                }
              }}
              value={teamNameAbbreviated}
              disabled={disabled}
              readOnly={disabled}
            />
            <div className="flex-shrink-0 ring-1 ring-line-strong [--base-size:2rem]">
              <ScoresTeamName
                teamName={teamNameAbbreviated}
                textColour={textColour}
                backgroundColour={backgroundColour}
              />
            </div>
          </div>
        </div>
        <div className="col-span-full">
          <label className={labelClassName}>
            {t('settings:matchMenu.team.logoLabel', { team: title })}
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {teamLogo && (
              <div
                className="h-12 w-12 shrink-0 rounded-lg bg-surface-2 bg-contain bg-center bg-no-repeat ring-1 ring-inset ring-line"
                style={{ backgroundImage: `url("${teamLogo}")` }}
              />
            )}
            <ActionButton
              size="md"
              onClick={() => logoInputRef.current?.click()}
              disabled={disabled || logoUploading}
            >
              {t('settings:matchMenu.team.upload')}
            </ActionButton>
            <input
              type="file"
              ref={logoInputRef}
              style={{ display: 'none' }}
              accept="image/png, image/jpeg, image/svg+xml, image/webp"
              onChange={handleLogoChange}
            />
            {teamLogo && (
              <ActionButton
                size="md"
                onClick={handleRemoveLogo}
                disabled={disabled || logoUploading}
              >
                {t('settings:matchMenu.team.remove')}
              </ActionButton>
            )}
          </div>
          {logoUploadError && (
            <p className={errorTextClassName}>{logoUploadError}</p>
          )}
        </div>
        {setPlayers && (
          <LineupEditor
            idPrefix={idPrefix}
            team={title}
            players={players ?? []}
            setPlayers={setPlayers}
            disabled={disabled}
          />
        )}
        <div className="space-y-2">
          <ColourPicker
            label={t('settings:matchMenu.team.textColourLabel', {
              team: title,
            })}
            onChange={setTextColour}
            value={textColour}
            keyColour={appSettings.keyColour}
            disabled={disabled}
          />
          <ColourPicker
            label={t('settings:matchMenu.team.backgroundColourLabel', {
              team: title,
            })}
            onChange={setBackgroundColour}
            value={backgroundColour}
            keyColour={appSettings.keyColour}
            disabled={disabled}
          />
        </div>
      </div>
    </CollapsiblePanel>
  );
}
