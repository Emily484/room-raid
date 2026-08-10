import { describe, it, expect } from 'vitest';
import { calculateFloorClutter, calculateExposedFloor, calculateFloorReadiness } from '../../../src/game/derivedState.js';
import { mkRoom, est } from '../../test-utils.js';

describe('derivedState helpers', () => {
  it('weighted average and clamp produce expected floorClutter', () => {
    const s = mkRoom({ clothingOnFloor: 100, cardboard: 0, floorTrash: 0, miscellaneousFloorItems: 0 });
    const c = calculateFloorClutter(s);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThanOrEqual(100);
  });

  it('exposed floor clamps below 0/above 100', () => {
    // this uses derived percentage semantics so the clamp to 0..100 still applies
    expect(calculateExposedFloor(mkRoom({ floorObstruction: -50 }))).toBe(100);
    expect(calculateExposedFloor(mkRoom({ floorObstruction: 150 }))).toBe(0);
  });

  it('floor readiness uses exposed floor and floorClutter', () => {
    const s = mkRoom({ floorObstruction: 0, clothingOnFloor: 0, cardboard: 0, floorTrash: 0, miscellaneousFloorItems: 0 });
    const r = calculateFloorReadiness(s);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(100);
  });
});
