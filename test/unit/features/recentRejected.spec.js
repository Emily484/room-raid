/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../../src/hooks/useGameState.js';
import { quests } from '../../../src/data/quests.js';

describe('recentRejectedQuestIds behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejecting A prevents immediate A from being selected', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    // seed current quest to A
    const a = quests[0];
    act(() => api.setCurrentQuestId(a.id));

    // call reject-and-pick
    act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));

    // rejected should include A
    expect(result.current.game.recentRejectedQuestIds[0]).toBe(a.id);
    // new currentQuestId should not be A (if alternatives exist)
    if (result.current.game.currentQuestId) {
      expect(result.current.game.currentQuestId).not.toBe(a.id);
    }
  });

  it('rejecting A then B prevents both A and B immediately', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    const a = quests[0];
    const b = quests.find(q => q.id !== a.id) || quests[1];

    act(() => api.setCurrentQuestId(a.id));
    act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));

    // Now reject current (B)
    act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));

    expect(result.current.game.recentRejectedQuestIds.length).toBeGreaterThanOrEqual(2);
    expect(result.current.game.recentRejectedQuestIds).toContain(a.id);
    // both A and previous should be present
  });

  it('dedupes identical rejections and keeps newest at front', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    const a = quests[0];
    act(() => api.setCurrentQuestId(a.id));
    act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));
    // reject again by setting same id and rejecting again
    act(() => api.setCurrentQuestId(a.id));
    act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));

    expect(result.current.game.recentRejectedQuestIds[0]).toBe(a.id);
    expect(result.current.game.recentRejectedQuestIds.filter(x => x === a.id).length).toBe(1);
  });

  it('enforces max length and evicts older entries', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    // reject up to 5 different quests with maxRejected=3
    const ids = quests.slice(0, 5).map(q => q.id);
    for (const id of ids) {
      act(() => api.setCurrentQuestId(id));
      act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));
    }

    expect(result.current.game.recentRejectedQuestIds.length).toBeLessThanOrEqual(3);
    // newest should be last rejected
    expect(result.current.game.recentRejectedQuestIds[0]).toBe(ids[4]);
  });

  it('A can return after it falls out of the rejection window', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;
    const ids = quests.slice(0, 4).map(q => q.id);

    // reject first three (maxRejected=3) so A is in the list
    for (let i = 0; i < 3; i++) {
      act(() => api.setCurrentQuestId(ids[i]));
      act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));
    }

    // Now reject a fourth to evict the oldest (ids[0])
    act(() => api.setCurrentQuestId(ids[3]));
    act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));

    expect(result.current.game.recentRejectedQuestIds.includes(ids[0])).toBe(false);
  });

  it('persistence and hydration retains recentRejectedQuestIds', () => {
    const { result, unmount } = renderHook(() => useGameState());
    const api = result.current;
    const a = quests[0];
    act(() => api.setCurrentQuestId(a.id));
    act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));

    const saved = JSON.parse(localStorage.getItem('roomRaidGame'));
    expect(saved.recentRejectedQuestIds && saved.recentRejectedQuestIds[0]).toBe(a.id);

    unmount();
    const { result: r2 } = renderHook(() => useGameState());
    expect(r2.current.game.recentRejectedQuestIds && r2.current.game.recentRejectedQuestIds[0]).toBe(a.id);
  });

  it('repeatable quests remain supported (reject does not block repeatability semantics)', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    const repeatable = quests.find(q => q.repeatable) || quests[0];
    act(() => api.setCurrentQuestId(repeatable.id));
    act(() => api.rejectCurrentQuestAndPickDifferent(null, { energy: 'normal', preferredQuestMinutes: 10 }, 3));

    // Should not add to completedQuestIds
    expect(result.current.game.completedQuestIds.includes(repeatable.id)).toBe(false);
  });
});
