import { describe, it, expect } from 'vitest';
import { normalizeRoomState } from '../../../src/game/roomFields.js';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';

describe('normalizeRoomState', () => {
  it('clamps bounded estimated values to 0..100 and preserves observed unless clamping required', () => {
    const input = { ...defaultRoomState };
    input.tubCleanliness = { ...input.tubCleanliness, estimated: 110, observed: 50, confidence: 0.96, lastObservedAt: null };

    const out = normalizeRoomState(input);
    // estimated clamped
    expect(out.tubCleanliness.estimated).toBe(100);
    // observed preserved (50)
    expect(out.tubCleanliness.observed).toBe(50);
    // confidence and timestamp preserved
    expect(out.tubCleanliness.confidence).toBe(0.96);
    expect(out.tubCleanliness.lastObservedAt).toBe(null);
    // original input not mutated
    expect(input.tubCleanliness.estimated).toBe(110);
  });

  it('clamps a bounded 150 to 100 and -10 to 0, leaves valid 75 unchanged', () => {
    const input = { ...defaultRoomState };
    input.surfaceCleanliness = { ...input.surfaceCleanliness, estimated: 150 };
    input.sinkCleanliness = { ...input.sinkCleanliness, estimated: -10 };
    input.floorCleanliness = { ...input.floorCleanliness, estimated: 75 };

    const out = normalizeRoomState(input);
    expect(out.surfaceCleanliness.estimated).toBe(100);
    expect(out.sinkCleanliness.estimated).toBe(0);
    expect(out.floorCleanliness.estimated).toBe(75);
  });

  it('does not cap count fields and floors negative counts to 0', () => {
    const input = { ...defaultRoomState };
    input.cardboard = { ...input.cardboard, estimated: 140 };
    input.clothingOnFloor = { ...input.clothingOnFloor, estimated: -5 };

    const out = normalizeRoomState(input);
    expect(out.cardboard.estimated).toBe(140);
    expect(out.clothingOnFloor.estimated).toBe(0);
  });

  it('is idempotent when applied multiple times', () => {
    const input = { ...defaultRoomState };
    input.tubCleanliness = { ...input.tubCleanliness, estimated: 130 };
    const first = normalizeRoomState(input);
    const second = normalizeRoomState(first);
    expect(second).toEqual(first);
  });
});
