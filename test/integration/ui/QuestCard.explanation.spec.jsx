import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestCard from '../../../src/components/QuestCard.jsx';

describe('QuestCard WHY THIS? explanation toggle', () => {
  it('toggles explanation on click', async () => {
    const explanation = {
      total: 123,
      components: {
        basePriority: 50,
        urgency: 10,
        unlockPotential: 0,
      },
    };

    const quest = {
      title: 'Test Quest',
      description: 'Do a thing',
      variants: {
        normal: { task: 'do it', xp: 5, damage: 1, estimatedMinutes: 5 },
      },
    };

    render(
      <QuestCard
        quest={quest}
        difficulty={0}
        reason={'Strong next move'}
        explanation={explanation}
        onComplete={() => {}}
        onFuckThis={() => {}}
        onReroll={() => {}}
      />
    );

    // explanation should not be visible initially
    expect(screen.queryByText('Total:')).toBeNull();

    // Click WHY THIS?
    const btn = screen.getByText('WHY THIS?');
    await userEvent.click(btn);

    // explanation should appear
    expect(screen.getByText('Total:')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();

    // click again to collapse
    await userEvent.click(btn);
    expect(screen.queryByText('Total:')).toBeNull();
  });
});
