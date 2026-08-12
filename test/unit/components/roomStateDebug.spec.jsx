import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RoomStateDebug from '../../../src/components/RoomStateDebug.jsx';

describe('RoomStateDebug display', () => {
  it('renders a fully populated field correctly', () => {
    const roomState = {
      clothingOnFloor: {
        observed: 22.5,
        estimated: 22.5,
        confidence: 0.9,
        lastObservedAt: '2026-08-12T01:56:39.139Z'
      }
    };

    render(React.createElement(RoomStateDebug, { roomState }));

    expect(screen.getByText(/Estimated: 22.5/)).toBeTruthy();
    expect(screen.getByText(/Observed: 22.5/)).toBeTruthy();
    expect(screen.getByText(/Confidence: 90%/)).toBeTruthy();
    expect(screen.getByText(/Last observed:/)).toBeTruthy();
    expect(screen.queryByText(/\[object Object\]/)).toBeNull();
  });

  it('renders a null observed field correctly', () => {
    const roomState = {
      clothingOnFloor: {
        observed: null,
        estimated: 30,
        confidence: 0.4,
        lastObservedAt: null,
      }
    };

    render(React.createElement(RoomStateDebug, { roomState }));

    expect(screen.getByText(/Estimated: 30/)).toBeTruthy();
    expect(screen.getByText(/Observed: —/)).toBeTruthy();
    expect(screen.getByText(/Confidence: 40%/)).toBeTruthy();
    expect(screen.getByText(/Last observed: Never/)).toBeTruthy();
    expect(screen.queryByText(/\[object Object\]/)).toBeNull();
  });
});
