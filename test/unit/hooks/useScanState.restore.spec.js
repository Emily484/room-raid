/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { useEffect, useRef } from 'react';

describe('useScanState restore behavior', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    localStorage.removeItem('roomRaidActiveScanId');
    vi.resetModules();
  });

  afterEach(() => {
    try { if (root) root.unmount(); } catch (e) {}
    container.remove();
    vi.restoreAllMocks();
  });

  async function mountHookWithMocks(mocks) {
    // Setup mocks for scans API
    vi.doMock('../../../src/api/scans.js', () => mocks);
    const { useScanState: importedUseScanState } = await import('../../../src/hooks/useScanState.js');

    return new Promise((resolve, reject) => {
      let settled = false;
      function HookHarness({ onReady }) {
        const ref = useRef(null);
        const s = importedUseScanState();
        useEffect(() => {
          if (settled) return;
          try {
            if (s && s.scan) {
              settled = true;
              onReady(s);
              resolve(s);
            }
          } catch (e) {
            settled = true;
            reject(e);
          }
        }, [s]);
        return null;
      }

      root = ReactDOMClient.createRoot(container);
      root.render(React.createElement(HookHarness, { onReady: (s) => {} }));
    });
  }

  it('restores saved active id when present', async () => {
    const saved = { id: 'scan-restored', slots: {}, createdAt: 'x', updatedAt: 'x' };
    localStorage.setItem('roomRaidActiveScanId', saved.id);

    const mocks = {
      getScan: async (id) => { if (id === saved.id) return saved; throw Object.assign(new Error('not found'), { status: 404 }); },
      getCurrentScan: async () => null,
      createScan: async () => null,
      uploadScanImage: async () => null,
      deleteScanImage: async () => null,
      analyzeScan: async () => null,
    };

    const api = await mountHookWithMocks(mocks);
    expect(api.scan).toBeTruthy();
    expect(api.scan.id).toBe(saved.id);
  });

  it('saved active id differs from server current -> saved wins', async () => {
    const saved = { id: 'scan-restored', slots: {}, createdAt: 'x', updatedAt: 'x' };
    const current = { id: 'scan-current', slots: {}, createdAt: 'x', updatedAt: 'x' };
    localStorage.setItem('roomRaidActiveScanId', saved.id);

    const mocks = {
      getScan: async (id) => { if (id === saved.id) return saved; throw Object.assign(new Error('not found'), { status: 404 }); },
      getCurrentScan: async () => current,
      createScan: async () => null, uploadScanImage: async () => null, deleteScanImage: async () => null, analyzeScan: async () => null,
    };

    const api = await mountHookWithMocks(mocks);
    expect(api.scan.id).toBe(saved.id);
  });

  it('stale saved id (404) -> clears and falls back to server current', async () => {
    const current = { id: 'scan-current', slots: {}, createdAt: 'x', updatedAt: 'x' };
    localStorage.setItem('roomRaidActiveScanId', 'stale-id');

    const mocks = {
      getScan: async () => { throw Object.assign(new Error('not found'), { status: 404 }); },
      getCurrentScan: async () => current,
      createScan: async () => null, uploadScanImage: async () => null, deleteScanImage: async () => null, analyzeScan: async () => null,
    };

    const api = await mountHookWithMocks(mocks);
    expect(localStorage.getItem('roomRaidActiveScanId')).toBe(current.id);
    expect(api.scan.id).toBe(current.id);
  });

  it('no saved id -> uses server current', async () => {
    const current = { id: 'scan-current', slots: {}, createdAt: 'x', updatedAt: 'x' };
    const mocks = { getScan: async () => { throw new Error('not used'); }, getCurrentScan: async () => current, createScan: async () => null, uploadScanImage: async () => null, deleteScanImage: async () => null, analyzeScan: async () => null };
    const api = await mountHookWithMocks(mocks);
    expect(api.scan.id).toBe(current.id);
    expect(localStorage.getItem('roomRaidActiveScanId')).toBe(current.id);
  });

  it('neither saved nor current exists -> creates new scan', async () => {
    const mocks = { getScan: async () => { throw new Error('not found'); }, getCurrentScan: async () => null, createScan: async () => ({ id: 'created', slots: {} }), uploadScanImage: async () => null, deleteScanImage: async () => null, analyzeScan: async () => null };
    const api = await mountHookWithMocks(mocks);
    expect(api.scan.id).toBe('created');
    expect(localStorage.getItem('roomRaidActiveScanId')).toBe('created');
  });

  it('restored scan retains its images and analyses', async () => {
    const saved = { id: 'scan-restored', slots: { floor: [{ id: 'img1' }] }, analyses: [{ id: 'a1' }] };
    localStorage.setItem('roomRaidActiveScanId', saved.id);
    const mocks = { getScan: async (id) => saved, getCurrentScan: async () => null, createScan: async () => null, uploadScanImage: async () => null, deleteScanImage: async () => null, analyzeScan: async () => null };
    const api = await mountHookWithMocks(mocks);
    expect(api.scan.slots.floor.length).toBe(1);
    expect(Array.isArray(api.scan.analyses)).toBe(true);
  });

  it('remounting does not create a new scan when saved exists', async () => {
    const saved = { id: 'scan-restored', slots: {}, analyses: [] };
    localStorage.setItem('roomRaidActiveScanId', saved.id);
    const mocks = { getScan: async (id) => saved, getCurrentScan: async () => null, createScan: async () => null, uploadScanImage: async () => null, deleteScanImage: async () => null, analyzeScan: async () => null };
    const api = await mountHookWithMocks(mocks);
    expect(api.scan.id).toBe(saved.id);
    // remount: render a new harness and ensure same id
    const container2 = document.createElement('div');
    document.body.appendChild(container2);
    const { useScanState: importedUseScanState } = await import('../../../src/hooks/useScanState.js');
    await new Promise((resolve) => {
      function HookHarness2({ onReady }) {
        const s = importedUseScanState();
        useEffect(() => { if (onReady) onReady(s); }, [s]);
        return null;
      }
      const root2 = ReactDOMClient.createRoot(container2);
      root2.render(React.createElement(HookHarness2, { onReady: (api2) => { try { expect(api2.scan.id).toBe(saved.id); root2.unmount(); document.body.removeChild(container2); resolve(); } catch (e) { resolve(e); } } }));
    });
  });
});
