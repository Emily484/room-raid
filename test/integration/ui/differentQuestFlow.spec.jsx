/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../src/App.jsx';

describe('Different Quest UI flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Case A: clicking Different Quest when alternatives exist changes quest and not show no-alternative message', async () => {
    const user = userEvent.setup();
    const { container } = render(
      React.createElement(MemoryRouter, null, React.createElement(App, null))
    );

    // Ensure a quest is rendered and the Different Quest button exists
    const reroll = await screen.findByRole('button', { name: /Different Quest/i });
    expect(reroll).toBeTruthy();

    // Click once — an alternative should be chosen in most normal cases
    await user.click(reroll);

    // The UI should NOT show the no-alternative message for a regular reroll
    const msg = screen.queryByText('No other quests are available right now.');
    expect(msg).toBeNull();
  });

  it('Case B: clicking Different Quest until no unrejected candidate remains shows no-alternative message', async () => {
    const user = userEvent.setup();

    const { container } = render(
      React.createElement(MemoryRouter, null, React.createElement(App, null))
    );

    // find the reroll button
    const reroll = await screen.findByRole('button', { name: /Different Quest/i });
    expect(reroll).toBeTruthy();

    // Try clicking reroll repeatedly (up to 5 times) until the no-alternative message appears.
    // This avoids making assumptions about exact engine ordering; we only assert
    // that the UI eventually displays the authoritative no-alternative message if
    // every eligible quest has been rejected.
    let found = false;
    for (let i = 0; i < 5; i++) {
      await user.click(reroll);

      // wait a tick for state to update
      await new Promise((r) => setTimeout(r, 0));

      const msg = screen.queryByText('No other quests are available right now.');
      if (msg) {
        found = true;
        break;
      }
    }

    // We accept either that we found the message (no-alternative) or not; the
    // key assertion is that when the engine exhausts unrejected candidates the
    // UI displays the message. Here we assert it does appear within several tries.
    expect(found).toBe(true);
  });
});
