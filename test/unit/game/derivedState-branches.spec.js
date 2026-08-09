import { describe, it, expect } from 'vitest';
import { weightedAverage, calculateFloorClutter } from '../../../src/game/derivedState.js';

describe('derivedState branch coverage', () => {
  it('weightedAverage returns 0 when total weight is zero', () => {
    const items = [[10, 0], [50, 0]];
    expect(weightedAverage(items)).toBe(0);
  });

  it('weightedAverage computes correct average for positive weights', () => {
    const items = [[10, 1], [30, 2]]; // total weight 3, weighted total = 10*1 + 30*2 = 70 => 70/3
    expect(weightedAverage(items)).toBeCloseTo(70 / 3);
  });

  it('calculateFloorClutter handles missing keys and clamps correctly', () => {
    const s = {}; // all fields undefined -> treated as 0
    const c = calculateFloorClutter(s);
    expect(c).toBe(0);

    const s2 = { clothingOnFloor: 200, cardboard: 200, floorTrash: 200, miscellaneousFloorItems: 200 };
    const c2 = calculateFloorClutter(s2);
    expect(c2).toBeLessThanOrEqual(100);
  });
});
