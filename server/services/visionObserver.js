import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { validateObservation, validateObservationDetailed, OBSERVATION_SCHEMA_VERSION, OBSERVATION_SCHEMA } from './visionObservationSchema.js';

// Custom errors for configuration/provider/schema
export class ConfigError extends Error {}
export class ProviderError extends Error {}
export class SchemaError extends Error {}

// Build a compact system + developer instruction string used for all calls
export const OBSERVER_INSTRUCTIONS = `You are an automated observer for the Room Raid application.\n\n` +
  `Rules:\n` +
  `- Report only structured observations about visible physical evidence relevant to room-state.\n` +
  `- Do NOT provide chain-of-thought, recommendations, or modify room state.\n` +
  `- Use only the supplied image IDs when referencing evidence.\n` +
  `- Avoid double-counting objects that appear across multiple images; when ambiguous, give ranges.\n` +
  `- If an area is not shown, respond with 'not_visible' for coverage.\n` +
  `- Distinguish 'none_observed' vs 'not_visible' vs 'unknown'.\n` +
  `- Prefer ranges and confidence rather than false precision.\n\n` +
  `FIELD RULES:\n` +
  `- Every observation.field MUST use exactly one of the supplied canonical Room Raid field names.\n` +
  `- Never invent, rename, snake_case, combine, or generalize fields. Use the canonical names exactly.\n\n` +
  `Mappings (use these to choose the correct canonical field):\n` +
  `- visible clothing specifically on floor -> clothingOnFloor\n` +
  `- loose clothing visible anywhere -> looseClothing\n` +
  `- visible cardboard -> cardboard\n` +
  `- loose bags/packages/wrapping -> loosePackaging\n` +
  `- miscellaneous objects specifically on floor -> miscellaneousFloorItems\n` +
  `- percentage of floor physically blocked -> floorObstruction\n` +
  `- clutter on tables/dressers/work surfaces -> surfaceClutter\n` +
  `- objects occupying beds -> bedClutter\n` +
  `- objects occupying seating/lounge areas -> loungeClutter\n` +
  `- bathroom counter obstruction -> bathroomCounterClutter\n\n` +
  `WHAT TO DO WITH BROADER OBSERVATIONS:\n` +
  `- Broader qualitative conclusions (for example 'overall room clutter') belong in the observation.summary field, NOT as observation.field values.\n` +
  `- Limitations and uncertainty belong in observation.warnings.\n` +
  `- If a broader concept maps to canonical fields, report those fields with appropriate status (observed/none_observed/unknown/not_visible) and include supporting reason/evidence.\n\n` +
  `Return output in the exact JSON schema provided via the json_schema response format.`;

// Helper to read a file and return data URI
function fileToDataUri(filePath, mimeType) {
  const buf = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

export function createRealVisionObserver({ apiKey, model } = {}) {
  if (!apiKey) throw new ConfigError('missing API key');

  const client = new OpenAI({ apiKey });
  const modelName = model || process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini-vision';

  async function analyzeScan({ scan, imageFiles }) {
    // imageFiles: [{ slotId, image, path }]
    if (!Array.isArray(imageFiles)) imageFiles = [];

    // Build input entries: a single user message containing text parts and image attachments
    const attachments = [];
    const provenanceNotes = [];

    for (const f of imageFiles) {
      const img = f.image;
      if (!img || !img.storedFileName) continue;
      if (!f.path) throw new ProviderError('image path missing');
      const dataUri = fileToDataUri(f.path, img.mimeType || 'image/jpeg');
      // the Responses API accepts content items of type 'input_image'
      attachments.push({ type: 'input_image', image_url: dataUri, });
      provenanceNotes.push(`Image ${img.id} (slot: ${f.slotId})`);
    }

    // Create a single user message with text content items (type: 'input_text') and per-image provenance + image attachments
    const messageContent = [];
    // instructions first
    messageContent.push({ type: 'input_text', text: OBSERVER_INSTRUCTIONS });
    // scan id
    messageContent.push({ type: 'input_text', text: `Scan ID: ${scan.id}` });

    // For each image, add a provenance text item followed by the input_image item
    for (const f of imageFiles) {
      const img = f.image;
      if (!img || !img.storedFileName) continue;
      // provenance
      messageContent.push({ type: 'input_text', text: `Image ID: ${img.id}\nSlot: ${f.slotId}` });
      // the image attachment
      messageContent.push({ type: 'input_image', image_url: fileToDataUri(f.path, img.mimeType || 'image/jpeg'), });
    }

    const inputMessage = { role: 'user', content: messageContent };

    try {
      // Use the SDK's structured output parsing entrypoint (responses.parse)
      const resp = await client.responses.parse({
        model: modelName,
        input: [inputMessage],
        text: {
          format: {
            type: 'json_schema',
            name: 'room_raid_observation',
            strict: true,
            schema: OBSERVATION_SCHEMA
          }
        }
      });

      const parsed = resp && resp.output_parsed ? resp.output_parsed : null;

      if (!parsed) throw new SchemaError('missing structured output from provider');

      const validation = validateObservationDetailed ? validateObservationDetailed(parsed, scan) : { valid: validateObservation(parsed, scan), errors: [] };
      if (!validation.valid) {
        if (process.env.NODE_ENV !== 'production') {
          // safe diagnostics: do not log secrets or binary data
          // Log the errors and a shallow representation of the parsed object
          // (avoid printing large base64 image data).
          try {
            console.error('Vision observation validation failed:', validation.errors);
            // shallow copy without big fields: remove any fields named 'image' or values that look like data: URIs
            const scrub = JSON.parse(JSON.stringify(parsed, (k, v) => {
              if (typeof v === 'string' && v.startsWith('data:')) return '[DATA_URI]';
              if (k === 'image' || k === 'image_url' || k === 'storedFileName') return '[REDACTED]';
              return v;
            }));
            console.dir(scrub, { depth: null });
          } catch (e) {
            // ignore logging errors
          }
        }
        throw new SchemaError('provider returned invalid observation');
      }

      return { model: modelName, observation: parsed };
    } catch (err) {
      // classify errors
      if (err instanceof SchemaError) throw err;
      // Map OpenAI errors to ProviderError
      throw new ProviderError(err.message || 'provider error');
    }
  }

  return { analyzeScan, model: modelName };
}

// Export a mock observer for tests/demo.
export function createMockVisionObserver({ fakeResponse } = {}) {
  async function analyzeScan({ scan, imageFiles }) {
    const first = imageFiles && imageFiles[0];
    const obs = fakeResponse || {
      version: OBSERVATION_SCHEMA_VERSION,
      summary: 'Mock analysis',
      coverage: {},
      observations: [
        {
          field: 'clothingOnFloor',
          status: 'observed',
          severity: 'moderate',
          estimatedRange: { min: 3, max: 7 },
          percentEstimate: null,
          confidence: 0.8,
          evidence: first ? [{ slotId: first.slotId, imageId: first.image.id }] : [],
          reason: 'Mock: visible clothing in floor images.'
        }
      ],
      warnings: []
    };

    if (!validateObservation(obs)) {
      throw new SchemaError('mock returned invalid observation');
    }

    return { model: 'mock', observation: obs };
  }

  return { analyzeScan, model: 'mock' };
}
