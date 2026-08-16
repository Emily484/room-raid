/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import App from '../../../src/App.jsx';
import { MemoryRouter } from 'react-router-dom';
import { useGameState } from '../../../src/hooks/useGameState.js';
import { quests } from '../../../src/data/quests.js';

describe('UI current quest synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('updates rendered QuestCard when authoritative game.currentQuestId changes after completion', async () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    // Activate 'table-relocate-items' (Excavate the Surface)
    const quest = quests.find(q => q.id === 'table-relocate-items');
    act(() => api.setCurrentQuestId(quest.id));

    // Render full App UI
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    // Sanity: initial rendered card should contain the Excavate title
    expect(screen.getByText(/Excavate the Surface/i)).toBeTruthy();

    // Complete the current activation via authoritative API
    const activationId = result.current.game.currentQuestActivationId;
    act(() => {
      result.current.completeQuestAndPickNext(quest.id, 'normal', activationId, quest.zoneId, { energy: 'normal', preferredQuestMinutes: 10 });
    });

    // After atomic transition, authoritative currentQuestId should differ or equal with new activation
    const newQuestId = result.current.game.currentQuestId;
    const newActivation = result.current.game.currentQuestActivationId;

    // If a different quest was selected, UI should show that title
    if (newQuestId && newQuestId !== quest.id) {
      const nextQuest = quests.find(q => q.id === newQuestId);
      expect(screen.getByText(new RegExp(nextQuest.title, 'i'))).toBeTruthy();
    } else {
      // If the engine legitimately selected the same quest, ensure activation changed
      expect(newActivation).toBeTruthy();
      expect(newActivation).not.toBe(activationId);
      // UI should still show the same quest title
      expect(screen.getByText(/Excavate the Surface/i)).toBeTruthy();
    }
  });
});
