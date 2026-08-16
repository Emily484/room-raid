import { describe, it, expect } from 'vitest';
import { isImageFile, formatBytes, readImageDimensions } from '../../../src/utils/images.js';

describe('image utils', () => {
  it('formatBytes formats sizes', () => {
    expect(formatBytes(10)).toBe('10 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1024 * 1024 * 2)).toBe('2.00 MB');
  });

  it('isImageFile rejects non-file-like', () => {
    expect(isImageFile(null)).toBe(false);
    expect(isImageFile({})).toBe(false);
    expect(isImageFile({ type: 'image/png' })).toBe(true);
  });
});
