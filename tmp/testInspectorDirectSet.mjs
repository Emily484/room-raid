import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Direct Set behavior for inspector (valid, boundary, invalid)');

const key = 'miscellaneousFloorItems';

// 1) Direct set to 37
(function testSet37(){
  const room = clone(defaultRoomState);
  const after = applyStateEffects(room, { [key]: { operation: 'set', value: 37 } });
  assert(after[key] === 37, `Direct set 37 failed: got ${after[key]}`);
  console.log(' ✓ Direct set 37 appears everywhere (concrete)');
  const derived = calculateDerivedState(after);
  console.log('   derived floorClutter:', derived.floorClutter.toFixed(2));
})();

// 2) boundary values 0 and 100
(function testBoundaries(){
  const room = clone(defaultRoomState);
  const a0 = applyStateEffects(room, { [key]: { operation: 'set', value: 0 } });
  assert(a0[key] === 0, 'Direct set 0 failed');
  const a100 = applyStateEffects(room, { [key]: { operation: 'set', value: 100 } });
  assert(a100[key] === 100, 'Direct set 100 failed');
  console.log(' ✓ Boundary values 0 and 100 accepted');
})();

// 3) Out of range values clamp to 0/100
(function testOutOfRange(){
  const room = clone(defaultRoomState);
  const aNeg = applyStateEffects(room, { [key]: { operation: 'set', value: -5 } });
  assert(aNeg[key] === 0, `Negative value not clamped to 0: got ${aNeg[key]}`);
  const aOver = applyStateEffects(room, { [key]: { operation: 'set', value: 127 } });
  assert(aOver[key] === 100, `Over value not clamped to 100: got ${aOver[key]}`);
  console.log(' ✓ Out-of-range values clamped to [0,100]');
})();

// 4) invalid inputs (blank, letters) should do nothing — since applyStateEffects expects numbers, invalid UI input should be handled client-side
(function testInvalidInputs(){
  const room = clone(defaultRoomState);
  // Simulate blank/letters by not calling applyStateEffects at all — the UI currently prevents NaN from being sent.
  // But we'll simulate a malformed attempt: operation 'set' with NaN
  const aNaN = applyStateEffects(room, { [key]: { operation: 'set', value: NaN } });
  // clamp(NaN) results in NaN comparisons, but applyStateEffects uses clamp which does Math.max/min, NaN will propagate to NaN
  // However applyStateEffects expects numbers; to be safe, assert we do NOT get NaN in the resulting state
  assert(!Number.isNaN(aNaN[key]), `Invalid NaN leaked into state: ${aNaN[key]}`);

  // simulate missing value by not applying any effect
  const aBlank = applyStateEffects(room, {});
  assert(aBlank[key] === room[key], 'Blank input mutated state unexpectedly');

  console.log(' ✓ Invalid inputs do not corrupt state (NaN not allowed, blank does nothing)');
})();

console.log('All Direct Set tests passed.');
