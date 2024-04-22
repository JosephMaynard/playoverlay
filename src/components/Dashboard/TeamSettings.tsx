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
}: Props) {
  return (
    <div>
      <h2 className="mb-4 mt-8 text-base font-semibold leading-7 text-gray-900">
        {title}
      </h2>
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
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            onChange={(e) => setTeamNameFull(e.target.value)}
            value={teamNameFull}
          />
        </div>
      </div>
      <div className="mb-2 inline-block border border-gray-900 [--base-size:2rem]">
        <ScoresTeamName
          teamName={teamNameAbbreviated || '?'}
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
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            maxLength={3}
            onChange={(e) =>
              setTeamNameAbbreviated(e.target.value.toLocaleUpperCase())
            }
            value={teamNameAbbreviated}
          />
        </div>
      </div>
      <ColourPicker
        label={`${title} Text Colour`}
        onChange={setTextColour}
        value={textColour}
      />
      <ColourPicker
        label={`${title} Background Colour`}
        onChange={setBackgroundColour}
        value={backgroundColour}
      />
    </div>
  );
}
