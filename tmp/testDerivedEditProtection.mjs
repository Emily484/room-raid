import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Derived metrics cannot be directly edited');

const room = clone(defaultRoomState);
const derivedBefore = calculateDerivedState(room);

// Attempt to set derived keys directly
const attempts = {
  exposedFloor: { operation: 'set', value: 10 },
  floorReadiness: { operation: 'set', value: 99 },
  bathroomCounterClear: { operation: 'set', value: 100 },
};

const after = applyStateEffects(room, attempts);

// Ensure the concrete state didn't gain derived properties
for (const dk of Object.keys(attempts)) {
  assert(!(dk in after), `Derived key ${dk} was written into roomState`);
}

// Derived recomputed should equal previous derived (since concrete didn't change)
const derivedAfter = calculateDerivedState(after);
for (const k of Object.keys(derivedBefore)) {
  assert(derivedAfter[k] === derivedBefore[k], `Derived metric ${k} changed unexpectedly after direct-edit attempt (before=${derivedBefore[k]}, after=${derivedAfter[k]})`);
}

console.log('PASS: derived keys cannot be directly edited; derived values remain computed from concrete state');
