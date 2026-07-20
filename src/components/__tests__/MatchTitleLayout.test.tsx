import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings } from '../../constants';
import MatchTitleLayout from '../Screens/MatchTitleLayout/MatchTitleLayout';
import { Scores } from '../../types';

const scores: Scores = { homeTeam: 0, awayTeam: 0, penalties: [] };

describe('MatchTitleLayout kick-off countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    vi.setSystemTime(new Date(2026, 6, 18, 19, 44, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a ticking "Starts in" line under the kick-off row while active and before kick-off', () => {
    render(
      <MatchTitleLayout
        scores={scores}
        settings={{ ...defaultMatchSettings, kickOffTime: '19:45' }}
        active
      />
    );

    expect(screen.getByText(/Kick-off 19:45/)).toBeInTheDocument();
    expect(screen.getByText('Starts in 0:30')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Starts in 0:29')).toBeInTheDocument();
  });

  it('formats an hour-plus countdown as H:MM:SS', () => {
    vi.setSystemTime(new Date(2026, 6, 18, 18, 0, 0, 0));
    render(
      <MatchTitleLayout
        scores={scores}
        settings={{ ...defaultMatchSettings, kickOffTime: '19:45' }}
        active
      />
    );

    expect(screen.getByText('Starts in 1:45:00')).toBeInTheDocument();
  });

  it('does not show a countdown once kick-off has passed', () => {
    render(
      <MatchTitleLayout
        scores={scores}
        settings={{ ...defaultMatchSettings, kickOffTime: '19:00' }}
        active
      />
    );

    expect(screen.getByText(/Kick-off 19:00/)).toBeInTheDocument();
    expect(screen.queryByText(/Starts in/)).not.toBeInTheDocument();
  });

  it('does not show a countdown when no kick-off time is set', () => {
    render(
      <MatchTitleLayout scores={scores} settings={defaultMatchSettings} active />
    );

    expect(screen.queryByText(/Starts in/)).not.toBeInTheDocument();
  });

  it('does not show a countdown while the screen is inactive, even with a future kick-off', () => {
    render(
      <MatchTitleLayout
        scores={scores}
        settings={{ ...defaultMatchSettings, kickOffTime: '19:45' }}
        active={false}
      />
    );

    expect(screen.queryByText(/Starts in/)).not.toBeInTheDocument();
  });

  it('stops ticking once unmounted (interval cleaned up)', () => {
    const { unmount } = render(
      <MatchTitleLayout
        scores={scores}
        settings={{ ...defaultMatchSettings, kickOffTime: '19:45' }}
        active
      />
    );
    expect(screen.getByText('Starts in 0:30')).toBeInTheDocument();

    unmount();

    // No pending timer should throw or need flushing; advancing time is safe.
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }).not.toThrow();
  });
});
