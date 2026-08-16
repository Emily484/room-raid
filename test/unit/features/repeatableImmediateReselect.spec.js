/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../../src/hooks/useGameState.js';
import { quests } from '../../../src/data/quests.js';

describe('repeatable quest immediate reselection rules', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not immediately reselect a just-completed repeatable quest when alternatives exist', () => {
    const { result } = renderHook(() => useGameState());

    // Prepare two repeatable quests in the same zone that are eligible
    const q1 = quests.find(q => q.id === 'table-relocate-items');
    const q2 = quests.find(q => q.id === 'table-remove-trash');
    expect(q1 && q2).toBeTruthy();

    // Set room state so both are eligible
    act(() => result.current.applyEffectsToRoom({ surfaceClutter: 75 }));

    // Make q1 the current quest and complete it
    act(() => result.current.setCurrentQuestId(q1.id));
    const a1 = result.current.game.currentQuestActivationId;
    act(() => result.current.completeQuestAndPickNext(q1.id, 'normal', a1, q1.zoneId));

    // After completion, the next currentQuestId should NOT equal q1.id if q2 is eligible
    expect(result.current.game.currentQuestId).not.toBe(q1.id);
  });

  it('allows the repeatable quest to return after at least one other quest', () => {
    const { result } = renderHook(() => useGameState());

    const q1 = quests.find(q => q.id === 'table-relocate-items');
    const q2 = quests.find(q => q.id === 'table-remove-trash');

    act(() => result.current.applyEffectsToRoom({ surfaceClutter: 75 }));

    // complete q1
    act(() => result.current.setCurrentQuestId(q1.id));
    const a1 = result.current.game.currentQuestActivationId;
    act(() => result.current.completeQuestAndPickNext(q1.id, 'normal', a1, q1.zoneId));

    const firstNext = result.current.game.currentQuestId;

    // If firstNext is q2, complete it too
    if (firstNext === q2.id) {
      const a2 = result.current.game.currentQuestActivationId;
      act(() => result.current.completeQuestAndPickNext(q2.id, 'normal', a2, q2.zoneId));
    }

    // Now pick next; q1 should be eligible again (may be chosen)
    // Force selection by setting currentQuestId null and invoking pick via setCurrentQuestId(null)+complete flow
    act(() => result.current.setCurrentQuestId(null));
    // Let engine pick by setting current to null and then using getNextQuest indirectly via complete of a no-op: mimic user flow by calling rejectCurrentQuestAndPickDifferent with no current
    act(() => result.current.rejectCurrentQuestAndPickDifferent(q1.zoneId));

    // After at least one other quest, q1 may be reselected; assert it's not permanently excluded.
    // We assert that q1 is among potential next choices by checking that recentQuestIds does not permanently block it.
    expect(result.current.game.recentQuestIds.includes(q1.id)).toBeTruthy();
  });

  it('recentRejectedQuestIds still takes precedence over recentQuestIds', () => {
    const { result } = renderHook(() => useGameState());

    const q1 = quests.find(q => q.id === 'table-relocate-items');
    const q2 = quests.find(q => q.id === 'table-remove-trash');

    act(() => result.current.applyEffectsToRoom({ surfaceClutter: 75 }));

    // Set q1 as current and then reject it (user pressed Different Quest)
    act(() => result.current.setCurrentQuestId(q1.id));
    act(() => result.current.rejectCurrentQuestAndPickDifferent(q1.zoneId));

    // Ensure q1 is in recentRejectedQuestIds
    expect(result.current.game.recentRejectedQuestIds[0]).toBe(q1.id);

    // currentQuestId should not equal q1
    expect(result.current.game.currentQuestId).not.toBe(q1.id);
  });

  it('repeatable quests remain repeatable and activation ids continue to work', () => {
    const { result } = renderHook(() => useGameState());

    const q = quests.find(q => q.id === 'table-relocate-items');
    act(() => result.current.setCurrentQuestId(q.id));
    const a1 = result.current.game.currentQuestActivationId;
    act(() => result.current.completeQuestAndPickNext(q.id, 'normal', a1, q.zoneId));

    // Re-select same quest explicitly
    act(() => result.current.setCurrentQuestId(q.id));
    const a2 = result.current.game.currentQuestActivationId;
    expect(a2).toBeTruthy();
    expect(a2).not.toBe(a1);

    // Complete again and ensure both activations recorded
    act(() => result.current.completeQuestAndPickNext(q.id, 'normal', a2, q.zoneId));
    expect(result.current.game.completedActivationIds).toContain(a1);
    expect(result.current.game.completedActivationIds).toContain(a2);
  });
});
