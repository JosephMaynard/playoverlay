import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

export interface Props {
  title: string;
  score: number;
  setScore: (score: number) => void;
  id: string;
}

export default function ScoreInput({ title, id, score, setScore }: Props) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white px-6 py-5">
      <label
        htmlFor={id}
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        {title}
      </label>
      <div className="mt-2 flex rounded-md shadow-sm">
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
            className="block w-full rounded-none  border-0 p-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
            className="-ml-0.5 h-8 w-8 text-gray-400"
            aria-hidden="true"
            onClick={() => setScore(score + 1)}
          />
        </button>
      </div>
    </div>
  );
}
