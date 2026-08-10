import { describe, it, expect } from 'vitest';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { observeField } from '../../../src/game/roomFields.js';
import { mkRoom, est } from '../../test-utils.js';

describe('confidence decay for inferred updates', () => {
  it('single inference decays confidence by constant', () => {
    const before = mkRoom({ clothingOnFloor: { observed: 10, estimated: 10, confidence: 1, lastObservedAt: 'OLD' } });
    const after = applyStateEffects(before, { clothingOnFloor: { operation: 'add', value: -1 } });

    expect(after.clothingOnFloor.estimated).toBe(9);
    expect(after.clothingOnFloor.confidence).toBeCloseTo(1 - 0.04, 6);
    // observed and lastObservedAt unchanged
    expect(after.clothingOnFloor.observed).toBe(10);
    expect(after.clothingOnFloor.lastObservedAt).toBe('OLD');
  });

  it('multiple inferences decay cumulatively but not below 0', () => {
    let room = mkRoom({ clothingOnFloor: { observed: 10, estimated: 10, confidence: 1, lastObservedAt: 'OLD' } });

    room = applyStateEffects(room, { clothingOnFloor: { operation: 'add', value: -1 } });
    expect(room.clothingOnFloor.confidence).toBeCloseTo(0.96, 6);

    room = applyStateEffects(room, { clothingOnFloor: { operation: 'add', value: -1 } });
    expect(room.clothingOnFloor.confidence).toBeCloseTo(0.92, 6);

    room = applyStateEffects(room, { clothingOnFloor: { operation: 'add', value: -1 } });
    expect(room.clothingOnFloor.confidence).toBeCloseTo(0.88, 6);

    // Further inferences will only reduce confidence when the
    // estimated value actually changes. Ensure confidence remains >= 0
    for (let i = 0; i < 100; i++) {
      room = applyStateEffects(room, { clothingOnFloor: { operation: 'add', value: -1 } });
    }

    expect(room.clothingOnFloor.confidence).toBeGreaterThanOrEqual(0);
  });

  it('confidence floor does not go below 0', () => {
    let room = mkRoom({ clothingOnFloor: { observed: 5, estimated: 5, confidence: 0.02, lastObservedAt: 'OLD' } });

    room = applyStateEffects(room, { clothingOnFloor: { operation: 'add', value: -1 } });
    expect(room.clothingOnFloor.confidence).toBeGreaterThanOrEqual(0);

    // apply enough to attempt going negative
    for (let i = 0; i < 10; i++) {
      room = applyStateEffects(room, { clothingOnFloor: { operation: 'add', value: -1 } });
    }

    expect(room.clothingOnFloor.confidence).toBeGreaterThanOrEqual(0);
  });

  it('manual observation resets confidence to 1 and updates timestamps', () => {
    const before = mkRoom({ clothingOnFloor: { observed: 80, estimated: 62, confidence: 0.76, lastObservedAt: 'OLD_TIMESTAMP' } });
    const observedAt = 'NEW_TIMESTAMP';

    const after = observeField(before, 'clothingOnFloor', 67, observedAt);

    expect(after.clothingOnFloor.observed).toBe(67);
    expect(after.clothingOnFloor.estimated).toBe(67);
    expect(after.clothingOnFloor.confidence).toBe(1);
    expect(after.clothingOnFloor.lastObservedAt).toBe(observedAt);
  });

  it('unaffected fields do not lose confidence', () => {
    const before = mkRoom({ clothingOnFloor: { estimated: 10, confidence: 1 }, floorTrash: { estimated: 5, confidence: 0.5 } });
    const after = applyStateEffects(before, { clothingOnFloor: { operation: 'add', value: 1 } });

    expect(after.clothingOnFloor.confidence).toBeCloseTo(0.96, 6);
    expect(after.floorTrash.confidence).toBeCloseTo(0.5, 6);
  });

  it('invalid / no-op effects do not reduce confidence', () => {
    const before = mkRoom({ clothingOnFloor: { estimated: 10, confidence: 1 } });

    // non-finite
    const after1 = applyStateEffects(before, { clothingOnFloor: NaN });
    expect(after1.clothingOnFloor.confidence).toBeCloseTo(1, 6);

    // unknown operation is ignored
    const after2 = applyStateEffects(before, { clothingOnFloor: { operation: 'multiply', value: 2 } });
    expect(after2.clothingOnFloor.confidence).toBeCloseTo(1, 6);

    // no-op effect (add 0)
    const after3 = applyStateEffects(before, { clothingOnFloor: { operation: 'add', value: 0 } });
    expect(after3.clothingOnFloor.confidence).toBeCloseTo(1, 6);
  });

  it('simulation/pure scoring does not mutate real room state confidence', () => {
    const before = mkRoom({ clothingOnFloor: { estimated: 10, confidence: 1 } });
    const simulated = applyStateEffects(before, { clothingOnFloor: { operation: 'add', value: -2 } });

    // simulated should have decayed confidence
    expect(simulated.clothingOnFloor.confidence).toBeCloseTo(0.96, 6);

    // original input must be unchanged
    expect(before.clothingOnFloor.confidence).toBeCloseTo(1, 6);
  });
});
