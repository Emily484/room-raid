import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../../../server/app.js';

function mktemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'room-raid-test-'));
}

function tinyJpegBuffer() {
  return Buffer.from([0xFF,0xD8,0xFF,0xD9]);
}

describe('Scans Analyze API (integration)', () => {
  let tmpRoot;
  let uploadsDir;
  let dataDir;
  let app;

  beforeEach(() => {
    tmpRoot = mktemp();
    uploadsDir = path.join(tmpRoot, 'uploads');
    dataDir = path.join(tmpRoot, 'data');
  });

  afterEach(() => {
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}
  });

  it('POST analyze persists analysis when observer returns valid result', async () => {
    // create a mock observer that returns a valid observation
    const mockObserver = {
      model: 'mock-v1',
      async analyzeScan({ scan, imageFiles }) {
        return {
          model: 'mock-v1',
          observation: {
            version: 1,
            summary: 'ok',
            coverage: { floor: 'observed', bedroomOverview: 'not_visible', surfaces: 'unknown', bathroom: 'not_visible' },
            observations: [{ field: 'clothingOnFloor', status: 'observed', severity: 'moderate', estimatedRange: { min: 1, max: 3 }, percentEstimate: null, confidence: 0.9, evidence: [], reason: 'visible clothing' }],
            warnings: []
          }
        };
      }
    };

    app = createApp({ dataDir, uploadsDir, visionObserver: mockObserver });

    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;

    // upload an image so there's something to analyze
    const buf = tinyJpegBuffer();
    const uploadRes = await request(app)
      .post(`/api/scans/${scanId}/images`)
      .field('slotId', 'floor')
      .attach('image', buf, 'a.jpg');
    expect(uploadRes.status).toBe(201);

    const res = await request(app).post(`/api/scans/${scanId}/analyze`);
  expect(res.status).toBe(201);
  expect(res.body.analysis).toBeTruthy();
  const analysis = res.body.analysis;
  expect(analysis.id).toBeTruthy();
  expect(analysis.scanUpdatedAt).toBeTruthy();
  expect(analysis.observation).toBeTruthy();
  expect(analysis.observation.version).toBe(1);

    // scan should now include analyses
    const get = await request(app).get(`/api/scans/${scanId}`);
    expect(get.status).toBe(200);
    expect(Array.isArray(get.body.analyses)).toBe(true);
    expect(get.body.analyses.length).toBe(1);
  });

  it('POST analyze returns error when observer produces invalid result', async () => {
    const badObserver = {
      model: 'bad',
      async analyzeScan() {
        return 'this is not an object';
      }
    };

    app = createApp({ dataDir, uploadsDir, visionObserver: badObserver });

    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;

    const res = await request(app).post(`/api/scans/${scanId}/analyze`);
    expect([500, 502]).toContain(res.status);

    // ensure no analyses persisted
    const get = await request(app).get(`/api/scans/${scanId}`);
    expect(get.status).toBe(200);
    expect(!get.body.analyses || get.body.analyses.length === 0).toBe(true);
  });

  describe('validation and provenance', () => {
    it('rejects unknown observable field', async () => {
      const mockBad = {
        model: 'mock',
        async analyzeScan() {
          return { model: 'mock', observation: { version: 1, summary: 'x', coverage: {}, observations: [{ field: 'notAField', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 0.5, evidence: [], reason: 'x' }], warnings: [] } };
        }
      };

      app = createApp({ dataDir, uploadsDir, visionObserver: mockBad });
      const createRes = await request(app).post('/api/scans');
      const scanId = createRes.body.id;
      const res = await request(app).post(`/api/scans/${scanId}/analyze`);
      expect([502, 500]).toContain(res.status);

      const get = await request(app).get(`/api/scans/${scanId}`);
      expect(!get.body.analyses || get.body.analyses.length === 0).toBe(true);
    });

    it('rejects confidence > 1', async () => {
      const mockBad = {
        model: 'mock',
        async analyzeScan() {
          return { model: 'mock', observation: { version: 1, summary: 'x', coverage: {}, observations: [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 1.5, evidence: [], reason: 'x' }], warnings: [] } };
        }
      };

      app = createApp({ dataDir, uploadsDir, visionObserver: mockBad });
      const scanId = (await request(app).post('/api/scans')).body.id;
      const res = await request(app).post(`/api/scans/${scanId}/analyze`);
      expect([502,500]).toContain(res.status);
    });

    it('rejects negative estimatedRange', async () => {
      const mockBad = {
        model: 'mock',
        async analyzeScan() {
          return { model: 'mock', observation: { version: 1, summary: 'x', coverage: {}, observations: [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: { min: -1, max: 3 }, percentEstimate: null, confidence: 0.5, evidence: [], reason: 'x' }], warnings: [] } };
        }
      };

      app = createApp({ dataDir, uploadsDir, visionObserver: mockBad });
      const scanId = (await request(app).post('/api/scans')).body.id;
      const res = await request(app).post(`/api/scans/${scanId}/analyze`);
      expect([502,500]).toContain(res.status);
    });

    it('rejects estimatedRange max < min', async () => {
      const mockBad = {
        model: 'mock',
        async analyzeScan() {
          return { model: 'mock', observation: { version: 1, summary: 'x', coverage: {}, observations: [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: { min: 5, max: 2 }, percentEstimate: null, confidence: 0.5, evidence: [], reason: 'x' }], warnings: [] } };
        }
      };

      app = createApp({ dataDir, uploadsDir, visionObserver: mockBad });
      const scanId = (await request(app).post('/api/scans')).body.id;
      const res = await request(app).post(`/api/scans/${scanId}/analyze`);
      expect([502,500]).toContain(res.status);
    });

    it('rejects percentEstimate > 100', async () => {
      const mockBad = {
        model: 'mock',
        async analyzeScan() {
          return { model: 'mock', observation: { version: 1, summary: 'x', coverage: {}, observations: [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: { min: 0, max: 120 }, confidence: 0.5, evidence: [], reason: 'x' }], warnings: [] } };
        }
      };

      app = createApp({ dataDir, uploadsDir, visionObserver: mockBad });
      const scanId = (await request(app).post('/api/scans')).body.id;
      const res = await request(app).post(`/api/scans/${scanId}/analyze`);
      expect([502,500]).toContain(res.status);
    });

    it('rejects nonexistent evidence imageId', async () => {
      const mockBad = {
        model: 'mock',
        async analyzeScan() {
          return { model: 'mock', observation: { version: 1, summary: 'x', coverage: {}, observations: [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 0.5, evidence: [{ slotId: 'floor', imageId: 'does-not-exist' }], reason: 'x' }], warnings: [] } };
        }
      };

      app = createApp({ dataDir, uploadsDir, visionObserver: mockBad });
      const createRes = await request(app).post('/api/scans');
      const scanId = createRes.body.id;
      // upload a different image
      const buf = Buffer.from([0xFF,0xD8,0xFF,0xD9]);
      await request(app).post(`/api/scans/${scanId}/images`).field('slotId','floor').attach('image', buf, 'a.jpg');

      const res = await request(app).post(`/api/scans/${scanId}/analyze`);
      expect([502,500]).toContain(res.status);
    });

    it('rejects evidence imageId paired with wrong slot', async () => {
      const mockBad = {
        model: 'mock',
        async analyzeScan() {
          return { model: 'mock', observation: { version: 1, summary: 'x', coverage: {}, observations: [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 0.5, evidence: [{ slotId: 'surfaces', imageId: 'img-wrong' }], reason: 'x' }], warnings: [] } };
        }
      };

      app = createApp({ dataDir, uploadsDir, visionObserver: mockBad });
      const createRes = await request(app).post('/api/scans');
      const scanId = createRes.body.id;
      const buf = Buffer.from([0xFF,0xD8,0xFF,0xD9]);
      const uploadRes = await request(app).post(`/api/scans/${scanId}/images`).field('slotId','floor').attach('image', buf, 'a.jpg');
      const imageId = uploadRes.body.image.id;

      // model references that image but with wrong slot
      mockBad.analyzeScan = async () => ({ model: 'mock', observation: { version:1, summary:'x', coverage:{}, observations:[{ field: 'clothingOnFloor', status:'observed', severity:'low', estimatedRange:null, percentEstimate:null, confidence:0.5, evidence:[{ slotId:'surfaces', imageId }], reason:'x' }], warnings:[] } } );

      app = createApp({ dataDir, uploadsDir, visionObserver: mockBad });
      const res = await request(app).post(`/api/scans/${scanId}/analyze`);
      expect([502,500]).toContain(res.status);
    });

    it('accepts valid provenance and persists', async () => {
      const mockGood = {
        model: 'mock',
        async analyzeScan({ scan }) {
            // reference an actual image from the 'floor' slot which the test uploads to
            const slot = 'floor';
            const img = (scan.slots && scan.slots[slot] && scan.slots[slot][0]);
            return { model: 'mock', observation: { version:1, summary:'ok', coverage:{ bedroomOverview: null, floor: 'observed', surfaces: null, bathroom: null }, observations:[{ field:'clothingOnFloor', status:'observed', severity:'low', estimatedRange:null, percentEstimate:null, confidence:0.6, evidence:[{ slotId: slot, imageId: img.id }], reason:'x' }], warnings:[] } };
          }
      };

      app = createApp({ dataDir, uploadsDir, visionObserver: mockGood });
      const createRes = await request(app).post('/api/scans');
      const scanId = createRes.body.id;
      const buf = Buffer.from([0xFF,0xD8,0xFF,0xD9]);
      await request(app).post(`/api/scans/${scanId}/images`).field('slotId','floor').attach('image', buf, 'a.jpg');

      const res = await request(app).post(`/api/scans/${scanId}/analyze`);
      expect(res.status).toBe(201);
      const get = await request(app).get(`/api/scans/${scanId}`);
      expect(get.body.analyses && get.body.analyses.length === 1).toBe(true);
    });
  });

});
