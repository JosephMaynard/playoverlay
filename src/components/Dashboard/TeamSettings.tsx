import ColourPicker from '../ColorPicker/ColorPicker';

export interface Props {
  title: string;
  teamName: string;
  setTeamName: (teamName: string) => void;
  textColour: string;
  setTextColour: (textColour: string) => void;
  backgroundColour: string;
  setBackgroundColour: (backgroundColour: string) => void;
}

export default function TeamSettings({
  title,
  teamName,
  setTeamName,
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
      <div
        style={{ backgroundColor: backgroundColour, color: textColour }}
        className="mb-2 inline-block border border-gray-900 px-3 py-2 text-lg font-bold"
      >
        {teamName || '?'}
      </div>
      <div className="col-span-full mb-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {title} Name
        </label>
        <div className="mt-2">
          <input
            type="text"
            name="homeTeamName"
            id="homeTeamName"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            maxLength={3}
            onChange={(e) => setTeamName(e.target.value.toLocaleUpperCase())}
            value={teamName}
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
