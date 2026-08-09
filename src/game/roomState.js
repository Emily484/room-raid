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

  for (
    const [key, effect]
    of Object.entries(effects)
  ) {
    const currentValue =
      nextState[key] ?? 0;

    if (typeof effect === "number") {
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
        nextState[key] = clamp(
          effect.value
        );
      }

      if (effect.operation === "add") {
        nextState[key] = clamp(
          currentValue +
            effect.value
        );
      }
    }
  }

  return nextState;
}