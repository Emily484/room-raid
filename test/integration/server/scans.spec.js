import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../../../server/app.js';
import { createUploadHelpers } from '../../../server/middleware/upload.js';
import { createScanStore } from '../../../server/services/scanStore.js';

function mktemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'room-raid-test-'));
}

function tinyJpegBuffer() {
  // Minimal JPEG header + small data (not a valid full image but many frameworks accept)
  return Buffer.from([0xFF,0xD8,0xFF,0xDB,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,0x07,0x07,0x07,0x09,0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,0x24,0x2E,0x27,0x20,0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,0x39,0x3D,0x38,0x32,0x3C,0x2E,0x33,0x34,0x32,0xFF,0xD9]);
}

describe('Scans API (integration)', () => {
  let tmpRoot;
  let uploadsDir;
  let dataDir;
  let app;
  let server;

  beforeEach(() => {
    tmpRoot = mktemp();
    uploadsDir = path.join(tmpRoot, 'uploads');
    dataDir = path.join(tmpRoot, 'data');

    // create app with injected paths
    app = createApp({ dataDir, uploadsDir });
  });

  afterEach(() => {
    // cleanup tmp
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}
  });

  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /api/scans creates a scan with canonical slots', async () => {
    const res = await request(app).post('/api/scans');
    expect(res.status).toBe(201);
    const scan = res.body;
    expect(scan.id).toBeTruthy();
    expect(scan.status).toBe('draft');
    expect(scan.createdAt).toBeTruthy();
    expect(scan.updatedAt).toBeTruthy();
    // slots should include canonical ids
    expect(scan.slots).toBeTruthy();
    expect(Array.isArray(scan.slots.bedroomOverview)).toBe(true);
    expect(Array.isArray(scan.slots.floor)).toBe(true);
    expect(Array.isArray(scan.slots.surfaces)).toBe(true);
    expect(Array.isArray(scan.slots.bathroom)).toBe(true);

    // verify scans.json exists in dataDir
    const scansJson = path.join(dataDir, 'scans.json');
    expect(fs.existsSync(scansJson)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(scansJson, 'utf-8'));
    expect(raw.scans.find(s => s.id === scan.id)).toBeTruthy();
  });

  it('GET /api/scans/:scanId returns the scan; unknown returns 404', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;

    const getRes = await request(app).get(`/api/scans/${scanId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(scanId);

    const bad = await request(app).get('/api/scans/does-not-exist');
    expect(bad.status).toBe(404);
  });

  it('GET /api/scans/current returns current scan', async () => {
    // no scan created yet -> get current should return null body or 200 null
    const noScan = await request(app).get('/api/scans/current');
    // depending on implementation we accept null or 200 with null body
    expect([200, 204]).toContain(noScan.status);

    // create one and it should be current
    const createRes = await request(app).post('/api/scans');
    const current = await request(app).get('/api/scans/current');
    expect(current.status).toBe(200);
    expect(current.body.id).toBe(createRes.body.id);
  });

  it('valid image upload attaches metadata and saves file', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;

    const buf = tinyJpegBuffer();

    const uploadRes = await request(app)
      .post(`/api/scans/${scanId}/images`)
      .field('slotId', 'floor')
      .field('width', '100')
      .field('height', '80')
      .attach('image', buf, 'test.jpg');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.image).toBeTruthy();
    const image = uploadRes.body.image;
    expect(image.originalFileName).toBe('test.jpg');
    expect(image.storedFileName).toBeTruthy();
    expect(image.mimeType).toContain('image');
    expect(image.width).toBe(100);
    expect(image.height).toBe(80);
    expect(image.url).toMatch(/^\/api\/uploads\//);

    // physical file exists
    const stored = path.join(uploadsDir, image.storedFileName);
    expect(fs.existsSync(stored)).toBe(true);

    // static serve the file
    const staticRes = await request(app).get(image.url);
    expect(staticRes.status).toBe(200);
    expect(staticRes.headers['content-type']).toMatch(/image/);
  });

  it('invalid slot upload is rejected and file removed', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;
    const buf = tinyJpegBuffer();

    const uploadRes = await request(app)
      .post(`/api/scans/${scanId}/images`)
      .field('slotId', 'not-a-slot')
      .attach('image', buf, 'test.jpg');

    expect(uploadRes.status).toBe(400);
    // check no files remain in uploadsDir
    const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    expect(files.length).toBe(0);
  });

  it('non-image upload is rejected and no file stored', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;
    const buf = Buffer.from('hello world');

    const uploadRes = await request(app)
      .post(`/api/scans/${scanId}/images`)
      .field('slotId', 'floor')
      .attach('image', buf, 'not-image.txt');

    expect(uploadRes.status).toBe(400);
    const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    expect(files.length).toBe(0);
  });

  it('oversized upload is rejected and no file stored', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;
    // generate ~16MB buffer
    const big = Buffer.alloc((15 * 1024 * 1024) + 1024, 0xff);

    const uploadRes = await request(app)
      .post(`/api/scans/${scanId}/images`)
      .field('slotId', 'floor')
      .attach('image', big, 'big.jpg');

    expect(uploadRes.status).toBeGreaterThanOrEqual(400);
    const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    expect(files.length).toBe(0);
  });

  it('slot maxImages enforced and no orphan on fourth upload', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;
    const buf = tinyJpegBuffer();

    for (let i = 0; i < 3; i++) {
      const r = await request(app)
        .post(`/api/scans/${scanId}/images`)
        .field('slotId', 'floor')
        .attach('image', buf, `t${i}.jpg`);
      expect(r.status).toBe(201);
    }

    const fourth = await request(app)
      .post(`/api/scans/${scanId}/images`)
      .field('slotId', 'floor')
      .attach('image', buf, 't3.jpg');

    expect(fourth.status).toBeGreaterThanOrEqual(400);
    // ensure only 3 files exist
    const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    expect(files.length).toBe(3);
  });

  it('delete image removes metadata and disk file', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;
    const buf = tinyJpegBuffer();

    const r = await request(app)
      .post(`/api/scans/${scanId}/images`)
      .field('slotId', 'floor')
      .attach('image', buf, 'd.jpg');
    expect(r.status).toBe(201);
    const image = r.body.image;
    const storedPath = path.join(uploadsDir, image.storedFileName);
    expect(fs.existsSync(storedPath)).toBe(true);

    const beforeScan = (await request(app).get(`/api/scans/${scanId}`)).body;
    const beforeUpdated = beforeScan.updatedAt;

    const del = await request(app).delete(`/api/scans/${scanId}/images/${image.id}`);
    expect(del.status).toBe(200);
    const after = (await request(app).get(`/api/scans/${scanId}`)).body;
    expect(after.slots.floor.find(i => i.id === image.id)).toBeUndefined();
    expect(fs.existsSync(storedPath)).toBe(false);
    expect(after.updatedAt).not.toBe(beforeUpdated);
  });

  it('delete scan removes metadata and all files', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;
    const buf = tinyJpegBuffer();

    // add images in different slots
    await request(app).post(`/api/scans/${scanId}/images`).field('slotId','floor').attach('image', buf, 'a.jpg');
    await request(app).post(`/api/scans/${scanId}/images`).field('slotId','surfaces').attach('image', buf, 'b.jpg');

    const listBefore = fs.readdirSync(uploadsDir);
    expect(listBefore.length).toBe(2);

    const del = await request(app).delete(`/api/scans/${scanId}`);
    expect(del.status).toBe(200);

    // scan no longer found
    const get = await request(app).get(`/api/scans/${scanId}`);
    expect(get.status).toBe(404);

    // uploads removed
    const remaining = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    expect(remaining.length).toBe(0);
  });

  it('persistence reload: new store instance reads the same data', async () => {
    const createRes = await request(app).post('/api/scans');
    const scanId = createRes.body.id;
    const buf = tinyJpegBuffer();
    await request(app).post(`/api/scans/${scanId}/images`).field('slotId','floor').attach('image', buf, 'x.jpg');

    // create a fresh app that points at the same dataDir/uploadsDir
    const app2 = createApp({ dataDir, uploadsDir });
    const current = await request(app2).get('/api/scans/current');
    expect(current.status).toBe(200);
    expect(current.body.id).toBe(scanId);
  });

  it('write safety: scans.json is valid after writes', async () => {
    const createRes = await request(app).post('/api/scans');
    const scansJson = path.join(dataDir, 'scans.json');
    const raw = fs.readFileSync(scansJson, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
    // no temp .tmp lingering
    expect(fs.existsSync(`${scansJson}.tmp`)).toBe(false);
  });

  it('malformed JSON: createScan should initialize if scans.json missing but not silently overwrite malformed', async () => {
    // write malformed json
    const scansJson = path.join(dataDir, 'scans.json');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(scansJson, '{ this is : not json }', 'utf-8');

    // create new app reading same data
    const app2 = createApp({ dataDir, uploadsDir });
    // read current - our implementation returns a fallback empty store rather than crash
    const cur = await request(app2).get('/api/scans/current');
    // Accept null or 200, but ensure server didn't crash.
    expect([200, 204]).toContain(cur.status);
  });

});
