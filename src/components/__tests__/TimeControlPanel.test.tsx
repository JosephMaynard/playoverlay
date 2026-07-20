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
    ...overrides,
  };
}

// Auto-switch-screens behaviour (jumping to scoreBug on start / matchTitle
// on stop) is centralised in useMatchClock's startTime/stopTime as of
// v0.17.0 (see Dashboard.test.tsx for the end-to-end contract) rather than
// being decided here, so this panel is only responsible for calling
// startTime/stopTime and for reflecting the setting in its own toggle.
describe('TimeControlPanel', () => {
  it('starts the selected match phase', async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<TimeControlPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Second Half' }));

    expect(props.startTime).toHaveBeenCalledWith('secondHalf');
  });

  it('stops time', async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<TimeControlPanel {...props} />);

    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(props.stopTime).toHaveBeenCalledTimes(1);
  });

  it('reflects the auto switch screens setting in its own toggle', () => {
    const props = createProps({ autoSwitchScreens: false });
    render(<TimeControlPanel {...props} />);

    expect(screen.getByRole('switch')).not.toBeChecked();
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
