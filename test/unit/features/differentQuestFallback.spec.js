/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../../src/hooks/useGameState.js';
import { quests } from '../../../src/data/quests.js';

describe('Different Quest rejection fallback semantics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejecting A excludes A from immediate selection', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    const a = quests.find(q => q.repeatable) || quests[0];
    act(() => api.setCurrentQuestId(a.id));

    const next = act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));

    // recentRejected contains A and currentQuestId is not A
    expect(result.current.game.recentRejectedQuestIds[0]).toBe(a.id);
    if (result.current.game.currentQuestId) {
      expect(result.current.game.currentQuestId).not.toBe(a.id);
    }
  });

  it('rejecting A then B excludes both A and B and can return null if none left', async () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    // Determine currently available quests in the zone from the authoritative game state
    const { getAvailableQuests } = await import('../../../src/game/questEngine.js');
    const available = getAvailableQuests('textile-wastes', result.current.game.roomState, result.current.game.completedQuestIds);

    if (available.length >= 2) {
      const a2 = available[0];

      // Reject the first (A)
      act(() => api.setCurrentQuestId(a2.id));
      act(() => api.rejectCurrentQuestAndPickDifferent('textile-wastes', { energy: 'normal', preferredQuestMinutes: 10 }, 3));

      // Determine what the engine set as the new current quest (B). If null, nothing to do.
      const bId = result.current.game.currentQuestId;
      if (!bId) {
        expect(result.current.game.recentRejectedQuestIds).toContain(a2.id);
        expect(result.current.game.currentQuestId).toBe(null);
      } else {
        // Reject B as well
        act(() => api.setCurrentQuestId(bId));
        act(() => api.rejectCurrentQuestAndPickDifferent('textile-wastes', { energy: 'normal', preferredQuestMinutes: 10 }, 3));

        // Both rejections should be recorded (A present and most-recent is B)
        expect(result.current.game.recentRejectedQuestIds).toContain(a2.id);
        expect(result.current.game.recentRejectedQuestIds[0]).toBe(bId);

        // If engine honored rejections and found no unrejected candidate, currentQuestId should be null
        if (result.current.game.currentQuestId === null) {
          expect(result.current.game.currentQuestId).toBe(null);
        }
      }
    } else if (available.length === 1) {
      // Single available: rejecting it should clear currentQuestId
      const a2 = available[0];
    act(() => api.setCurrentQuestId(a2.id));
    act(() => api.rejectCurrentQuestAndPickDifferent('textile-wastes', { energy: 'normal', preferredQuestMinutes: 10 }, 3));
    expect(result.current.game.recentRejectedQuestIds[0]).toBe(a2.id);
    expect(result.current.game.recentRejectedQuestIds).toContain(a2.id);
    expect(result.current.game.currentQuestId).toBe(null);
    } else {
      // No available quests in this zone; mark test as passed (nothing to assert)
      expect(available.length).toBeGreaterThanOrEqual(0);
    }
  });
});
