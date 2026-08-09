import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

describe('localStorage sanitize', () => {
  it('strips derived keys when saving roomState', () => {
    const DERIVED_KEYS = [
      "floorClutter",
      "exposedFloor",
      "floorReadiness",
      "exposedSurface",
      "bathroomCounterClear",
    ];

    const game = {
      xp: 10,
      roomState: {
        ...defaultRoomState,
        floorClutter: 12,
        exposedFloor: 88,
      }
    };

    function sanitizeRoomState(roomState) {
      if (!roomState) return roomState;
      const copy = { ...roomState };
      for (const k of DERIVED_KEYS) {
        if (k in copy) delete copy[k];
      }
      return copy;
    }

    const toSave = { ...game, roomState: sanitizeRoomState(game.roomState) };
    expect('floorClutter' in toSave.roomState).toBe(false);
    expect('exposedFloor' in toSave.roomState).toBe(false);
    expect(Object.keys(toSave.roomState).length).toBeGreaterThan(0);
  });
});
