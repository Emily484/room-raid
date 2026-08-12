export const FIELD_KEYS = [
  'clothingOnFloor', 'looseClothing', 'cleanClothesOut',
  'cardboard', 'loosePackaging',
  'floorTrash', 'miscellaneousFloorItems', 'floorObstruction', 'floorCleanliness',
  'tableTrash', 'surfaceClutter', 'surfaceCleanliness',
  'bedClutter', 'bedMade',
  'loungeClutter', 'shelfDisorganization',
  'bathroomCounterClutter', 'sinkCleanliness',
  'mirrorDirty', 'tubClutter', 'tubCleanliness',
];

export function makeFieldFromValue(v) {
  if (v && typeof v === 'object' && typeof v.estimated === 'number') return v;

  if (typeof v === 'number') {
    return {
      observed: v,
      estimated: v,
      confidence: 1,
      lastObservedAt: null,
    };
  }

  return {
    observed: null,
    estimated: 0,
    confidence: 0,
    lastObservedAt: null,
  };
}

export function ensureField(state, key) {
  if (!state[key] || typeof state[key] !== 'object' || typeof state[key].estimated !== 'number') {
    state[key] = makeFieldFromValue(state[key]);
  }
  return state[key];
}

export function getEstimated(state, key) {
  const f = state?.[key];
  if (!f || typeof f !== 'object') return 0;
  const v = f.estimated;
  return typeof v === 'number' ? v : 0;
}

export function getField(state, key) {
  // Return a canonical, non-mutating field object for display/readers.
  // This does not modify the source state.
  const v = state?.[key];
  return makeFieldFromValue(v);
}

export function setEstimated(nextState, key, value) {
  ensureField(nextState, key);
  const num = Number.isFinite(value) ? value : nextState[key].estimated ?? 0;
  nextState[key].estimated = Math.max(0, num);
}

// How much confidence to reduce for each inferred (non-manual) update.
// Exported so it can be tuned centrally and tested.
export const CONFIDENCE_DECAY_PER_INFERENCE = 0.04;

// Calculate the aggregate room confidence as a simple arithmetic mean
// of the canonical modeled fields' confidence values. Ignore derived
// fields. Clamp to 0..1. If no valid modeled fields are present,
// return 1 (optimistic default).
export function calculateRoomConfidence(roomState) {
  if (!roomState || typeof roomState !== 'object') return 1;

  const confidences = [];

  for (const key of FIELD_KEYS) {
    const f = roomState[key];
    if (!f || typeof f !== 'object') continue;
    const c = f.confidence;
    if (typeof c !== 'number' || !Number.isFinite(c)) continue;
    // clamp per-field confidence as defensive measure
    confidences.push(Math.max(0, Math.min(1, c)));
  }

  if (confidences.length === 0) return 1;

  const sum = confidences.reduce((s, v) => s + v, 0);
  const avg = sum / confidences.length;
  return Math.max(0, Math.min(1, avg));
}

// Observation helper: used by the Room Inspector when a user directly
// observes a field value (manual correction). This is a distinct write
// pathway from inference (`applyStateEffects`). It does not mutate the
// provided state or nested field object; instead it returns a shallow-
// copied state with the specified field replaced by a new field object.
export function observeField(state, key, value, observedAt = new Date().toISOString()) {
  const nextState = { ...state };

  // validate numeric value
  let num = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(num)) {
    // If value cannot be coerced to a finite number treat as 0
    num = 0;
  }

  // raw/count fields: enforce minimum of 0
  const observed = Math.max(0, num);

  // create new canonical field object
  nextState[key] = {
    observed,
    estimated: observed,
    confidence: 1,
    lastObservedAt: observedAt,
  };

  return nextState;
}
