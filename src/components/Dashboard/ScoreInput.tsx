import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import ScoresTeamName from '../ScoresLayout/ScoresTeamName';

export interface Props {
  title: string;
  score: number;
  setScore: (score: number) => void;
  id: string;
  teamName: string;
  textColour: string;
  backgroundColour: string;
}

export default function ScoreInput({
  title,
  id,
  score,
  setScore,
  teamName,
  textColour,
  backgroundColour,
}: Props) {
  return (
    <div className="overflow-hidden border border-gray-200 bg-white shadow sm:rounded-md">
      <div className="border-b border-gray-200 bg-white p-3 sm:px-6">
        <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
          <div className="ml-4 mt-2">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              {title}
            </h3>
          </div>
          <div className="ml-4 mt-2 flex-shrink-0 [--base-size:1rem]">
            <ScoresTeamName
              teamName={teamName}
              textColour={textColour}
              backgroundColour={backgroundColour}
            />
          </div>
        </div>
      </div>
      <div className="p-3">
        <label
          htmlFor={id}
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          Score
        </label>
        <div className="mb-4 mt-2 flex rounded-md shadow-sm">
          <div className="relative flex flex-grow items-stretch focus-within:z-10">
            <button
              type="button"
              className="relative -mr-px inline-flex items-center gap-x-1.5 rounded-l-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={() => {
                if (score > 0) {
                  setScore(score - 1);
                }
              }}
            >
              <MinusIcon
                className="-ml-0.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </button>
            <input
              type="number"
              name="number"
              id={id}
              className="block w-full rounded-none border-0 p-1.5 text-center text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              min={0}
              onChange={(e) => {
                const updatedScore = Number(e.target.value);
                if (!Number.isNaN(updatedScore)) {
                  setScore(updatedScore);
                }
              }}
              value={score}
            />
          </div>
          <button
            type="button"
            className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <PlusIcon
              className="-ml-0.5 h-5 w-5 text-gray-400"
              aria-hidden="true"
              onClick={() => setScore(score + 1)}
            />
          </button>
        </div>
        <button
          type="button"
          className="block w-full rounded-md bg-indigo-600 px-3.5 py-4 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          style={{ backgroundColor: backgroundColour }}
          onClick={() => setScore(score + 1)}
        >
          <span className="inline-block rounded bg-black/50 px-4 py-1">
            {title} Scored
          </span>
        </button>
      </div>
    </div>
  );
}
