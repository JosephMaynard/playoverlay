import { MinusIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import ScoresTeamName from '../Screens/ScoresLayout/ScoresTeamName';
import { useState } from 'react';
import Modal from '../Modal/Modal';
import SoccerBallIcon from '../Icons/SoccerBallIcon';

export interface Props {
  title: string;
  score: number;
  setScore: (score: number) => void;
  id: string;
  teamNameFull: string;
  teamNameAbbreviated: string;
  textColour: string;
  backgroundColour: string;
}

export default function ScoreInput({
  title,
  id,
  score,
  setScore,
  teamNameFull,
  teamNameAbbreviated,
  textColour,
  backgroundColour,
}: Props) {
  const [editScoreModalOpen, setEditScoreModalOpen] = useState(false);
  return (
    <>
      <div className="overflow-hidden border border-gray-200 bg-white shadow sm:rounded-md">
        <div className="border-b border-gray-200 bg-white p-3 sm:px-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
            <div className="ml-4 mt-2">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                {teamNameFull}
              </h3>
            </div>
            <div className="ml-4 mt-2 flex-shrink-0 ring-1 ring-gray-300 [--base-size:1rem]">
              <ScoresTeamName
                teamName={teamNameAbbreviated}
                textColour={textColour}
                backgroundColour={backgroundColour}
              />
            </div>
          </div>
        </div>

        <div className="relative flex min-h-16 flex-col items-center justify-center bg-black py-1">
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-4xl font-semibold text-white">
              {score}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Edit ${teamNameFull} score`}
            className="absolute right-3 top-3 rounded-full bg-white p-2 text-black shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setEditScoreModalOpen(true)}
          >
            <PencilIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-3">
          <button
            type="button"
            className="flex w-full items-center overflow-hidden rounded-md bg-white pr-4 font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            onClick={() => setScore(score + 1)}
          >
            <span
              style={{ backgroundColor: backgroundColour, color: textColour }}
              className="flex h-14 w-20 items-center justify-center rounded-l-md ring-1 ring-inset ring-gray-300"
            >
              <SoccerBallIcon className="h-9 w-9" />
            </span>
            <span className="mx-auto">{title} Scored</span>
          </button>
        </div>
      </div>
      <Modal
        open={editScoreModalOpen}
        setOpen={setEditScoreModalOpen}
        title="Edit Score"
        icon="edit"
      >
        <label htmlFor={id}>{teamNameFull} score</label>
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
                  setScore(Math.max(0, Math.trunc(updatedScore)));
                }
              }}
              value={score}
            />
          </div>
          <button
            type="button"
            className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            onClick={() => setScore(score + 1)}
          >
            <PlusIcon
              className="-ml-0.5 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </button>
        </div>
      </Modal>
    </>
  );
}
