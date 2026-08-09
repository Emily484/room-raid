import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

// Start from default state
const start = { ...defaultRoomState };

const beforeDerived = calculateDerivedState(start);

console.log('Before concrete and derived:');
console.log({
  cardboard: start.cardboard,
  floorClutter: beforeDerived.floorClutter,
  exposedFloor: beforeDerived.exposedFloor,
  mirrorDirty: start.mirrorDirty,
  bedMade: start.bedMade,
  surfaceClutter: start.surfaceClutter,
  sinkCleanliness: start.sinkCleanliness,
});

// Packaging "flatten boxes" normal variant effects
const effects = {
  cardboard: -20,
};

const afterState = applyStateEffects(start, effects);
const afterDerived = calculateDerivedState(afterState);

console.log('\nAfter applying cardboard quest (normal):');
console.log({
  cardboard: afterState.cardboard,
  floorClutter: afterDerived.floorClutter,
  exposedFloor: afterDerived.exposedFloor,
  mirrorDirty: afterState.mirrorDirty,
  bedMade: afterState.bedMade,
  surfaceClutter: afterState.surfaceClutter,
  sinkCleanliness: afterState.sinkCleanliness,
});

console.log('\nDeltas:');
console.log({
  cardboard: afterState.cardboard - start.cardboard,
  floorClutter: (afterDerived.floorClutter - beforeDerived.floorClutter).toFixed(3),
  exposedFloor: (afterDerived.exposedFloor - beforeDerived.exposedFloor).toFixed(3),
  mirrorDirty: (afterState.mirrorDirty ?? null) - (start.mirrorDirty ?? null),
  bedMade: (afterState.bedMade ?? null) - (start.bedMade ?? null),
  surfaceClutter: afterState.surfaceClutter - start.surfaceClutter,
  sinkCleanliness: (afterState.sinkCleanliness ?? null) - (start.sinkCleanliness ?? null),
});
