import { describe, it, expect } from 'vitest';
import { calculateDerivedState } from '../../../src/game/derivedState.js';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { observeField } from '../../../src/game/roomFields.js';
import { mkRoom } from '../../test-utils.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('inspector controls', () => {
  it('simulates Less and More corrections and persistence', () => {
    const keys = [
      { key: 'clothingOnFloor', label: 'Clothing on floor' },
      { key: 'cardboard', label: 'Cardboard' },
      { key: 'floorTrash', label: 'Floor trash' },
      { key: 'miscellaneousFloorItems', label: 'Misc floor objects' },
    ];

    const correctionFactors = { less: 0.75, more: 1.25 };
    const DERIVED_KEYS = ['floorClutter','exposedFloor','floorReadiness','exposedSurface','bathroomCounterClear'];

    for (const item of keys) {
      const room = mkRoom();
      const startVal = room[item.key].estimated;
      const derivedBefore = calculateDerivedState(room);

      const expectedLess = Math.round(startVal * correctionFactors.less);
      if (expectedLess !== startVal) {
      const afterLess = observeField(room, item.key, expectedLess);
  const derivedAfterLess = calculateDerivedState(afterLess);
  expect(afterLess[item.key].estimated).toBe(expectedLess);
        const derivedChanged = derivedAfterLess.floorClutter !== derivedBefore.floorClutter || derivedAfterLess.exposedFloor !== derivedBefore.exposedFloor;
        expect(derivedChanged).toBe(true);
        const persisted = { ...afterLess };
        for (const dk of DERIVED_KEYS) delete persisted[dk];
        const reloadedDerived = calculateDerivedState(persisted);
        const reloaded = { ...persisted, ...reloadedDerived };
        expect(reloaded[item.key].estimated).toBe(expectedLess);
      }

      const expectedMore = Math.round(startVal * correctionFactors.more);
      if (expectedMore !== startVal) {
      const afterMore = observeField(room, item.key, expectedMore);
  const derivedAfterMore = calculateDerivedState(afterMore);
  expect(afterMore[item.key].estimated).toBe(expectedMore);
        const derivedChangedMore = derivedAfterMore.floorClutter !== derivedBefore.floorClutter || derivedAfterMore.exposedFloor !== derivedBefore.exposedFloor;
        expect(derivedChangedMore).toBe(true);
        const persisted2 = { ...afterMore };
        for (const dk of DERIVED_KEYS) delete persisted2[dk];
        const reloadedDerived2 = calculateDerivedState(persisted2);
        const reloaded2 = { ...persisted2, ...reloadedDerived2 };
        expect(reloaded2[item.key].estimated).toBe(expectedMore);
      }
    }
  });
});
