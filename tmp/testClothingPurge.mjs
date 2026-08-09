import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

// Simulate starting values similar to test description
const start = {
  ...defaultRoomState,
  clothingOnFloor: 90,
};

const before = calculateDerivedState(start);

console.log('Before:', {
  clothingOnFloor: start.clothingOnFloor,
  floorClutter: before.floorClutter,
  exposedFloor: before.exposedFloor,
});

// Apply the normal variant of Clothing Purge
const effects = {
  clothingOnFloor: -15,
  looseClothing: -10,
};

const afterState = applyStateEffects(start, effects);
const afterDerived = calculateDerivedState(afterState);

console.log('After concrete:', { clothingOnFloor: afterState.clothingOnFloor });
console.log('After derived:', {
  floorClutter: afterDerived.floorClutter,
  exposedFloor: afterDerived.exposedFloor,
});

console.log('Delta floorClutter:', (afterDerived.floorClutter - before.floorClutter).toFixed(3));
console.log('Delta exposedFloor:', (afterDerived.exposedFloor - before.exposedFloor).toFixed(3));
