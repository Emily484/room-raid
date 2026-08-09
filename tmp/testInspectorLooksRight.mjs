import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: "Looks right" should not mutate state');

const targetKey = 'cardboard';
const start = 25;

const room = clone(defaultRoomState);
room.cardboard = start;

// Simulate clicking "Looks right" which applies factor 1 -> set to Math.round(current * 1)
const expected = Math.round(start * 1);
const after = applyStateEffects(room, { [targetKey]: { operation: 'set', value: expected } });

assert(after[targetKey] === start, `Looks right mutated ${targetKey}: got ${after[targetKey]}, expected ${start}`);

// Check no other concrete metric drifted
for (const k of Object.keys(room)) {
  if (k === targetKey) continue;
  if (typeof room[k] === 'number') {
    assert(after[k] === room[k], `Unexpected drift in key ${k}: before=${room[k]} after=${after[k]}`);
  }
}

// Check derived recomputation is consistent (should change only if concrete changed; here no change)
const beforeDerived = calculateDerivedState(room);
const afterDerived = calculateDerivedState(after);
for (const dk of Object.keys(beforeDerived)) {
  assert(beforeDerived[dk] === afterDerived[dk], `Derived metric ${dk} changed unexpectedly: before=${beforeDerived[dk]} after=${afterDerived[dk]}`);
}

// Simulate persistence cycle: sanitize and reload
const DERIVED_KEYS = ['floorClutter','exposedFloor','floorReadiness','exposedSurface','bathroomCounterClear'];
const persisted = { ...after };
for (const dk of DERIVED_KEYS) delete persisted[dk];
const reloadedDerived = calculateDerivedState(persisted);
const reloaded = { ...persisted, ...reloadedDerived };
assert(reloaded[targetKey] === start, 'Value did not survive persistence roundtrip unchanged');

console.log('PASS: "Looks right" did not mutate state, no hidden drift detected.');
