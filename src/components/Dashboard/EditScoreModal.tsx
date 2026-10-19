import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { classNames, homeOrAway, MatchSettings, Scores } from '@playoverlay/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal/Modal';
import ActionButton from '../ui/ActionButton';
import { inputClassName } from '../ui/fields';

export interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  scores: Scores;
  matchSettings: MatchSettings;
  // A manual correction, distinct from a goal: it records a "score edit"
  // undo entry and trims the goal log to match (see updateScore).
  updateScore: (scoreUpdates: Partial<Scores>) => void;
}

function TeamScoreField({
  team,
  name,
  score,
  setScore,
}: {
  team: homeOrAway;
  name: string;
  score: number;
  setScore: (score: number) => void;
}) {
  const { t } = useTranslation();
  const id = `${team}TeamScore`;
  // What the operator is typing, committed on blur or Enter. Committing
  // every keystroke would put each intermediate value on air (clearing "3"
  // to type "4" flashes 0 to the display, OBS and the phone) and record one
  // undo entry per keystroke. null means "not editing": show the live score.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const typed = Number(draft);
    setDraft(null);
    if (draft.trim() === '' || !Number.isFinite(typed)) return;
    const next = Math.max(0, Math.trunc(typed));
    if (next !== score) setScore(next);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-fg">
        {t('dashboard:scoreInput.scoreLabel', { team: name })}
      </label>
      <div className="mt-2 flex items-stretch gap-2">
        <ActionButton
          aria-label={t('dashboard:scoreInput.decreaseScoreAria', {
            team: name,
          })}
          icon={<MinusIcon className="h-6 w-6" aria-hidden="true" />}
          onClick={() => {
            setDraft(null);
            if (score > 0) setScore(score - 1);
          }}
        />
        <input
          type="number"
          id={id}
          className={classNames(inputClassName, 'text-center text-xl')}
          min={0}
          value={draft ?? score}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
          }}
        />
        <ActionButton
          aria-label={t('dashboard:scoreInput.increaseScoreAria', {
            team: name,
          })}
          icon={<PlusIcon className="h-6 w-6" aria-hidden="true" />}
          onClick={() => {
            setDraft(null);
            setScore(score + 1);
          }}
        />
      </div>
    </div>
  );
}

// Hand correction of the score, opened from the score in the clock block.
// Goals are added with the goal keys; this is only for putting right a
// score that is wrong, which is why it is a modal and not a live control.
export default function EditScoreModal({
  open,
  setOpen,
  scores,
  matchSettings,
  updateScore,
}: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      setOpen={setOpen}
      title={t('dashboard:scoreInput.editScore')}
      icon="edit"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TeamScoreField
          team="home"
          name={matchSettings.homeTeamNameFull}
          score={scores.homeTeam}
          setScore={(homeTeam) => updateScore({ homeTeam })}
        />
        <TeamScoreField
          team="away"
          name={matchSettings.awayTeamNameFull}
          score={scores.awayTeam}
          setScore={(awayTeam) => updateScore({ awayTeam })}
        />
      </div>
    </Modal>
  );
}
