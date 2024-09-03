import { AppSettings } from 'src/types';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';
import ColourPicker from '../ColorPicker/ColorPicker';
import ScoresTeamName from '../ScoresLayout/ScoresTeamName';

export interface Props {
  title: string;
  teamNameFull: string;
  teamNameAbbreviated: string;
  setTeamNameFull: (teamName: string) => void;
  setTeamNameAbbreviated: (teamName: string) => void;
  textColour: string;
  setTextColour: (textColour: string) => void;
  backgroundColour: string;
  setBackgroundColour: (backgroundColour: string) => void;
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
  appSettings,
  disabled,
}: Props) {
  return (
    <CollapsiblePanel title={title}>
      <div className="col-span-full mb-4">
        <label
          htmlFor="teamNameFull"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {title} Name
        </label>
        <div className="mt-2">
          <input
            type="text"
            name="teamNameFull"
            id="teamNameFull"
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
          htmlFor="homeTeamNameAbbreviated"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {title} Name Abbreviated
        </label>
        <div className="mt-2">
          <input
            type="text"
            name="homeTeamNameAbbreviated"
            id="homeTeamNameAbbreviated"
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
