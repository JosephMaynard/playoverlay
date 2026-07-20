import { useRef, useState } from 'react';
import { AppSettings } from 'src/types';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ColourPicker from '../ColorPicker/ColorPicker';
import ScoresTeamName from '../Screens/ScoresLayout/ScoresTeamName';

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
  appSettings: AppSettings;
  disabled?: boolean;
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
  appSettings,
  disabled,
}: Props) {
  // This component is rendered once per team, so DOM ids must be unique
  // per panel — otherwise labels focus the other team's input.
  const idPrefix = title.toLowerCase().replace(/\s+/g, '-');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  // Bumped on every new upload and on Remove, so a slow upload that resolves
  // after a newer action has already started can never overwrite it — even
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
        setLogoUploadError('Failed to upload logo. Please try again.');
      }
    } catch (error) {
      if (logoUploadGenerationRef.current !== generation) return;
      console.error('Error uploading logo:', error);
      setLogoUploadError('Failed to upload logo. Please try again.');
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
      <div className="col-span-full mb-4">
        <label
          htmlFor={`${idPrefix}-teamNameFull`}
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {title} Name
        </label>
        <div className="mt-2">
          <input
            type="text"
            name={`${idPrefix}-teamNameFull`}
            id={`${idPrefix}-teamNameFull`}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 sm:text-sm sm:leading-6"
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
      <div className="mb-2 inline-block border border-gray-900 [--base-size:2rem]">
        <ScoresTeamName
          teamName={teamNameAbbreviated}
          textColour={textColour}
          backgroundColour={backgroundColour}
        />
      </div>
      <div className="col-span-full mb-4">
        <label
          htmlFor={`${idPrefix}-teamNameAbbreviated`}
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {title} Name Abbreviated
        </label>
        <div className="mt-2">
          <input
            type="text"
            name={`${idPrefix}-teamNameAbbreviated`}
            id={`${idPrefix}-teamNameAbbreviated`}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700 sm:text-sm sm:leading-6"
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
        </div>
      </div>
      <div className="col-span-full mb-4">
        <label className="block text-sm font-medium leading-6 text-gray-900">
          {title} Logo
        </label>
        <div className="mt-2 flex items-center gap-3">
          {teamLogo && (
            <div
              className="h-12 w-12 shrink-0 rounded-sm bg-contain bg-center bg-no-repeat shadow-sm ring-1 ring-inset ring-gray-300"
              style={{ backgroundImage: `url("${teamLogo}")` }}
            />
          )}
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            onClick={() => logoInputRef.current?.click()}
            disabled={disabled || logoUploading}
          >
            Upload
          </button>
          <input
            type="file"
            ref={logoInputRef}
            style={{ display: 'none' }}
            accept="image/png, image/jpeg, image/svg+xml, image/webp"
            onChange={handleLogoChange}
          />
          {teamLogo && (
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              onClick={handleRemoveLogo}
              disabled={disabled || logoUploading}
            >
              Remove
            </button>
          )}
        </div>
        {logoUploadError && (
          <p className="mt-2 text-xs text-red-600">{logoUploadError}</p>
        )}
      </div>
      <ColourPicker
        label={`${title} Text Colour`}
        onChange={setTextColour}
        value={textColour}
        keyColour={appSettings.keyColour}
        disabled={disabled}
      />
      <ColourPicker
        label={`${title} Background Colour`}
        onChange={setBackgroundColour}
        value={backgroundColour}
        keyColour={appSettings.keyColour}
        disabled={disabled}
      />
    </CollapsiblePanel>
  );
}
