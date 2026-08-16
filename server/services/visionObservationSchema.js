// Canonical JSON schema-ish validator for Room Raid observation objects.
// This is a lightweight runtime validator (no external deps) focused on
// structure and types rather than full JSON Schema conformance.

// Allowed observable fields (canonical list)
export const ALLOWED_FIELDS = new Set([
  'clothingOnFloor',
  'looseClothing',
  'cleanClothesOut',
  'cardboard',
  'loosePackaging',
  'floorTrash',
  'miscellaneousFloorItems',
  'floorObstruction',
  'floorCleanliness',
  'tableTrash',
  'surfaceClutter',
  'surfaceCleanliness',
  'bedClutter',
  'bedMade',
  'loungeClutter',
  'shelfDisorganization',
  'bathroomCounterClutter',
  'sinkCleanliness',
  'mirrorDirty',
  'tubClutter',
  'tubCleanliness'
]);

export const OBSERVATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "version",
    "summary",
    "coverage",
    "observations",
    "warnings"
  ],
  properties: {
    version: {
      type: "number"
    },

    summary: {
      type: "string"
    },

    coverage: {
      type: "object",
      additionalProperties: false,
      required: ["bedroomOverview","floor","surfaces","bathroom"],
      properties: {
        bedroomOverview: { anyOf: [{ type: 'string', enum: ['observed','none_observed','unknown','not_visible'] }, { type: 'null' }] },
        floor: { anyOf: [{ type: 'string', enum: ['observed','none_observed','unknown','not_visible'] }, { type: 'null' }] },
        surfaces: { anyOf: [{ type: 'string', enum: ['observed','none_observed','unknown','not_visible'] }, { type: 'null' }] },
        bathroom: { anyOf: [{ type: 'string', enum: ['observed','none_observed','unknown','not_visible'] }, { type: 'null' }] }
      }
    },

    observations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "field",
          "status",
          "severity",
          "estimatedRange",
          "percentEstimate",
          "confidence",
          "evidence",
          "reason"
        ],
        properties: {
          field: {
            type: "string",
            enum: Array.from(ALLOWED_FIELDS)
          },

          status: {
            type: "string",
            enum: [
              "observed",
              "none_observed",
              "unknown",
              "not_visible"
            ]
          },

          severity: {
            type: ["string", "null"],
            enum: [
              "none",
              "low",
              "moderate",
              "high",
              "very_high",
              null
            ]
          },

          estimatedRange: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["min", "max"],
                properties: {
                  min: { type: "number" },
                  max: { type: "number" }
                }
              },
              { type: "null" }
            ]
          },

          percentEstimate: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["min", "max"],
                properties: {
                  min: { type: "number" },
                  max: { type: "number" }
                }
              },
              { type: "null" }
            ]
          },

          confidence: {
            type: "number"
          },

          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["slotId", "imageId"],
              properties: {
                slotId: { type: "string" },
                imageId: { type: "string" }
              }
            }
          },

          reason: {
            type: "string"
          }
        }
      }
    },

    warnings: {
      type: "array",
      items: {
        type: "string"
      }
    }
  }
};

// Numeric schema version used in observations
export const OBSERVATION_SCHEMA_VERSION = 1;

// (ALLOWED_FIELDS is declared earlier in this module and intentionally only once)

const ALLOWED_STATUS = new Set(['observed','none_observed','unknown','not_visible']);
const ALLOWED_SEVERITY = new Set(['none','low','moderate','high','very_high', null]);

// Validate an observation object. If `scan` is provided, also validate that
// every evidence entry references an existing image in the scan and correct slot.
// Detailed validator that returns error diagnostics
export function validateObservationDetailed(obj, scan = null) {
  const errors = [];
  const push = (path, msg) => errors.push({ path, message: msg });

  if (!obj || typeof obj !== 'object') {
    push('/', 'observation must be an object');
    return { valid: false, errors };
  }

  if (obj.version !== OBSERVATION_SCHEMA_VERSION) push('/version', `expected version ${OBSERVATION_SCHEMA_VERSION}`);

  if (typeof obj.summary !== 'string') push('/summary', 'summary must be a string');

  if (!obj.coverage || typeof obj.coverage !== 'object') {
    push('/coverage', 'coverage must be an object');
  } else {
    // coverage keys are explicit in the schema
    const covKeys = ['bedroomOverview','floor','surfaces','bathroom'];
    for (const k of covKeys) {
      const v = obj.coverage[k];
      if (v !== null && !ALLOWED_STATUS.has(v)) push(`/coverage.${k}`, `invalid coverage value: ${String(v)}`);
    }
  }

  if (!Array.isArray(obj.observations)) {
    push('/observations', 'observations must be an array');
  } else {
    obj.observations.forEach((o, i) => {
      const base = `/observations[${i}]`;
      if (!o || typeof o !== 'object') { push(base, 'observation entry must be an object'); return; }

      if (typeof o.field !== 'string') push(`${base}.field`, 'field must be a string');
      else if (!ALLOWED_FIELDS.has(o.field)) push(`${base}.field`, `unknown field '${o.field}'`);

      if (!ALLOWED_STATUS.has(o.status)) push(`${base}.status`, `invalid status '${o.status}'`);
      if (!ALLOWED_SEVERITY.has(o.severity)) push(`${base}.severity`, `invalid severity '${o.severity}'`);

      // estimatedRange
      if (o.estimatedRange !== null) {
        if (typeof o.estimatedRange !== 'object') push(`${base}.estimatedRange`, 'estimatedRange must be object or null');
        else {
          const { min, max } = o.estimatedRange;
          if (typeof min !== 'number') push(`${base}.estimatedRange.min`, 'min must be a number');
          if (typeof max !== 'number') push(`${base}.estimatedRange.max`, 'max must be a number');
          if (typeof min === 'number' && min < 0) push(`${base}.estimatedRange.min`, 'min must be >= 0');
          if (typeof max === 'number' && typeof min === 'number' && max < min) push(`${base}.estimatedRange.max`, 'max must be >= min');
        }
      }

      // percentEstimate
      if (o.percentEstimate !== null) {
        if (typeof o.percentEstimate !== 'object') push(`${base}.percentEstimate`, 'percentEstimate must be object or null');
        else {
          const { min, max } = o.percentEstimate;
          if (typeof min !== 'number') push(`${base}.percentEstimate.min`, 'min must be a number');
          if (typeof max !== 'number') push(`${base}.percentEstimate.max`, 'max must be a number');
          if (typeof min === 'number' && min < 0) push(`${base}.percentEstimate.min`, 'min must be >= 0');
          if (typeof max === 'number' && typeof min === 'number' && max < min) push(`${base}.percentEstimate.max`, 'max must be >= min');
          if (typeof max === 'number' && max > 100) push(`${base}.percentEstimate.max`, 'max must be <= 100');
        }
      }

      if (typeof o.confidence !== 'number' || Number.isNaN(o.confidence) || o.confidence < 0 || o.confidence > 1) push(`${base}.confidence`, 'confidence must be number between 0 and 1');

      if (!Array.isArray(o.evidence)) push(`${base}.evidence`, 'evidence must be an array');
      else {
        o.evidence.forEach((e, j) => {
          const ep = `${base}.evidence[${j}]`;
          if (!e || typeof e !== 'object') { push(ep, 'evidence item must be object'); return; }
          if (typeof e.slotId !== 'string') push(`${ep}.slotId`, 'slotId must be a string');
          if (typeof e.imageId !== 'string') push(`${ep}.imageId`, 'imageId must be a string');
          if (scan) {
            const slot = scan.slots && scan.slots[e.slotId];
            if (!slot) push(`${ep}.slotId`, `slot '${e.slotId}' not found in scan`);
            else {
              const found = slot.find(img => img.id === e.imageId);
              if (!found) push(`${ep}.imageId`, `imageId '${e.imageId}' not found in slot '${e.slotId}'`);
            }
          }
        });
      }

      if (typeof o.reason !== 'string') push(`${base}.reason`, 'reason must be a string');

      // status semantics
      if (o.status === 'not_visible') {
        if (o.estimatedRange !== null) push(`${base}.estimatedRange`, 'not_visible should not have estimatedRange');
        if (o.percentEstimate !== null) push(`${base}.percentEstimate`, 'not_visible should not have percentEstimate');
      }
      if (o.status === 'unknown') {
        if (o.estimatedRange !== null) push(`${base}.estimatedRange`, 'unknown should not have estimatedRange');
        if (o.percentEstimate !== null) push(`${base}.percentEstimate`, 'unknown should not have percentEstimate');
      }
      if (o.status === 'none_observed') {
        if (o.severity !== null && o.severity !== 'none') push(`${base}.severity`, 'none_observed must have severity null or "none"');
        if (o.estimatedRange !== null) {
          const { min, max } = o.estimatedRange || {};
          if (min !== 0 || max !== 0) push(`${base}.estimatedRange`, 'none_observed estimatedRange must be {min:0,max:0}');
        }
      }
      if (o.status === 'observed') {
        if ((!o.evidence || o.evidence.length === 0) && (!o.reason || o.reason.length === 0)) push(base, 'observed should have at least evidence or reason');
      }
    });
  }

  if (!Array.isArray(obj.warnings)) push('/warnings', 'warnings must be an array');

  return { valid: errors.length === 0, errors };
}

// Backwards-compatible boolean wrapper
export function validateObservation(obj, scan = null) {
  const res = validateObservationDetailed(obj, scan);
  return res.valid;
}

export default { validateObservation };
