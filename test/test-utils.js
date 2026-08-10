import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { makeFieldFromValue, getEstimated } from '../src/game/roomFields.js';

export function mkRoom(overrides = {}) {
  // JSON deep clone defaultRoomState to avoid mutation without extra deps
  const room = JSON.parse(JSON.stringify(defaultRoomState));

  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === 'number') {
      room[k] = makeFieldFromValue(v);
    } else if (v && typeof v === 'object' && typeof v.estimated === 'number') {
      room[k] = { ...v };
    } else {
      room[k] = v;
    }
  }

  return room;
}

export function est(room, key) {
  return getEstimated(room, key);
}
