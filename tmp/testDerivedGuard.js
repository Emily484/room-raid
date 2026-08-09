const { applyStateEffects } = require('./src/game/roomState');
const { defaultRoomState } = require('./src/data/defaultRoomState');

console.log('Initial keys present:', Object.keys(defaultRoomState).slice(0,10));

const effects = {
  exposedFloor: -50,
  floorClutter: 10,
  clothingOnFloor: -20,
};

const next = applyStateEffects(defaultRoomState, effects);

console.log('After applying effects:', {
  exposedFloor: next.exposedFloor,
  floorClutter: next.floorClutter,
  clothingOnFloor: next.clothingOnFloor,
});
