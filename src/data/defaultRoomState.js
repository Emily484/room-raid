import { makeFieldFromValue } from '../game/roomFields.js';

export const defaultRoomState = {
  clothingOnFloor: makeFieldFromValue(30),
  looseClothing: makeFieldFromValue(18),
  cleanClothesOut: makeFieldFromValue(50),

  cardboard: makeFieldFromValue(30),
  loosePackaging: makeFieldFromValue(45),

  floorTrash: makeFieldFromValue(8),
  miscellaneousFloorItems: makeFieldFromValue(50),
  floorObstruction: makeFieldFromValue(20),
  floorCleanliness: makeFieldFromValue(80),

  tableTrash: makeFieldFromValue(30),
  surfaceClutter: makeFieldFromValue(70),
  surfaceCleanliness: makeFieldFromValue(25),

  bedClutter: makeFieldFromValue(30),
  bedMade: makeFieldFromValue(0),

  loungeClutter: makeFieldFromValue(50),
  shelfDisorganization: makeFieldFromValue(40),

  bathroomCounterClutter: makeFieldFromValue(15),
  sinkCleanliness: makeFieldFromValue(95),

  mirrorDirty: makeFieldFromValue(45),
  tubClutter: makeFieldFromValue(25),
  tubCleanliness: makeFieldFromValue(50),
};