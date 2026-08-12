// Pure calibration helpers for Phase 7C
// Stores feedback in localStorage under a dedicated key.

const STORAGE_KEY = 'roomRaidCalibration';

export const MIN_CALIBRATION_SAMPLES = 3;

// Field calibration config
export const FIELD_CALIBRATION = {
  clothingOnFloor: {
    type: 'count',
    strategy: 'midpoint',
    multiplier: 1,
    offset: 0,
  },

  floorObstruction: {
    type: 'percent',
    strategy: 'midpoint',
    multiplier: 1,
    offset: 0,
  },

  surfaceClutter: {
    type: 'percent',
    strategy: 'midpoint',
    multiplier: 1,
    offset: 0,
  },
};

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Could not load calibration records:', e);
    return [];
  }
}

function saveAll(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Could not save calibration records:', e);
  }
}

export function getCalibrationRule(field) {
  return FIELD_CALIBRATION[field] ?? null;
}

export function applyCalibrationToProposal(proposal) {
  // proposal is the object produced by reconciliation.generateProposalForObservation
  // we must not mutate proposal.input fields; return a shallow copy with rawProposedValue and proposedValue
  if (!proposal) return proposal;

  const raw = proposal.proposedValue === undefined ? null : proposal.proposedValue;
  const field = proposal.field;

  const cfg = getCalibrationRule(field);
  if (!cfg || raw === null || raw === undefined || typeof raw !== 'number') {
    // nothing to do
    return { ...proposal, rawProposedValue: raw, proposedValue: raw, calibration: { applied: false } };
  }

  // Apply multiplier+offset
  let calibrated = (raw * (cfg.multiplier ?? 1)) + (cfg.offset ?? 0);

  // Clamping
  if (cfg.type === 'count') {
    calibrated = Math.max(0, calibrated);
  }
  if (cfg.type === 'percent') {
    calibrated = Math.max(0, Math.min(100, calibrated));
  }

  // Round consistently to 1 decimal like reconciliation
  calibrated = Math.round(calibrated * 10) / 10;

  return {
    ...proposal,
    rawProposedValue: raw,
    proposedValue: calibrated,
    calibration: {
      applied: true,
      multiplier: cfg.multiplier,
      offset: cfg.offset,
      type: cfg.type,
    },
  };
}

function makeId() {
  return `cal-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}

export function recordCalibrationFeedback(feedback) {
  // feedback must include minimal required fields; validate shape
  const allowedVerdicts = ['accurate', 'too_high', 'too_low', 'wrong_type'];
  if (!feedback || typeof feedback !== 'object') throw new Error('Invalid feedback');
  if (!feedback.field || typeof feedback.field !== 'string') throw new Error('Missing field');
  if (!allowedVerdicts.includes(feedback.verdict)) throw new Error('Invalid verdict');

  if (feedback.correctedValue !== undefined && feedback.correctedValue !== null) {
    if (typeof feedback.correctedValue !== 'number' || !Number.isFinite(feedback.correctedValue)) {
      throw new Error('Invalid correctedValue');
    }
  }

  const rec = {
    id: feedback.id || makeId(),
    createdAt: feedback.createdAt || new Date().toISOString(),
    analysisId: feedback.analysisId || null,
    scanId: feedback.scanId || null,
    field: feedback.field,
    currentValue: typeof feedback.currentValue === 'number' ? feedback.currentValue : null,
    rawVisionEstimate: feedback.rawVisionEstimate || null,
    proposedValue: typeof feedback.proposedValue === 'number' ? feedback.proposedValue : null,
    verdict: feedback.verdict,
    correctedValue: typeof feedback.correctedValue === 'number' ? feedback.correctedValue : null,
    confidence: typeof feedback.confidence === 'number' ? feedback.confidence : null,
  };

  const all = loadAll();
  all.push(rec);
  saveAll(all);

  return rec;
}

export function summarizeCalibration() {
  const all = loadAll();
  // Aggregate by field
  const byField = {};
  for (const r of all) {
    const f = r.field;
    if (!byField[f]) byField[f] = { samples: 0, accurate: 0, too_high: 0, too_low: 0, wrong_type: 0, signedErrors: [], absErrors: [] };
    const bucket = byField[f];
    bucket.samples += 1;
    bucket[r.verdict] = (bucket[r.verdict] || 0) + 1;
    if (typeof r.correctedValue === 'number' && typeof r.proposedValue === 'number') {
      const signed = r.proposedValue - r.correctedValue;
      bucket.signedErrors.push(signed);
      bucket.absErrors.push(Math.abs(signed));
    }
  }

  // Build summary list
  const summary = Object.entries(byField).map(([field, data]) => {
    const meanSigned = data.signedErrors.length ? (data.signedErrors.reduce((a,b)=>a+b,0)/data.signedErrors.length) : null;
    const meanAbs = data.absErrors.length ? (data.absErrors.reduce((a,b)=>a+b,0)/data.absErrors.length) : null;
    const suggestedOffset = meanSigned !== null ? -Math.round(meanSigned * 10) / 10 : null; // suggest subtracting meanSigned

    return {
      field,
      samples: data.samples,
      accurate: data.accurate || 0,
      too_high: data.too_high || 0,
      too_low: data.too_low || 0,
      wrong_type: data.wrong_type || 0,
      meanSignedError: meanSigned,
      meanAbsoluteError: meanAbs,
      suggestedOffset,
      enoughSamples: data.samples >= MIN_CALIBRATION_SAMPLES,
    };
  });

  return summary;
}

export default {
  FIELD_CALIBRATION,
  getCalibrationRule,
  applyCalibrationToProposal,
  recordCalibrationFeedback,
  summarizeCalibration,
  MIN_CALIBRATION_SAMPLES,
};
