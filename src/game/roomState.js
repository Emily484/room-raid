function clamp(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

import { setEstimated, ensureField, CONFIDENCE_DECAY_PER_INFERENCE } from './roomFields.js';

export function applyStateEffects(
  roomState,
  effects = {}
) {
  const nextState = {
    ...roomState,
  };

  // Keys that are computed from concrete state and must
  // never be directly written by quests or other effects.
  const DERIVED_KEYS = new Set([
    "floorClutter",
    "exposedFloor",
    "floorReadiness",
    "exposedSurface",
    "bathroomCounterClear",
  ]);

  for (
    const [key, effect]
    of Object.entries(effects)
  ) {
    if (DERIVED_KEYS.has(key)) {
      console.warn(
        `Attempted to modify derived state "${key}" via stateEffects. This is ignored.`
      );

      continue;
    }
    // we only operate on the .estimated value of a field
    ensureField(nextState, key);

  // Clone the field object so we don't mutate the original roomState's
  // nested objects. applyStateEffects should be pure w.r.t. nested
  // field objects (we already shallow-copied the top-level state).
  // This prevents callers like scoreQuest/explainAllQuests from
  // accidentally mutating the provided roomState during unlock
  // simulations.
  nextState[key] = { ...nextState[key] };

    if (typeof effect === 'number') {
      if (!Number.isFinite(effect)) {
        console.warn(`Ignored non-finite numeric effect for "${key}":`, effect);
        continue;
      }

      const existedBefore = typeof roomState[key] === 'object' && typeof roomState[key].estimated === 'number';
      const prevEstimated = nextState[key].estimated ?? 0;
      setEstimated(nextState, key, prevEstimated + effect);
      const newEstimated = nextState[key].estimated ?? 0;

      // Only decay confidence when an actual change was applied and the
      // field existed in the input state (unknown keys should not be decayed).
      if (existedBefore && newEstimated !== prevEstimated) {
        const prevConfidence = typeof nextState[key].confidence === 'number' ? nextState[key].confidence : 0;
        nextState[key].confidence = Math.max(0, prevConfidence - CONFIDENCE_DECAY_PER_INFERENCE);
      }

      continue;
    }

    if (typeof effect === 'object' && effect !== null) {
      if (effect.operation === 'set') {
        if (!Number.isFinite(effect.value)) {
          console.warn(`Ignored non-finite set for "${key}":`, effect.value);
        } else {
          const existedBefore = typeof roomState[key] === 'object' && typeof roomState[key].estimated === 'number';
          const prevEstimated = nextState[key].estimated ?? 0;
          setEstimated(nextState, key, effect.value);
          const newEstimated = nextState[key].estimated ?? 0;

          if (existedBefore && newEstimated !== prevEstimated) {
            const prevConfidence = typeof nextState[key].confidence === 'number' ? nextState[key].confidence : 0;
            nextState[key].confidence = Math.max(0, prevConfidence - CONFIDENCE_DECAY_PER_INFERENCE);
          }
        }
      }

      if (effect.operation === 'add') {
        if (!Number.isFinite(effect.value)) {
          console.warn(`Ignored non-finite add for "${key}":`, effect.value);
        } else {
          const existedBefore = typeof roomState[key] === 'object' && typeof roomState[key].estimated === 'number';
          const curr = nextState[key].estimated ?? 0;
          setEstimated(nextState, key, curr + effect.value);
          const newEstimated = nextState[key].estimated ?? 0;

          if (existedBefore && newEstimated !== curr) {
            const prevConfidence = typeof nextState[key].confidence === 'number' ? nextState[key].confidence : 0;
            nextState[key].confidence = Math.max(0, prevConfidence - CONFIDENCE_DECAY_PER_INFERENCE);
          }
        }
      }
    }
  }

  return nextState;
}