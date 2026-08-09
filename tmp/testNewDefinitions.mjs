import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';

console.log('Default room state floor-related concrete keys:');
console.log({
  clothingOnFloor: defaultRoomState.clothingOnFloor,
  cardboard: defaultRoomState.cardboard,
  floorTrash: defaultRoomState.floorTrash,
  miscellaneousFloorItems: defaultRoomState.miscellaneousFloorItems,
  floorObstruction: defaultRoomState.floorObstruction,
  floorCleanliness: defaultRoomState.floorCleanliness,
});

const derived = calculateDerivedState(defaultRoomState);
console.log('\nDerived:');
console.log(derived);
