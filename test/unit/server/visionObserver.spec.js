import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// We'll mock the openai module used by the implementation
let capturedArgs = null;
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      responses: {
        parse: vi.fn().mockImplementation((args) => {
          capturedArgs = args;
          return Promise.resolve({ output_parsed: { version: 1, summary: 'ok', coverage: { bedroomOverview: null, floor: null, surfaces: null, bathroom: null }, observations: [], warnings: [] } });
        })
      }
    }))
  };
});

import { createRealVisionObserver, ConfigError } from '../../../server/services/visionObserver.js';
import { SchemaError } from '../../../server/services/visionObserver.js';

function mkTempImage(dir, filename, contents = 'x') {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, filename);
  fs.writeFileSync(p, contents);
  return p;
}

describe('createRealVisionObserver (unit)', () => {
  const tmp = path.join(process.cwd(), 'tmp-vision-test');
  beforeEach(() => {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    fs.mkdirSync(tmp, { recursive: true });
  });

  it('throws when API key missing', () => {
    expect(() => createRealVisionObserver({})).toThrow(ConfigError);
  });

  it('constructs requests including images and provenance', async () => {
    const fakeKey = 'sk-test';
    const observer = createRealVisionObserver({ apiKey: fakeKey, model: 'mock-model' });

    const imgPath = mkTempImage(tmp, 'a.jpg', 'abc');
    const scan = { id: 'scan-1' };
    const imageFiles = [{ slotId: 'floor', image: { id: 'img-1', storedFileName: 'a.jpg', mimeType: 'image/jpeg' }, path: imgPath }];

  const res = await observer.analyzeScan({ scan, imageFiles });
  expect(res).toBeTruthy();
  expect(res.model).toBe('mock-model');
  expect(res.observation).toBeTruthy();
  expect(res.observation.version).toBe(1);

  // verify the request shape sent to the OpenAI SDK
  expect(capturedArgs).toBeTruthy();
  // top-level input should be an array with one user message
  expect(Array.isArray(capturedArgs.input)).toBe(true);
  const userMsg = capturedArgs.input[0];
  expect(userMsg.role).toBe('user');
  expect(Array.isArray(userMsg.content)).toBe(true);

  // ensure there's at least one input_text (instructions) and one input_image (the uploaded image)
  const types = userMsg.content.map(c => c.type);
  expect(types).toContain('input_text');
  expect(types).toContain('input_image');

  // provenance should include the image id and slot
  const prov = userMsg.content.find(c => c.type === 'input_text' && c.text && c.text.includes('Image ID:'));
  expect(prov).toBeTruthy();
  expect(prov.text).toContain('img-1');
  expect(prov.text).toContain('floor');
  });

  it('throws SchemaError when response lacks output_parsed', async () => {
    // remock to return no output_parsed
    const openai = await import('openai');
    openai.default.mockImplementation(() => ({ responses: { parse: vi.fn().mockResolvedValue({}) } }));

    const observer = createRealVisionObserver({ apiKey: 'sk-test', model: 'mock-model' });
    const imgPath = mkTempImage(tmp, 'b.jpg', 'x');
    const scan = { id: 'scan-2' };
    const imageFiles = [{ slotId: 'floor', image: { id: 'img-2', storedFileName: 'b.jpg', mimeType: 'image/jpeg' }, path: imgPath }];

    await expect(observer.analyzeScan({ scan, imageFiles })).rejects.toThrow(SchemaError);
  });

  it('throws SchemaError when parsed output fails validation', async () => {
    // remock to return invalid output_parsed
    const openai = await import('openai');
    openai.default.mockImplementation(() => ({ responses: { parse: vi.fn().mockResolvedValue({ output_parsed: { invalid: true } }) } }));

    const observer = createRealVisionObserver({ apiKey: 'sk-test', model: 'mock-model' });
    const imgPath = mkTempImage(tmp, 'c.jpg', 'x');
    const scan = { id: 'scan-3' };
    const imageFiles = [{ slotId: 'floor', image: { id: 'img-3', storedFileName: 'c.jpg', mimeType: 'image/jpeg' }, path: imgPath }];

    await expect(observer.analyzeScan({ scan, imageFiles })).rejects.toThrow(SchemaError);
  });
});
