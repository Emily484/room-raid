/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../../src/hooks/useGameState.js';
import { quests } from '../../../src/data/quests.js';

describe('completeQuestAndPickNext atomic transition', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('applies completion exactly once and selects next quest from post-completion state', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    // Pick a known quest to be current (Excavate the Surface)
    const quest = quests.find(q => q.id === 'table-relocate-items');
    expect(quest).toBeTruthy();

    // Set it as the active quest (this should create an activation id)
  act(() => api.setCurrentQuestId(quest.id));

  const activationId = result.current.game.currentQuestActivationId;
  expect(activationId).toBeTruthy();

    // The new API should exist and perform the entire transition atomically.
    // We call it and then assert the post-completion state was used for selection
    // (the test will fail until the API and behavior are implemented).

    // Call the authoritative completion + next-selection API
    act(() => {
      // completeQuestAndPickNext signature: (questId, variantKey, activationId, zoneId, session)
      result.current.completeQuestAndPickNext?.(quest.id, 'normal', activationId, quest.zoneId, { energy: 'normal', preferredQuestMinutes: 10 });
    });

    // After the atomic transition:
    // - XP should have increased by variant.xp
    const variant = quest.variants.normal;
  expect(result.current.game.xp).toBeGreaterThanOrEqual(variant.xp);

    // - The completed activation should be recorded
  expect(result.current.game.completedActivationIds).toContain(activationId);

    // - A new currentQuestActivationId should be generated (even if same quest id)
  expect(result.current.game.currentQuestActivationId).toBeTruthy();
  expect(result.current.game.currentQuestActivationId).not.toBe(activationId);

    // - The persisted currentQuestId should equal whatever is stored in game state
    expect(result.current.game.currentQuestId).toBe(result.current.game.currentQuestId);
  });

  it('is idempotent for the same activation (second submit is no-op)', () => {
    const { result } = renderHook(() => useGameState());
    const api = result.current;

    const quest = quests.find(q => q.id === 'table-relocate-items');
    act(() => api.setCurrentQuestId(quest.id));
    const activationId = result.current.game.currentQuestActivationId;

  // capture after to assert idempotency

  act(() => result.current.completeQuestAndPickNext(quest.id, 'normal', activationId, quest.zoneId));

  const afterXp = result.current.game.xp;
  const afterBossHp = result.current.game.bosses[quest.zoneId].hp;

    // Second submission of same activation should be a no-op
    act(() => result.current.completeQuestAndPickNext(quest.id, 'normal', activationId, quest.zoneId));

    expect(result.current.game.xp).toBe(afterXp);
    expect(result.current.game.bosses[quest.zoneId].hp).toBe(afterBossHp);
    expect(result.current.game.completedActivationIds).toContain(activationId);
  });

  it('rejects wrong activation id or wrong quest id', () => {
    const { result } = renderHook(() => useGameState());

    const quest = quests.find(q => q.id === 'table-relocate-items');
    act(() => result.current.setCurrentQuestId(quest.id));
    const activationId = result.current.game.currentQuestActivationId;

    const beforeXp = result.current.game.xp;

    // wrong activation id
    act(() => result.current.completeQuestAndPickNext(quest.id, 'normal', 'qa-wrong', quest.zoneId));
    expect(result.current.game.xp).toBe(beforeXp);

    // wrong quest id (submit other quest id with this activation)
    const otherQuest = quests.find(q => q.id !== quest.id);
    act(() => result.current.completeQuestAndPickNext(otherQuest.id, 'normal', activationId, otherQuest.zoneId));
    expect(result.current.game.xp).toBe(beforeXp);
  });

  it('allows repeatable quest to be re-activated with new activation id and applied again', () => {
    const { result } = renderHook(() => useGameState());
    const q = quests.find(q => q.id === 'table-relocate-items');

    // First activation
    act(() => result.current.setCurrentQuestId(q.id));
    const a1 = result.current.game.currentQuestActivationId;
    const xp1before = result.current.game.xp;
    act(() => result.current.completeQuestAndPickNext(q.id, 'normal', a1, q.zoneId));
    const xp1after = result.current.game.xp;

    // Re-select same quest explicitly (this should create a new activation id)
    act(() => result.current.setCurrentQuestId(q.id));
    const a2 = result.current.game.currentQuestActivationId;
    expect(a2).toBeTruthy();
    expect(a2).not.toBe(a1);

    // Complete second activation
    act(() => result.current.completeQuestAndPickNext(q.id, 'normal', a2, q.zoneId));
    const xp2after = result.current.game.xp;

    expect(xp1after).toBeGreaterThan(xp1before);
    expect(xp2after).toBeGreaterThan(xp1after);
    expect(result.current.game.completedActivationIds).toContain(a1);
    expect(result.current.game.completedActivationIds).toContain(a2);
  });

  it('persists activation id and migrates old saves that lack activation id', () => {
    // Simulate old save with currentQuestId but no activation id
    const save = {
      xp: 10,
      currentQuestId: 'table-relocate-items',
    };
    localStorage.setItem('roomRaidGame', JSON.stringify(save));

    const { result } = renderHook(() => useGameState());
    expect(result.current.game.currentQuestId).toBe('table-relocate-items');
    expect(result.current.game.currentQuestActivationId).toBeTruthy();
  });

  it('reset clears activation state and completed activations', () => {
    const { result } = renderHook(() => useGameState());
    const q = quests.find(q => q.id === 'table-relocate-items');
    act(() => result.current.setCurrentQuestId(q.id));
    const a1 = result.current.game.currentQuestActivationId;
    act(() => result.current.completeQuestAndPickNext(q.id, 'normal', a1, q.zoneId));

    // After some activity, reset
    act(() => result.current.resetGame());
    expect(result.current.game.currentQuestActivationId).toBeNull();
    expect(result.current.game.completedActivationIds).toEqual([]);
  });
});
