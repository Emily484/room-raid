import { describe, it, expect } from 'vitest';
import { OBSERVATION_SCHEMA } from '../../../server/services/visionObservationSchema.js';

// Recursively walk schema and call visitor(node, path)
function walkSchema(node, visitor, path = '') {
  if (!node || typeof node !== 'object') return;
  visitor(node, path || '/');

  if (node.properties && typeof node.properties === 'object') {
    for (const [k, child] of Object.entries(node.properties)) walkSchema(child, visitor, `${path}/properties/${k}`);
  }
  if (node.items) walkSchema(node.items, visitor, `${path}/items`);
  if (node.anyOf && Array.isArray(node.anyOf)) for (let i = 0; i < node.anyOf.length; i++) walkSchema(node.anyOf[i], visitor, `${path}/anyOf/${i}`);
  if (node.allOf && Array.isArray(node.allOf)) for (let i = 0; i < node.allOf.length; i++) walkSchema(node.allOf[i], visitor, `${path}/allOf/${i}`);
  if (node.oneOf && Array.isArray(node.oneOf)) for (let i = 0; i < node.oneOf.length; i++) walkSchema(node.oneOf[i], visitor, `${path}/oneOf/${i}`);
  if (node.patternProperties && typeof node.patternProperties === 'object') for (const [k, child] of Object.entries(node.patternProperties)) walkSchema(child, visitor, `${path}/patternProperties/${k}`);
  if (node.additionalProperties && typeof node.additionalProperties === 'object') walkSchema(node.additionalProperties, visitor, `${path}/additionalProperties`);
}

describe('OBSERVATION_SCHEMA structural strictness', () => {
  it('ensures object schemas with properties have required matching properties and additionalProperties:false', () => {
    const failures = [];
    walkSchema(OBSERVATION_SCHEMA, (node, path) => {
      if (node.type === 'object' && node.properties && typeof node.properties === 'object') {
        const propKeys = Object.keys(node.properties).sort();
        const req = Array.isArray(node.required) ? node.required.slice().sort() : null;
        const ap = node.additionalProperties;

        if (ap !== false) failures.push({ path, reason: 'additionalProperties !== false' });

        if (!Array.isArray(node.required)) {
          failures.push({ path, reason: 'required is missing' });
        } else {
          // required must exactly match property keys
          const propStr = JSON.stringify(propKeys);
          const reqStr = JSON.stringify(req);
          if (propStr !== reqStr) failures.push({ path, reason: `required keys mismatch: properties=${propStr} required=${reqStr}` });
        }
      }
    });

    if (failures.length) {
      const msgs = failures.map(f => `${f.path}: ${f.reason}`).join('\n');
      throw new Error(`Schema strictness violations:\n${msgs}`);
    }
  });
});
