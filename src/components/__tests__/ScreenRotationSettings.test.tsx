import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  CustomScreen,
  defaultMatchSettings,
  defaultScreenRotationSettings,
  MatchSettings,
  ScreenRotationSettings as RotationSettings,
} from '@playoverlay/core';
import ScreenRotationSettings from '../Dashboard/ScreenRotationSettings';

const sponsor: CustomScreen = {
  title: 'Sponsor',
  filePath: '/images/sponsor.png',
  url: 'file:///images/sponsor.png',
};

function renderPanel({
  matchSettings = defaultMatchSettings,
  rotating = false,
  initial = defaultScreenRotationSettings,
}: {
  matchSettings?: MatchSettings;
  rotating?: boolean;
  initial?: RotationSettings;
} = {}) {
  const start = vi.fn();
  const stop = vi.fn();
  let current = initial;
  function Harness() {
    const [settings, setSettings] = useState(initial);
    current = settings;
    return (
      <ScreenRotationSettings
        open
        setOpen={() => undefined}
        settings={settings}
        updateSettings={setSettings}
        matchSettings={matchSettings}
        customGraphics={[
          sponsor,
          { ...sponsor, title: 'Logo', type: 'overlay' },
        ]}
        rotating={rotating}
        start={start}
        stop={stop}
      />
    );
  }
  render(<Harness />);
  return { start, stop, settings: () => current };
}

describe('ScreenRotationSettings', () => {
  it('lists the screens in rotation order, with full-screen graphics last and no overlays', () => {
    renderPanel({
      matchSettings: {
        ...defaultMatchSettings,
        awayTeamPlayers: [{ name: 'Kim Lee' }],
      },
    });

    expect(
      screen
        .getAllByRole<HTMLInputElement>('checkbox')
        .map((box) => box.labels?.[0].textContent)
    ).toEqual([
      'Match Title',
      'Away Line-up',
      'Score Bug',
      'Scoreboard',
      'Penalties',
      'End Screen',
      'Sponsor',
    ]);
  });

  it('enables Start once two screens are chosen, and keeps them in rotation order', () => {
    const { start, settings } = renderPanel();
    const startButton = screen.getByRole('button', { name: 'Start rotating' });
    expect(startButton).toBeDisabled();
    expect(
      screen.getByText('Choose at least two screens to rotate.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Sponsor'));
    expect(startButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Match Title'));
    expect(startButton).toBeEnabled();
    expect(settings().screens).toEqual([
      { screen: 'matchTitle' },
      { screen: 'custom', customScreenImageUrl: sponsor.url },
    ]);

    fireEvent.click(startButton);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('commits the seconds per screen on blur, refusing a value out of range', () => {
    const { settings } = renderPanel();
    const seconds = screen.getByLabelText('Seconds per screen');

    fireEvent.change(seconds, { target: { value: '2' } });
    fireEvent.blur(seconds);
    expect(settings().intervalSeconds).toBe(10);
    expect(
      screen.getByText('Enter a whole number of seconds from 3 to 600.')
    ).toBeInTheDocument();

    fireEvent.change(seconds, { target: { value: '20' } });
    fireEvent.keyDown(seconds, { key: 'Enter' });
    expect(settings().intervalSeconds).toBe(20);
  });

  it('switches the half-time start on', () => {
    const { settings } = renderPanel();

    fireEvent.click(
      screen.getByRole('switch', { name: 'Start automatically at half-time' })
    );
    expect(settings().autoStartAtHalfTime).toBe(true);
  });

  it('offers Stop while rotating', () => {
    const { stop } = renderPanel({ rotating: true });

    fireEvent.click(screen.getByRole('button', { name: 'Stop rotating' }));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
