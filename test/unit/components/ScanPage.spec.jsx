/* @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScanPage from '../../../src/components/ScanPage/ScanPage.jsx';

describe('ScanPage null-analysis regression', () => {
  it('renders when scan has photos but no analyses and shows Analyze button', async () => {
    const fakeScan = {
      id: 'scan-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: null,
      slots: {
        floor: [
          {
            id: 'i-1',
            fileName: 'img1.jpg',
            previewUrl: 'blob://img1',
            size: 12345,
            width: 800,
            height: 600,
          },
        ],
      },
      analyses: null, // explicitly null
    };

    const scanState = {
      scan: fakeScan,
      totalImages: 1,
      addImage: () => {},
      removeImage: () => {},
      clearScan: () => {},
      runAnalysis: async () => ({ analysis: null }),
    };

    render(<ScanPage scanState={scanState} />);

    // Should render Analyze Scan button
    const analyze = await screen.findByRole('button', { name: /Analyze Scan/i });
    expect(analyze).toBeTruthy();

    // Should show the preview image
    const img = screen.getByAltText(/floor upload preview/i);
    expect(img).toBeTruthy();
  });
});
