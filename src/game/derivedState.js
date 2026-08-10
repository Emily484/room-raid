import { getEstimated } from './roomFields.js';

function clamp(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

export function weightedAverage(items) {
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
      [getEstimated(state, 'clothingOnFloor'), 0.30],
      [getEstimated(state, 'cardboard'), 0.25],
      [getEstimated(state, 'floorTrash'), 0.15],
      [getEstimated(state, 'miscellaneousFloorItems'), 0.30],
    ])
  );
}

export function calculateExposedFloor(state) {
  return clamp(
    100 - getEstimated(state, 'floorObstruction')
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
    100 - getEstimated(state, 'surfaceClutter')
  );
}

export function calculateBathroomCounterExposure(state) {
  return clamp(
    100 - getEstimated(state, 'bathroomCounterClutter')
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