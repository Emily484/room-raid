function clamp(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function weightedAverage(items) {
  const totalWeight = items.reduce(
    (sum, [, weight]) => sum + weight,
    0
  );

  if (totalWeight === 0) {
    return 0;
  }

  const weightedTotal = items.reduce(
    (sum, [value, weight]) =>
      sum + value * weight,
    0
  );

  return weightedTotal / totalWeight;
}

export function calculateFloorClutter(state) {
  return clamp(
    weightedAverage([
      [state.clothingOnFloor ?? 0, 0.30],
      [state.cardboard ?? 0, 0.25],
      [state.floorTrash ?? 0, 0.15],
      [state.miscellaneousFloorItems ?? 0, 0.30],
    ])
  );
}

export function calculateExposedFloor(state) {
  return clamp(
    100 - (state.floorObstruction ?? 0)
  );
}

export function calculateFloorReadiness(state) {
  const exposedFloor =
    calculateExposedFloor(state);

  const floorClutter =
    calculateFloorClutter(state);

  // Readiness now emphasizes physical accessibility
  // (exposedFloor) much more than cleanliness. Cleanliness
  // influences the decision to vacuum, but it doesn't
  // prevent the vacuum from operating if the carpet is
  // already accessible.
  return clamp(
    exposedFloor * 0.75 +
      (100 - floorClutter) * 0.25
  );
}

export function calculateSurfaceExposure(state) {
  return clamp(
    100 - (state.surfaceClutter ?? 0)
  );
}

export function calculateBathroomCounterExposure(state) {
  return clamp(
    100 -
      (state.bathroomCounterClutter ?? 0)
  );
}

export function calculateDerivedState(state) {
  const floorClutter =
    calculateFloorClutter(state);

  const exposedFloor =
    calculateExposedFloor(state);

  const floorReadiness =
    calculateFloorReadiness(state);

  const exposedSurface =
    calculateSurfaceExposure(state);

  const bathroomCounterClear =
    calculateBathroomCounterExposure(
      state
    );

  return {
    floorClutter,
    exposedFloor,
    floorReadiness,
    exposedSurface,
    bathroomCounterClear,
  };
}