import { getEstimated, ensureField, setEstimated, observeField } from './roomFields.js';

// Configurable thresholds
export const RECONCILIATION_CONFIG = {
  highConfidence: 0.85,
  mediumConfidence: 0.65,
  autoSuggestMinimum: 0.60,
  smallDifference: 0.05, // relative fraction
  moderateDifference: 0.20,
};

function midpoint(min, max) {
  return (min + max) / 2;
}

function roundConsistently(v) {
  // Use one decimal place for now to avoid aggressive rounding
  return Math.round(v * 10) / 10;
}

function classifyDisagreement(absDelta, relDelta, cfg) {
  if (relDelta <= cfg.smallDifference) return 'close_match';
  if (relDelta <= cfg.moderateDifference) return 'meaningful_difference';
  return 'strong_disagreement';
}

// Generate proposals for a single observation
export function generateProposalForObservation({ roomState, observation, currentValue, config = RECONCILIATION_CONFIG }) {
  const field = observation.field;

  // Handle unknown / not_visible
  if (observation.status === 'unknown' || observation.status === 'not_visible') {
    return {
      field,
      recommendation: 'no_change',
      reason: 'Vision could not reliably observe this field.',
      observation: { ...observation },
      proposedValue: null,
    };
  }

  // If percentEstimate exists and field appears percent-like
  const percentLike = ['floorObstruction', 'surfaceClutter'];
  const countLike = [
    'clothingOnFloor','looseClothing','cardboard','loosePackaging','floorTrash','miscellaneousFloorItems','tableTrash','bedClutter','loungeClutter','tubClutter'
  ];

  // none_observed handling
  if (observation.status === 'none_observed') {
    // Decide if zero is meaningful: for count-like fields, zero may be meaningful
    if (countLike.includes(field)) {
      const conf = observation.confidence ?? 0;
      if (conf >= config.autoSuggestMinimum) {
        return {
          field,
          currentValue,
          observation: { ...observation },
          proposedValue: 0,
          delta: (0 - (currentValue ?? 0)),
          confidence: conf,
          source: 'vision',
          rationale: 'Vision reported none observed; proposing zero given sufficient confidence.',
          evidence: observation.evidence || [],
          recommendation: conf >= config.mediumConfidence ? 'review' : 'manual_review'
        };
      }
    }

    return {
      field,
      recommendation: 'manual_review',
      reason: 'None observed but no confident numeric mapping available.',
      observation: { ...observation },
      proposedValue: null,
    };
  }

  // If estimatedRange provided -> count-like midpoint
  if (observation.estimatedRange && typeof observation.estimatedRange.min === 'number' && typeof observation.estimatedRange.max === 'number') {
    const mid = midpoint(observation.estimatedRange.min, observation.estimatedRange.max);
    const proposed = roundConsistently(mid);
    const curr = typeof currentValue === 'number' ? currentValue : getEstimated(roomState, field);
    const absDelta = Math.abs(proposed - curr);
    const relDelta = curr === 0 ? (absDelta > 0 ? 1 : 0) : Math.abs(absDelta / curr);
    const classification = classifyDisagreement(absDelta, relDelta, config);

    const conf = typeof observation.confidence === 'number' ? observation.confidence : 0;

    // Confidence gating
    if (conf < config.autoSuggestMinimum) {
      return {
        field,
        recommendation: 'manual_review',
        reason: 'Low confidence; no automatic numeric proposal.',
        observation: { ...observation },
        proposedValue: null,
      };
    }

    return {
      field,
      currentValue: curr,
      observation: { ...observation },
      proposedValue: proposed,
      delta: proposed - curr,
      absoluteDelta: absDelta,
      relativeDeltaPercent: Math.round(relDelta * 1000) / 10,
      confidence: conf,
      source: 'vision',
      rationale: `Vision estimated ${observation.estimatedRange.min}–${observation.estimatedRange.max}; midpoint ${mid}.`,
      evidence: observation.evidence || [],
      recommendation: conf >= config.highConfidence ? 'strong_recommendation' : (conf >= config.mediumConfidence ? 'review' : 'manual_review'),
      disagreement: classification,
    };
  }

  // If percentEstimate provided and percent-like
  if (observation.percentEstimate && percentLike.includes(field)) {
    const mid = midpoint(observation.percentEstimate.min, observation.percentEstimate.max);
    const clamped = Math.max(0, Math.min(100, mid));
    const proposed = roundConsistently(clamped);
    const curr = typeof currentValue === 'number' ? currentValue : getEstimated(roomState, field);
    const absDelta = Math.abs(proposed - curr);
    const relDelta = curr === 0 ? (absDelta > 0 ? 1 : 0) : Math.abs(absDelta / curr);
    const classification = classifyDisagreement(absDelta, relDelta, config);

    const conf = typeof observation.confidence === 'number' ? observation.confidence : 0;
    if (conf < config.autoSuggestMinimum) {
      return {
        field,
        recommendation: 'manual_review',
        reason: 'Low confidence; no automatic numeric proposal.',
        observation: { ...observation },
        proposedValue: null,
      };
    }

    return {
      field,
      currentValue: curr,
      observation: { ...observation },
      proposedValue: proposed,
      delta: proposed - curr,
      absoluteDelta: absDelta,
      relativeDeltaPercent: Math.round(relDelta * 1000) / 10,
      confidence: conf,
      source: 'vision',
      rationale: `Vision percent estimate ${observation.percentEstimate.min}–${observation.percentEstimate.max}; midpoint ${mid}.`,
      evidence: observation.evidence || [],
      recommendation: conf >= config.highConfidence ? 'strong_recommendation' : (conf >= config.mediumConfidence ? 'review' : 'manual_review'),
      disagreement: classification,
    };
  }

  // Qualitative/severity-only observations -> no automatic numeric proposal
  return {
    field,
    recommendation: 'manual_review',
    reason: 'Qualitative observation only; no numeric proposal generated.',
    observation: { ...observation },
    proposedValue: null,
  };
}

// Generate proposals for an analysis (collection of observations)
export function generateProposals({ roomState, analysis, config = RECONCILIATION_CONFIG }) {
  if (!analysis || !analysis.observation || !Array.isArray(analysis.observation.observations)) return [];

  const proposals = analysis.observation.observations.map(obs => {
    const curr = getEstimated(roomState, obs.field);
    return generateProposalForObservation({ roomState, observation: obs, currentValue: curr, config });
  });

  return proposals;
}

// Approval helpers
export function approveProposal(roomState, proposal, analysisCreatedAt = new Date().toISOString()) {
  if (!proposal || typeof proposal.field !== 'string') return roomState;
  if (proposal.proposedValue === null || typeof proposal.proposedValue !== 'number') return roomState;

  // Use observeField to create a proper observed/estimated/confidence/lastObservedAt update
  const next = observeField(roomState, proposal.field, proposal.proposedValue, analysisCreatedAt);
  // Copy confidence from proposal if provided
  if (typeof proposal.confidence === 'number') {
    next[proposal.field] = { ...next[proposal.field], confidence: proposal.confidence };
  }

  return next;
}

export function rejectProposal(roomState, proposal) {
  // No-op; rejecting does not mutate state
  return roomState;
}

// Batch approval (returns new roomState and list of applied fields)
export function approveAllHighConfidence(roomState, proposals, config = RECONCILIATION_CONFIG, analysisCreatedAt = new Date().toISOString()) {
  let next = { ...roomState };
  const applied = [];
  for (const p of proposals) {
    if (p && typeof p.proposedValue === 'number' && (p.confidence ?? 0) >= config.highConfidence) {
      next = approveProposal(next, p, analysisCreatedAt);
      applied.push(p.field);
    }
  }
  return { next, applied };
}

export default {
  generateProposals,
  generateProposalForObservation,
  approveProposal,
  rejectProposal,
  approveAllHighConfidence,
};
