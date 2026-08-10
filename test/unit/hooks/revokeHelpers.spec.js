import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { revokePreviewUrl, revokeAllFromFilesMap } from '../../../src/hooks/useScanState.js';

describe('revoke helpers', () => {
  let spy;
  beforeEach(() => { spy = vi.spyOn(URL, 'revokeObjectURL'); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('revokePreviewUrl calls URL.revokeObjectURL', () => {
    revokePreviewUrl('blob://foo');
    expect(spy).toHaveBeenCalledWith('blob://foo');
  });

  it('revokeAllFromFilesMap revokes and clears entries', () => {
    const files = {
      a: { previewUrl: 'blob://a' },
      b: { previewUrl: 'blob://b' },
    };

    revokeAllFromFilesMap(files);

    expect(spy).toHaveBeenCalledWith('blob://a');
    expect(spy).toHaveBeenCalledWith('blob://b');
    expect(Object.keys(files).length).toBe(0);
  });
});
