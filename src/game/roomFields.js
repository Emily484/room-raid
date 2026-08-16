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

// Metadata for canonical modeled fields. Use this to centralize
// bounds/semantics so setters can enforce consistent behavior.
export const FIELD_METADATA = {
  // Percent-like bounded fields (0..100)
  floorCleanliness: { type: 'percent', min: 0, max: 100 },
  surfaceCleanliness: { type: 'percent', min: 0, max: 100 },
  bedMade: { type: 'percent', min: 0, max: 100 },
  sinkCleanliness: { type: 'percent', min: 0, max: 100 },
  tubCleanliness: { type: 'percent', min: 0, max: 100 },
  // floorObstruction is ambiguous in the dataset; treat as percent-like
  // only if it exists as a modeled percent in defaultRoomState. We
  // include it here because it appears in FIELD_KEYS and is used in
  // some vision heuristics as a percentage-like property.
  floorObstruction: { type: 'percent', min: 0, max: 100 },
};

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
  // Apply field-specific bounds when available. For percent-like
  // fields, clamp to 0..100. For other fields, enforce minimum 0 only.
  const meta = FIELD_METADATA[key];
  if (meta && meta.type === 'percent') {
    const min = typeof meta.min === 'number' ? meta.min : 0;
    const max = typeof meta.max === 'number' ? meta.max : 100;
    nextState[key].estimated = Math.max(min, Math.min(max, num));
  } else {
    nextState[key].estimated = Math.max(0, num);
  }
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
  // Apply field-specific bounds when available.
  const meta = FIELD_METADATA[key];
  let observed;
  if (meta && meta.type === 'percent') {
    const min = typeof meta.min === 'number' ? meta.min : 0;
    const max = typeof meta.max === 'number' ? meta.max : 100;
    observed = Math.max(min, Math.min(max, num));
  } else {
    observed = Math.max(0, num);
  }

  // create new canonical field object
  nextState[key] = {
    observed,
    estimated: observed,
    confidence: 1,
    lastObservedAt: observedAt,
  };

  return nextState;
}

// Normalize an existing persisted roomState to conform to canonical field
// metadata bounds. This is pure and does not mutate its input. It will
// clamp 'estimated' to the canonical bounds for percent-like fields and
// enforce minimums for count-like fields. For 'observed' we also apply
// the same bounds because observations are numeric measurements and the
// codebase's observeField helper enforces those bounds on new observations.
export function normalizeRoomState(roomState) {
  if (!roomState || typeof roomState !== 'object') return roomState;

  const next = { ...roomState };

  for (const key of FIELD_KEYS) {
    const f = roomState[key];
    if (!f || typeof f !== 'object') continue;

    const meta = FIELD_METADATA[key];

    // Helper to clamp a numeric value according to metadata
    const clampValue = (num) => {
      const n = Number.isFinite(num) ? num : num;
      if (!Number.isFinite(n)) return n;
      if (meta && meta.type === 'percent') {
        const min = typeof meta.min === 'number' ? meta.min : 0;
        const max = typeof meta.max === 'number' ? meta.max : 100;
        return Math.max(min, Math.min(max, n));
      }
      return Math.max(0, n);
    };

    const observed = f.hasOwnProperty('observed') ? f.observed : undefined;
    const estimated = f.hasOwnProperty('estimated') ? f.estimated : undefined;

    const newField = { ...f };

    // Clamp observed if it's a finite number (observations should obey bounds)
    if (Number.isFinite(observed)) {
      newField.observed = clampValue(observed);
    }

    // Clamp estimated to canonical bounds
    if (Number.isFinite(estimated)) {
      newField.estimated = clampValue(estimated);
    }

    // Preserve confidence and lastObservedAt as-is
    next[key] = newField;
  }

  return next;
}
