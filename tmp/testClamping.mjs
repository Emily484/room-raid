import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

function inRange(value) {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

// 1) Repeatedly apply cardboard -20 until it reaches zero
let state = { ...defaultRoomState };
const seq = [];

while ((state.cardboard ?? 0) > 0) {
  seq.push(state.cardboard);
  state = applyStateEffects(state, { cardboard: -20 });
}
seq.push(state.cardboard);

console.log('Cardboard sequence:', seq);

// Verify no negative values
const negativeFound = seq.some((v) => v < 0);
console.log('Any negative cardboard?', negativeFound);

// Verify all concrete and derived values stayed within 0..100 during the process
let stateCheck = { ...defaultRoomState };
let okAll = true;
let iteration = 0;
while ((stateCheck.cardboard ?? 0) > 0) {
  const derived = calculateDerivedState(stateCheck);
  // Check concrete values (keys from defaultRoomState)
  for (const [k, v] of Object.entries(stateCheck)) {
    if (typeof v === 'number' && !inRange(v)) {
      console.error(`Concrete key out of range at iter ${iteration}: ${k} = ${v}`);
      okAll = false;
    }
  }
  // Check derived keys
  for (const [k, v] of Object.entries(derived)) {
    if (!inRange(v)) {
      console.error(`Derived key out of range at iter ${iteration}: ${k} = ${v}`);
      okAll = false;
    }
  }
  stateCheck = applyStateEffects(stateCheck, { cardboard: -20 });
  iteration++;
}
// final check
const finalDerived = calculateDerivedState(stateCheck);
for (const [k, v] of Object.entries(stateCheck)) {
  if (typeof v === 'number' && !inRange(v)) {
    console.error(`Concrete key out of range at final: ${k} = ${v}`);
    okAll = false;
  }
}
for (const [k, v] of Object.entries(finalDerived)) {
  if (!inRange(v)) {
    console.error(`Derived key out of range at final: ${k} = ${v}`);
    okAll = false;
  }
}

console.log('All values stayed within 0..100 during decrements?', okAll);

// 2) Test upper clamp: try to add 200 to clothingOnFloor
let upState = { ...defaultRoomState };
upState = applyStateEffects(upState, { clothingOnFloor: 200 });
console.log('After adding +200 to clothingOnFloor:', upState.clothingOnFloor);

// Check derived after extreme increase
const upDerived = calculateDerivedState(upState);
console.log('Derived after extreme increase:', upDerived.floorClutter, upDerived.exposedFloor);

let upperOk = true;
for (const v of Object.values(upState)) {
  if (typeof v === 'number' && !inRange(v)) {
    upperOk = false;
    console.error('Concrete out of range after positive add', v);
  }
}
for (const v of Object.values(upDerived)) {
  if (!inRange(v)) {
    upperOk = false;
    console.error('Derived out of range after positive add', v);
  }
}
console.log('Upper clamp OK?', upperOk);

// Summary result
if (!negativeFound && okAll && upperOk) {
  console.log('\nPASS: Clamping works - no values left < 0 or > 100');
} else {
  console.log('\nFAIL: Clamping issue detected');
}
