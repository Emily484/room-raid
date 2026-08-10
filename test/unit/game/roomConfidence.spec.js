import { describe, it, expect } from 'vitest';
import { calculateRoomConfidence } from '../../../src/game/roomFields.js';

import { mkRoom } from '../../test-utils.js';

describe('calculateRoomConfidence', () => {
  it('computes arithmetic mean of modeled field confidences', () => {
    const room = {
      clothingOnFloor: { confidence: 1 },
      cardboard: { confidence: 0.8 },
      floorTrash: { confidence: 0.6 },
      miscellaneousFloorItems: { confidence: 0.8 },
    };

    const c = calculateRoomConfidence(room);
    expect(c).toBeCloseTo(0.8, 6);
  });

  it('clamps malformed confidences and ignores non-modeled fields', () => {
    const room = {
      clothingOnFloor: { confidence: 1.2 },
      cardboard: { confidence: -0.5 },
      someDerived: { confidence: 0.9 },
    };

    const c = calculateRoomConfidence(room);
    // clothing -> 1 (clamped), cardboard -> 0 (clamped)
    expect(c).toBeCloseTo((1 + 0) / 2, 6);
  });

  it('returns 1 when there are no valid modeled fields', () => {
    const room = {};
    expect(calculateRoomConfidence(room)).toBe(1);
  });
});
