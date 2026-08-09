import { defaultRoomState } from '../src/data/defaultRoomState.js';

const DERIVED_KEYS = [
  "floorClutter",
  "exposedFloor",
  "floorReadiness",
  "exposedSurface",
  "bathroomCounterClear",
];

function sanitizeRoomState(roomState) {
  if (!roomState) return roomState;
  const copy = { ...roomState };
  for (const k of DERIVED_KEYS) {
    if (k in copy) delete copy[k];
  }
  return copy;
}

// Simulate a game object with a derived key accidentally present
const game = {
  xp: 10,
  roomState: {
    ...defaultRoomState,
    floorClutter: 12,
    exposedFloor: 88,
  }
};

const toSave = {
  ...game,
  roomState: sanitizeRoomState(game.roomState),
};

console.log('roomState saved contains floorClutter?', 'floorClutter' in toSave.roomState);
console.log('roomState saved contains exposedFloor?', 'exposedFloor' in toSave.roomState);
console.log('Saved roomState keys:', Object.keys(toSave.roomState));
