/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../src/App.jsx';
import { MemoryRouter } from 'react-router-dom';
// useGameState not used here because we must exercise the App's own hook instance
import { quests } from '../../../src/data/quests.js';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';

const STORAGE_KEY = 'roomRaidGame';

describe('UI current quest synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

    it('renders authoritative quest from persisted game and follows persisted id after completion', async () => {
      // Seed localStorage with a persisted game that has an active quest and activation id
      const seedQuestId = 'table-relocate-items';
      const seedActivation = 'qa-test-activation-1';

      const seed = {
        ...{
          xp: 0,
          completedQuests: 0,
          completedQuestIds: [],
          recentQuestIds: [],
        },
        currentQuestId: seedQuestId,
        currentQuestActivationId: seedActivation,
        completedActivationIds: [],
        roomState: defaultRoomState,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));

      // Render the real App so it uses the same useGameState hook instance
      render(React.createElement(MemoryRouter, null, React.createElement(App, null)));

      // The App must render the title for the seeded quest (authoritative source)
      const seededQuest = quests.find((q) => q.id === seedQuestId);
      expect(await screen.findByText(new RegExp(seededQuest.title, 'i'))).toBeTruthy();

      // Click the real Quest Complete button
      const completeButton = screen.getByRole('button', { name: /quest complete/i });
      await userEvent.click(completeButton);

      // Wait until the authoritative persisted state records this activation as completed
      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) throw new Error('no saved state yet');
        // The activation we completed should be recorded, or the currentQuestId should have changed
        if (!((saved.completedActivationIds || []).includes(seedActivation)) && saved.currentQuestId === seedQuestId) {
          throw new Error('state not yet advanced');
        }
      }, { timeout: 2000 });

      // Now read the persisted id and ensure the UI corresponds to that persisted id
      const final = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const persistedId = final.currentQuestId;

      if (persistedId) {
        const persistedQuest = quests.find((q) => q.id === persistedId);
        expect(screen.getByText(new RegExp(persistedQuest.title, 'i'))).toBeTruthy();
      } else {
        // No active quest; App should show the empty state message
        expect(screen.getByText(/No quests available/i)).toBeTruthy();
      }
    });
});
