import { MinusIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ScoresTeamName } from '@playoverlay/screens';
import { classNames } from '@playoverlay/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal/Modal';
import SoccerBallIcon from '../Icons/SoccerBallIcon';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';
import { inputClassName } from '../ui/fields';

export interface Props {
  title: string;
  score: number;
  // Adding a goal (the big "scored" button) and editing the score (the pencil
  // modal) are separate actions: onScored records a goal, setScore is a manual
  // correction. Keeping them apart means the goal button reads fresh store
  // state via its handler (rather than the possibly stale score prop) and gets
  // the "home/away goal" undo label, while the modal stays a "score edit".
  onScored: () => void;
  setScore: (score: number) => void;
  id: string;
  teamNameFull: string;
  teamNameAbbreviated: string;
  textColour?: string;
  backgroundColour?: string;
}

export default function ScoreInput({
  title,
  id,
  score,
  onScored,
  setScore,
  teamNameFull,
  teamNameAbbreviated,
  textColour,
  backgroundColour,
}: Props) {
  const { t } = useTranslation();
  const [editScoreModalOpen, setEditScoreModalOpen] = useState(false);
  // What the operator is typing, committed on blur or Enter. Committing every
  // keystroke would put each intermediate value on air (clearing "3" to type
  // "4" flashes 0 to the display, OBS and the phone) and record one undo
  // entry per keystroke. null means "not editing": show the live score.
  const [draftScore, setDraftScore] = useState<string | null>(null);

  const commitDraftScore = () => {
    if (draftScore === null) return;
    const updatedScore = Number(draftScore);
    setDraftScore(null);
    if (draftScore.trim() === '' || !Number.isFinite(updatedScore)) return;
    const nextScore = Math.max(0, Math.trunc(updatedScore));
    if (nextScore !== score) {
      setScore(nextScore);
    }
  };
  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-2xl ring-1 ring-line">
        {/* Team strip in the team's own colours, so the two cards are told
            apart at a glance and not by reading. */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-2"
          style={{ backgroundColor: backgroundColour, color: textColour }}
        >
          <h3 className="truncate text-base font-semibold">{teamNameFull}</h3>
          <div className="flex-shrink-0 ring-1 ring-black/20 [--base-size:0.875rem]">
            <ScoresTeamName
              teamName={teamNameAbbreviated}
              textColour={textColour}
              backgroundColour={backgroundColour}
            />
          </div>
        </div>
        <div className="relative flex min-h-24 items-center justify-center bg-ink text-ink-fg">
          <p className="text-center text-6xl font-semibold tabular-nums leading-none">
            {score}
          </p>
          <IconButton
            label={t('dashboard:scoreInput.editScoreAria', {
              team: teamNameFull,
            })}
            icon={<PencilIcon className="h-6 w-6" aria-hidden="true" />}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-fg/70 hover:bg-white/10 hover:text-ink-fg"
            onClick={() => setEditScoreModalOpen(true)}
          />
        </div>
        <div className="bg-surface p-3">
          <ActionButton
            size="xl"
            block
            onClick={onScored}
            icon={
              <span
                style={{ backgroundColor: backgroundColour, color: textColour }}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-black/10"
              >
                <SoccerBallIcon className="h-7 w-7" />
              </span>
            }
          >
            {t('dashboard:scoreInput.scored', { title })}
          </ActionButton>
        </div>
      </div>
      <Modal
        open={editScoreModalOpen}
        setOpen={(open) => {
          // Closing the modal (Escape, backdrop, close button) keeps what
          // was typed, the same as tabbing away from the field.
          if (!open) commitDraftScore();
          setEditScoreModalOpen(open);
        }}
        title={t('dashboard:scoreInput.editScore')}
        icon="edit"
      >
        <label htmlFor={id} className="block text-sm font-semibold text-fg">
          {t('dashboard:scoreInput.scoreLabel', { team: teamNameFull })}
        </label>
        <div className="mb-4 mt-2 flex items-stretch gap-2">
          <ActionButton
            aria-label={t('dashboard:scoreInput.decreaseScoreAria', {
              team: teamNameFull,
            })}
            icon={<MinusIcon className="h-6 w-6" aria-hidden="true" />}
            onClick={() => {
              setDraftScore(null);
              if (score > 0) {
                setScore(score - 1);
              }
            }}
          />
          <input
            type="number"
            name="number"
            id={id}
            className={classNames(inputClassName, 'text-center text-xl')}
            min={0}
            onChange={(e) => setDraftScore(e.target.value)}
            onBlur={commitDraftScore}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraftScore();
            }}
            value={draftScore ?? score}
          />
          <ActionButton
            aria-label={t('dashboard:scoreInput.increaseScoreAria', {
              team: teamNameFull,
            })}
            icon={<PlusIcon className="h-6 w-6" aria-hidden="true" />}
            onClick={() => {
              setDraftScore(null);
              setScore(score + 1);
            }}
          />
        </div>
      </Modal>
    </>
  );
}
