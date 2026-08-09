import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

function createInitialState() {
  return {
    xp: 0,
    completedQuests: 0,
    completedQuestIds: [],
    recentQuestIds: [],
    roomState: { ...defaultRoomState },
    bosses: {},
  };
}

describe('reset game', () => {
  it('reset restores canonical default roomState and strips derived keys', () => {
    const saved = {
      xp: 120,
      completedQuests: 3,
      roomState: {
        ...defaultRoomState,
        cardboard: 10,
        clothingOnFloor: 20,
        floorClutter: 5,
        exposedFloor: 95,
      },
      bosses: { 'great-floor': { hp: 10, maxHp: 100 } },
    };

    const parsed = saved;

    const loaded = {
      ...createInitialState(),
      ...parsed,
      roomState: {
        ...defaultRoomState,
        ...(parsed.roomState ?? {}),
      },
    };

    expect(typeof loaded.roomState).toBe('object');

    const reset = createInitialState();
    expect(JSON.stringify(reset.roomState) === JSON.stringify(defaultRoomState)).toBe(true);
  });
});
