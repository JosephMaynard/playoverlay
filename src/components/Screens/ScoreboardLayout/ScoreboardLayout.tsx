import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scores, Time, ClockFormat } from 'src/types';
import { MatchSettings } from 'src/zodSchemas';
import { formatTimeOfDay } from '../../../utils';
import './ScoreboardLayout.css';

export interface Props {
  scores: Scores;
  matchSettings: MatchSettings;
  time: Time;
  active: boolean;
  clockFormat?: ClockFormat;
}

// Full-screen stadium scoreboard for spectators: two team rows in club
// colours with the score, plus the time of day and the match clock. Covers
// the whole display so no key colour shows through.
export default function ScoreboardLayout({
  scores,
  matchSettings,
  time,
  active,
  clockFormat,
}: Props) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  // The board is opaque and full screen, so the fade-out animation must not
  // play on first mount (it would flash black over the active screen); only
  // animate out after the board has actually been shown.
  const [hasBeenActive, setHasBeenActive] = useState(active);

  // Only tick the wall clock while the scoreboard is on screen
  useEffect(() => {
    if (!active) return;
    setHasBeenActive(true);
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const teamRow = (side: 'home' | 'away') => {
    const name =
      side === 'home'
        ? matchSettings.homeTeamNameFull
        : matchSettings.awayTeamNameFull;
    const logo =
      side === 'home' ? matchSettings.homeTeamLogo : matchSettings.awayTeamLogo;
    const textColour =
      side === 'home'
        ? matchSettings.homeTeamTextColour
        : matchSettings.awayTeamTextColour;
    const backgroundColour =
      side === 'home'
        ? matchSettings.homeTeamBackgroundColour
        : matchSettings.awayTeamBackgroundColour;
    const score = side === 'home' ? scores.homeTeam : scores.awayTeam;

    return (
      <div
        className="ScoreboardLayout_teamRow flex items-center"
        style={{ color: textColour, backgroundColor: backgroundColour }}
      >
        {logo && (
          <div className="ScoreboardLayout_logo flex items-center justify-center">
            <img src={logo} alt="" className="h-full w-full object-contain" />
          </div>
        )}
        <div className="ScoreboardLayout_teamName truncate font-bold uppercase">
          {name}
        </div>
        <div className="ScoreboardLayout_score text-center font-bold tabular-nums">
          {score}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`ScoreboardLayout ${
        active
          ? 'ScoreboardLayout_active'
          : hasBeenActive
            ? 'ScoreboardLayout_hidden'
            : ''
      } absolute left-0 top-0 h-full w-full`}
    >
      <div className="ScoreboardLayout_teams flex flex-col">
        {teamRow('home')}
        {teamRow('away')}
      </div>
      <div className="ScoreboardLayout_times flex flex-col text-white">
        <div className="ScoreboardLayout_timeCell flex flex-col items-center justify-center">
          <div className="ScoreboardLayout_timeLabel uppercase">
            {t('screens:scoreboard.time')}
          </div>
          <div className="ScoreboardLayout_timeValue font-bold tabular-nums">
            {formatTimeOfDay(now, clockFormat).replace(/(am|pm)$/, '')}
            {clockFormat === '12h' && (
              <span className="ScoreboardLayout_meridiem">
                {now.getHours() >= 12
                  ? t('screens:scoreboard.pm')
                  : t('screens:scoreboard.am')}
              </span>
            )}
          </div>
        </div>
        <div className="ScoreboardLayout_timeCell flex flex-col items-center justify-center">
          <div className="ScoreboardLayout_timeLabel uppercase">
            {t('screens:scoreboard.match')}
          </div>
          <div className="ScoreboardLayout_timeValue font-bold tabular-nums">
            {time.time || '0:00'}
            {time.additionalTime && (
              <span className="ScoreboardLayout_additionalTime">
                {' '}
                +{time.additionalTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
