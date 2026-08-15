/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../../src/hooks/useGameState.js';
import { getNextQuest } from '../../../src/game/questEngine.js';
import { quests } from '../../../src/data/quests.js';

describe('current quest lifecycle and persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists currentQuestId on selection and restores on hydration', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    // simulate picking a quest and persisting id
    const pick = getNextQuest('random', api.game.roomState, api.game.completedQuestIds, api.game.recentQuestIds, null, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(pick).toBeTruthy();
    act(() => api.setCurrentQuestId(pick.id));

    // re-render hook to simulate reload
    const { result: r2 } = renderHook(() => useGameState());
    expect(r2.current.game.currentQuestId).toBe(pick.id);
  });

  it('Different Quest changes and persists currentQuestId and excludes previous one immediately', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;
    const pick = getNextQuest('random', api.game.roomState, api.game.completedQuestIds, api.game.recentQuestIds, null, { energy: 'normal', preferredQuestMinutes: 10 });
    act(() => api.setCurrentQuestId(pick.id));

    // request a different quest via getNextQuest excluding current id
    const alt = getNextQuest('random', api.game.roomState, api.game.completedQuestIds, api.game.recentQuestIds, pick.id, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(alt).toBeTruthy();
    expect(alt.id).not.toBe(pick.id);
  });

  it('reset clears persisted currentQuestId', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;
    const pick = getNextQuest('random', api.game.roomState, api.game.completedQuestIds, api.game.recentQuestIds, null, { energy: 'normal', preferredQuestMinutes: 10 });
    act(() => api.setCurrentQuestId(pick.id));
    act(() => api.resetGame());
    // after reset, persisted should be null
    const { result: r2 } = renderHook(() => useGameState());
    expect(r2.current.game.currentQuestId).toBeNull();
  });
});
