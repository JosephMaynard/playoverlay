import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings } from '../../constants';
import TimeControlPanel, {
  Props as TimeControlPanelProps,
} from '../Dashboard/TimeControlPanel';

function createProps(
  overrides: Partial<TimeControlPanelProps> = {}
): TimeControlPanelProps {
  return {
    time: {
      time: '12:34',
      remainingTime: '32:26',
      matchPhase: 'firstHalf',
    },
    matchSettings: defaultMatchSettings,
    pause: vi.fn(),
    resume: vi.fn(),
    adjustTime: vi.fn(),
    isPaused: false,
    setAdditionalTime: vi.fn(),
    startTime: vi.fn(),
    stopTime: vi.fn(),
    autoSwitchScreens: true,
    setAutoSwitchScreens: vi.fn(),
    setDisplayScreen: vi.fn(),
    ...overrides,
  };
}

describe('TimeControlPanel', () => {
  it('starts the selected match phase and switches to the score bug', async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<TimeControlPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Second Half' }));

    expect(props.startTime).toHaveBeenCalledWith('secondHalf');
    expect(props.setDisplayScreen).toHaveBeenCalledWith('scoreBug');
  });

  it('stops time and switches back to the match title screen', async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<TimeControlPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(props.stopTime).toHaveBeenCalledTimes(1);
    expect(props.setDisplayScreen).toHaveBeenCalledWith('matchTitle');
  });

  it('does not switch screens automatically when the setting is disabled', async () => {
    const user = userEvent.setup();
    const props = createProps({ autoSwitchScreens: false });
    render(<TimeControlPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'First Half' }));

    expect(props.startTime).toHaveBeenCalledWith('firstHalf');
    expect(props.setDisplayScreen).not.toHaveBeenCalled();
  });

  it('sets additional time through the modal shortcuts', async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<TimeControlPanel {...props} />);

    await user.click(
      screen.getByRole('button', { name: 'Set Additional Time' })
    );
    await user.click(await screen.findByRole('button', { name: '5min' }));

    expect(props.setAdditionalTime).toHaveBeenCalledWith(5);
  });
});
