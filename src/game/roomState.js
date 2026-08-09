function clamp(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

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
    const currentValue =
      nextState[key] ?? 0;

    if (typeof effect === "number") {
      if (!Number.isFinite(effect)) {
        console.warn(`Ignored non-finite numeric effect for "${key}":`, effect);
        continue;
      }

      nextState[key] = clamp(
        currentValue + effect
      );

      continue;
    }

    if (
      typeof effect === "object" &&
      effect !== null
    ) {
      if (effect.operation === "set") {
        if (!Number.isFinite(effect.value)) {
          console.warn(`Ignored non-finite set for "${key}":`, effect.value);
        } else {
          nextState[key] = clamp(effect.value);
        }
      }

      if (effect.operation === "add") {
        if (!Number.isFinite(effect.value)) {
          console.warn(`Ignored non-finite add for "${key}":`, effect.value);
        } else {
          nextState[key] = clamp(currentValue + effect.value);
        }
      }
    }
  }

  return nextState;
}