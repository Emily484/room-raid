// Pure calibration helpers for Phase 7C
// Stores feedback in localStorage under a dedicated key.

const STORAGE_KEY = 'roomRaidCalibration';
const RULES_KEY = 'roomRaidCalibrationRules';

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

// Freeze defaults to prevent accidental mutation of canonical rules.
try {
  Object.keys(FIELD_CALIBRATION).forEach(k => {
    const r = FIELD_CALIBRATION[k];
    if (r && typeof r === 'object') Object.freeze(r);
  });
  Object.freeze(FIELD_CALIBRATION);
} catch (e) {
  // ignore in environments that don't support freezing
}

function loadAll() {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // DEBUG: report loaded records summary (safe fields only)
    try {
      const safePreview = parsed.map(r => ({ field: r && r.field ? r.field : null, analysisId: r && r.analysisId ? r.analysisId : null, id: r && r.id ? r.id : null, createdAt: r && r.createdAt ? r.createdAt : null }));
      console.info('[diagnostic] loadAll loaded count', safePreview.length);
      // Print up to 20 records to avoid verbosity
      console.info('[diagnostic] loadAll preview', safePreview.slice(0, 20));
    } catch (e) {}

    // Migration/deduplication: collapse records that share the same field + analysisId
    // (only when analysisId is present). Keep the most recently created record.
    const dedupMap = new Map();
    const others = [];
    for (const r of parsed) {
      if (r && r.field && r.analysisId) {
        const key = `${r.field}::${r.analysisId}`;
        const existing = dedupMap.get(key);
        if (!existing) {
          dedupMap.set(key, r);
        } else {
          // keep the most recent createdAt
          try {
            const a = Date.parse(existing.createdAt || '');
            const b = Date.parse(r.createdAt || '');
            if (!Number.isFinite(a) || a < b) dedupMap.set(key, r);
          } catch (e) {
            // fallback: prefer the later one by string compare
            if ((existing.createdAt || '') < (r.createdAt || '')) dedupMap.set(key, r);
          }
        }
      } else {
        // records without analysisId are preserved as-is
        others.push(r);
      }
    }

    // Combine deduped records and other records. Order isn't critical; place deduped first
    const deduped = Array.from(dedupMap.values()).concat(others);
    try {
      console.info('[diagnostic] loadAll deduped count', deduped.length);
      const keys = Array.from(dedupMap.keys()).slice(0, 20);
      console.info('[diagnostic] loadAll dedup keys', keys);
    } catch (e) {}
    return deduped;
  } catch (e) {
    console.error('Could not load calibration records:', e);
    return [];
  }
}

function saveAll(records) {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Could not save calibration records:', e);
  }
}

function loadRulesRaw() {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return {};
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Could not load calibration rules:', e);
    return {};
  }
}

function saveRulesRaw(obj) {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return;
    localStorage.setItem(RULES_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Could not save calibration rules:', e);
  }
}

export function loadCalibrationRules() {
  return loadRulesRaw();
}

function isValidRuleShape(rule) {
  if (!rule || typeof rule !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(rule, 'multiplier')) return false;
  if (!Object.prototype.hasOwnProperty.call(rule, 'offset')) return false;
  if (typeof rule.multiplier !== 'number' || !Number.isFinite(rule.multiplier)) return false;
  if (typeof rule.offset !== 'number' || !Number.isFinite(rule.offset)) return false;
  return true;
}

export function saveCalibrationRule(field, rule) {
  if (!FIELD_CALIBRATION[field]) throw new Error('Unknown field');
  if (!isValidRuleShape(rule)) throw new Error('Invalid rule');

  const raw = loadRulesRaw();
  raw[field] = { multiplier: rule.multiplier, offset: rule.offset };
  saveRulesRaw(raw);
  return raw[field];
}

export function clearCalibrationRule(field) {
  const raw = loadRulesRaw();
  if (Object.prototype.hasOwnProperty.call(raw, field)) {
    delete raw[field];
    saveRulesRaw(raw);
  }
}

export function getEffectiveCalibrationRule(field) {
  const base = FIELD_CALIBRATION[field];
  if (!base) return null;
  const overrides = loadRulesRaw();
  const override = overrides[field];
  if (!override) return { ...base };
  // Validate override; if invalid, ignore and fall back to base
  if (!isValidRuleShape(override)) return { ...base };
  return { ...base, multiplier: override.multiplier, offset: override.offset };
}

export function getCalibrationRule(field) {
  // Deprecated: returns default only. Use getEffectiveCalibrationRule when you want persistence-aware rule.
  return FIELD_CALIBRATION[field] ?? null;
}

export function applyCalibrationToProposal(proposal) {
  // proposal is the object produced by reconciliation.generateProposalForObservation
  // we must not mutate proposal.input fields; return a shallow copy with rawProposedValue and proposedValue
  if (!proposal) return proposal;

  const raw = proposal.proposedValue === undefined ? null : proposal.proposedValue;
  const field = proposal.field;

  const cfg = getEffectiveCalibrationRule(field);
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

  // If analysisId is present, ensure only one record per field+analysisId.
  if (rec.analysisId) {
    let replaced = false;
    const updated = all.map(existing => {
      if (existing && existing.field === rec.field && existing.analysisId === rec.analysisId) {
        replaced = true;
        return rec; // replace
      }
      return existing;
    });
    if (!replaced) updated.push(rec);
    saveAll(updated);
    return rec;
  }

  // For records without analysisId, append as before
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
