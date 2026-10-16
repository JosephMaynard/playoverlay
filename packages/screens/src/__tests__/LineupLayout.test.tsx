import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultMatchSettings, MatchSettings, Player } from '@playoverlay/core';
import LineupLayout from '../LineupLayout/LineupLayout';

function squad(size: number): Player[] {
  return Array.from({ length: size }, (_, index) => ({
    name: `Player ${index + 1}`,
    number: String(index + 1),
  }));
}

function settings(players?: Player[]): MatchSettings {
  return {
    ...defaultMatchSettings,
    homeTeamNameFull: 'Rovers',
    homeTeamTextColour: '#ffffff',
    homeTeamBackgroundColour: '#aa0000',
    homeTeamLogo: 'file:///logos/rovers.png',
    homeTeamPlayers: players,
  };
}

function columns() {
  return screen.getAllByRole('list').map((list) =>
    within(list)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  );
}

describe('LineupLayout', () => {
  it("shows the team's name, logo and players in one column up to eleven", () => {
    const { container } = render(
      <LineupLayout team="home" matchSettings={settings(squad(11))} active />
    );

    expect(screen.getByText('Rovers')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'file:///logos/rovers.png'
    );
    expect(container.querySelector('.LineupLayout_board')).toHaveClass(
      'LineupLayout_board',
      { exact: true }
    );
    const lists = columns();
    expect(lists).toHaveLength(1);
    expect(lists[0]).toHaveLength(11);
    expect(lists[0][0]).toBe('1Player 1');
  });

  it('splits twelve or more over two balanced columns, the left taking the odd one', () => {
    const { container, rerender } = render(
      <LineupLayout team="home" matchSettings={settings(squad(12))} active />
    );
    expect(columns().map((column) => column.length)).toEqual([6, 6]);

    expect(container.querySelector('.LineupLayout_board')).toHaveClass(
      'LineupLayout_board_twoColumns'
    );

    rerender(
      <LineupLayout team="home" matchSettings={settings(squad(13))} active />
    );
    const lists = columns();
    expect(lists.map((column) => column.length)).toEqual([7, 6]);
    expect(lists[1][0]).toBe('8Player 8');
  });

  it("puts each number in the team's colours, leaving a blank cell when there is none", () => {
    render(
      <LineupLayout
        team="home"
        matchSettings={settings([
          { name: 'Ali Smith', number: '9' },
          { name: 'Jo Bloggs' },
        ])}
        active
      />
    );

    const [smith, bloggs] = screen.getAllByRole('listitem');
    const number = smith.firstElementChild as HTMLElement;
    expect(number).toHaveTextContent('9');
    expect(number).toHaveStyle({
      color: '#ffffff',
      backgroundColor: '#aa0000',
    });
    expect(bloggs.firstElementChild).toBeEmptyDOMElement();
    expect(bloggs).toHaveTextContent('Jo Bloggs');
  });

  it('shows the away team when asked', () => {
    render(
      <LineupLayout
        team="away"
        matchSettings={{
          ...settings(squad(3)),
          awayTeamNameFull: 'United',
          awayTeamPlayers: [{ name: 'Kim Lee', number: '4' }],
        }}
        active
      />
    );

    expect(screen.getByText('United')).toBeInTheDocument();
    expect(screen.getByText('Kim Lee')).toBeInTheDocument();
    expect(screen.queryByText('Player 1')).not.toBeInTheDocument();
  });

  it('renders nothing for a team without players', () => {
    const { container } = render(
      <LineupLayout team="away" matchSettings={settings(squad(5))} active />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('stays hidden, without playing the exit animation, until first shown', () => {
    const { container, rerender } = render(
      <LineupLayout
        team="home"
        matchSettings={settings(squad(5))}
        active={false}
      />
    );
    const layout = container.firstElementChild;
    expect(layout).not.toHaveClass('LineupLayout_hidden');
    expect(layout).not.toHaveClass('LineupLayout_active');

    rerender(
      <LineupLayout team="home" matchSettings={settings(squad(5))} active />
    );
    expect(container.firstElementChild).toHaveClass('LineupLayout_active');

    rerender(
      <LineupLayout
        team="home"
        matchSettings={settings(squad(5))}
        active={false}
      />
    );
    expect(container.firstElementChild).toHaveClass('LineupLayout_hidden');
  });
});
