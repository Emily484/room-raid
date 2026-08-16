/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect, useRef } from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { useScanState } from '../../../src/hooks/useScanState.js';

function HookHarness({ onReady }) {
  const scanRef = useRef(null);
  const s = useScanState();
  useEffect(() => {
    scanRef.current = s;
    if (onReady) onReady(s);
    return () => {};
  }, [s]);
  return null;
}

describe('useScanState URL lifecycle', () => {
  let container;
  let revokeSpy;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // jsdom may not implement URL.revokeObjectURL; ensure a stub exists so we can spy on it
    if (typeof URL.revokeObjectURL !== 'function') {
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: () => {},
        configurable: true,
        writable: true,
      });
    }
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
  });

  afterEach(() => {
    try { if (root) root.unmount(); } catch (e) {}
    container.remove();
    vi.restoreAllMocks();
  });

  it('removeImage revokes exactly the removed image URL', (done) => {
    let harnessApi;
    function onReady(api) {
      harnessApi = api;
      const meta1 = { id: 'a1', slotId: 'floor', previewUrl: 'blob://a' };
      const meta2 = { id: 'a2', slotId: 'floor', previewUrl: 'blob://b' };
      // simulate adding images by directly writing into filesRef via addImage
      harnessApi.addImage('floor', { name: 'x' }, meta1).then(() => {
        harnessApi.addImage('floor', { name: 'y' }, meta2).then(() => {
          // remove first
          harnessApi.removeImage('floor', 'a1');

          // expect revoke called for blob://a
          expect(revokeSpy).toHaveBeenCalledWith('blob://a');
          done();
        });
      });
    }

    root = ReactDOMClient.createRoot(container);
    root.render(React.createElement(HookHarness, { onReady }));
  });

  it('replaceImage revokes previous image URL', (done) => {
    let harnessApi;
    function onReady(api) {
      harnessApi = api;
      const meta1 = { id: 'b1', slotId: 'floor', previewUrl: 'blob://p' };
      const newMeta = { id: 'b2', slotId: 'floor', previewUrl: 'blob://q' };
      harnessApi.addImage('floor', { name: 'p' }, meta1).then(() => {
        harnessApi.replaceImage('floor', 'b1', { name: 'q' }, newMeta);
        expect(revokeSpy).toHaveBeenCalledWith('blob://p');
        done();
      });
    }

    root = ReactDOMClient.createRoot(container);
    root.render(React.createElement(HookHarness, { onReady }));
  });

  it('clearScan revokes every remaining URL', (done) => {
    let harnessApi;
    function onReady(api) {
      harnessApi = api;
      const meta1 = { id: 'c1', slotId: 'floor', previewUrl: 'blob://1' };
      const meta2 = { id: 'c2', slotId: 'floor', previewUrl: 'blob://2' };
      harnessApi.addImage('floor', { name: '1' }, meta1).then(() => {
        harnessApi.addImage('floor', { name: '2' }, meta2).then(() => {
          harnessApi.clearScan();
          // both revoked
          expect(revokeSpy).toHaveBeenCalledWith('blob://1');
          expect(revokeSpy).toHaveBeenCalledWith('blob://2');
          done();
        });
      });
    }

    root = ReactDOMClient.createRoot(container);
    root.render(React.createElement(HookHarness, { onReady }));
  });

  it('unmounting the hook revokes remaining URLs', (done) => {
    let harnessApi;
    function onReady(api) {
      harnessApi = api;
      const meta1 = { id: 'd1', slotId: 'floor', previewUrl: 'blob://x1' };
      const meta2 = { id: 'd2', slotId: 'floor', previewUrl: 'blob://x2' };
      harnessApi.addImage('floor', { name: '1' }, meta1).then(() => {
        harnessApi.addImage('floor', { name: '2' }, meta2).then(() => {
          // unmount component which should trigger cleanup
          unmountComponentAtNode(container);
          // both revoked
          expect(revokeSpy).toHaveBeenCalledWith('blob://x1');
          expect(revokeSpy).toHaveBeenCalledWith('blob://x2');
          done();
        });
      });
    }

    root = ReactDOMClient.createRoot(container);
    root.render(React.createElement(HookHarness, { onReady }));
  });
});
