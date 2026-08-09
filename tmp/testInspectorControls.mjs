import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Inspector control simulation tests starting...');

const keys = [
  { key: 'clothingOnFloor', label: 'Clothing on floor' },
  { key: 'cardboard', label: 'Cardboard' },
  { key: 'floorTrash', label: 'Floor trash' },
  { key: 'miscellaneousFloorItems', label: 'Misc floor objects' },
];

const correctionFactors = {
  muchLess: 0.5,
  less: 0.75,
  correct: 1,
  more: 1.25,
  muchMore: 1.5,
};

const DERIVED_KEYS = ['floorClutter','exposedFloor','floorReadiness','exposedSurface','bathroomCounterClear'];

for (const item of keys) {
  const room = clone(defaultRoomState);
  const startVal = room[item.key];
  const derivedBefore = calculateDerivedState(room);

  console.log(`\nTesting ${item.label}: starting ${startVal}`);

  // Test Less
  const factorLess = correctionFactors.less;
  const expectedLess = Math.round(startVal * factorLess);

  if (expectedLess === startVal) {
    console.log(` SKIP Less: no change (start=${startVal} * ${factorLess} => ${expectedLess})`);
  } else {
    const afterLess = applyStateEffects(room, { [item.key]: { operation: 'set', value: expectedLess } });
    const derivedAfterLess = calculateDerivedState(afterLess);

    assert(afterLess[item.key] === expectedLess, `Inspector Less: field ${item.key} not updated (got ${afterLess[item.key]}, expected ${expectedLess})`);
    console.log(' ✓ value changes in Room Inspector (simulated)');

    // Room State Debug shows derived change
    const derivedChanged = derivedAfterLess.floorClutter !== derivedBefore.floorClutter || derivedAfterLess.exposedFloor !== derivedBefore.exposedFloor;
    assert(derivedChanged, 'Derived metrics did not change after Less (expected change)');
    console.log(' ✓ derived metrics recalculated immediately if affected');

    // Simulate refresh: persist sanitized state and reload
    const persisted = { ...afterLess };
    for (const dk of DERIVED_KEYS) delete persisted[dk];
    const reloadedDerived = calculateDerivedState(persisted);
    const reloaded = { ...persisted, ...reloadedDerived };
    assert(reloaded[item.key] === expectedLess, 'Corrected value did not survive refresh');
    console.log(' ✓ corrected value survives simulated refresh (persistence)');
  }

  // Test More (from original start)
  const factorMore = correctionFactors.more;
  const expectedMore = Math.round(startVal * factorMore);

  if (expectedMore === startVal) {
    console.log(` SKIP More: no change (start=${startVal} * ${factorMore} => ${expectedMore})`);
  } else {
    const afterMore = applyStateEffects(room, { [item.key]: { operation: 'set', value: expectedMore } });
    const derivedAfterMore = calculateDerivedState(afterMore);

    assert(afterMore[item.key] === expectedMore, `Inspector More: field ${item.key} not updated (got ${afterMore[item.key]}, expected ${expectedMore})`);
    console.log(' ✓ More updates room state (simulated)');

    const derivedChangedMore = derivedAfterMore.floorClutter !== derivedBefore.floorClutter || derivedAfterMore.exposedFloor !== derivedBefore.exposedFloor;
    assert(derivedChangedMore, 'Derived metrics did not change after More (expected change)');
    console.log(' ✓ derived metrics recalculated immediately after More');

    // persist check
    const persisted2 = { ...afterMore };
    for (const dk of DERIVED_KEYS) delete persisted2[dk];
    const reloadedDerived2 = calculateDerivedState(persisted2);
    const reloaded2 = { ...persisted2, ...reloadedDerived2 };
    assert(reloaded2[item.key] === expectedMore, 'More-corrected value did not survive refresh');
    console.log(' ✓ More corrected value survives simulated refresh');
  }

  console.log(`PASS: Inspector controls for ${item.label} behave as expected`);
}

console.log('\nAll inspector control simulations passed.');
