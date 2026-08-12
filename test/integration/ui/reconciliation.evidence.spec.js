// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import RoomInspector from '../../../src/components/DevPage/RoomInspector.jsx';
import { MemoryRouter } from 'react-router-dom';

// make React available globally for components
global.React = React;

describe('Reconciliation evidence UI (SSR)', () => {
  it('renders evidence thumbnails and shows Accept enabled for fresh analysis', () => {
    const approveSpy = vi.fn();

    const scan = {
      updatedAt: 'SCAN_T0',
      slots: {
        floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' }, { id: 'f2', url: 'http://example.com/f2.jpg', slotId: 'floor' } ],
        surfaces: [ { id: 's1', url: 'http://example.com/s1.jpg', slotId: 'surfaces' } ],
      },
    };

    const analysis = {
      createdAt: '2026-08-11T00:00:00.000Z',
      scanUpdatedAt: 'SCAN_T0',
      status: 'completed',
      observation: {
        observations: [
          { field: 'clothingOnFloor', status: 'observed', estimatedRange: { min: 15, max: 30 }, confidence: 0.9, evidence: [ { slotId: 'floor', imageId: 'f1' }, { slotId: 'surfaces', imageId: 's1' } ] }
        ]
      }
    };
    scan.analyses = [analysis];

    const game = { roomState: { clothingOnFloor: { estimated: 29 } } };
    const scanState = { scan };

    const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(RoomInspector, { game, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState })));

    expect(html).toContain('reconciliation-thumb');
    expect(html).toContain('http://example.com/f1.jpg');
    expect(html).toContain('http://example.com/s1.jpg');
    // Accept should appear without disabled attribute
    expect(html).toContain('<button');
    expect(html).not.toContain('disabled');
  });

  it('shows stale warning and disabled Accept when analysis is stale', () => {
    const approveSpy = vi.fn();

    const scan = {
      updatedAt: 'SCAN_T1',
      slots: {
        floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' } ],
        surfaces: [ { id: 's1', url: 'http://example.com/s1.jpg', slotId: 'surfaces' } ],
      },
    };

    const analysis = {
      createdAt: '2026-08-11T00:00:00.000Z',
      scanUpdatedAt: 'OLD_SCAN',
      status: 'completed',
      observation: {
        observations: [ { field: 'clothingOnFloor', status: 'observed', estimatedRange: { min: 5, max: 10 }, confidence: 0.95, evidence: [ { slotId: 'floor', imageId: 'f1' } ] } ]
      }
    };

    scan.analyses = [analysis];
    const game = { roomState: { clothingOnFloor: { estimated: 29 } } };
    const scanState = { scan };

    const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(RoomInspector, { game, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState })));

    expect(html).toContain('Analysis is stale');
    // Accept should be present but disabled
    expect(html).toContain('disabled');
  });
});
