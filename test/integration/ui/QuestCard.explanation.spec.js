/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
let QuestCard;

describe('QuestCard WHY THIS? explanation toggle', () => {
  it('toggles explanation on click', async () => {
    // Vitest will run this test in jsdom (see file pragma)
    // Ensure React is available as a global for runtime JSX helpers
    globalThis.React = React;

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

    // Import the component after React global is set so runtime calls succeed
    const mod = await import('../../../src/components/QuestCard.jsx');
    QuestCard = mod.default;

    render(
      React.createElement(QuestCard, {
        quest,
        difficulty: 0,
        reason: 'Strong next move',
        explanation,
        onComplete: () => {},
        onFuckThis: () => {},
        onReroll: () => {},
      })
    );

    // explanation should not be visible initially
    expect(screen.queryByText('Total:')).toBeNull();

    // Click WHY THIS?
    const btn = screen.getByText('WHY THIS?');
    await userEvent.click(btn);

  // explanation should appear
  expect(screen.getByText('Total:')).toBeTruthy();
  expect(screen.getByText('123')).toBeTruthy();

    // click again to collapse
    await userEvent.click(btn);
    expect(screen.queryByText('Total:')).toBeNull();
  });
});

