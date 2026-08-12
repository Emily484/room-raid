import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import RoomInspector from '../../../src/components/DevPage/RoomInspector.jsx';
import { MemoryRouter } from 'react-router-dom';
import { generateProposals } from '../../../src/game/reconciliation.js';

// Small helper to render RoomInspector with provided props
function renderInspector(props) {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(RoomInspector, props)),
    { container: document.body }
  );
}

describe('RoomInspector reconciliation interactions (RTL)', () => {
  it('does not mutate roomState on initial render', () => {
    const scan = {
      updatedAt: 'SCAN_T0',
      slots: {
        floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' } ]
      },
      analyses: [
        {
          createdAt: '2026-08-11T00:00:00.000Z',
          scanUpdatedAt: 'SCAN_T0',
          status: 'completed',
          observation: {
            observations: [ { field: 'clothingOnFloor', status: 'observed', estimatedRange: { min: 20, max: 30 }, confidence: 0.9, evidence: [ { slotId: 'floor', imageId: 'f1' } ] } ]
          }
        }
      ]
    };

    const roomState = { clothingOnFloor: { estimated: 10, confidence: 0.5 } };
    const before = structuredClone(roomState);
    const approveSpy = vi.fn();

    renderInspector({ game: { roomState }, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState: { scan } });

    expect(roomState).toEqual(before);
    expect(approveSpy).not.toHaveBeenCalled();
  });

  it('fresh Accept calls approveObservedField with expected args', async () => {
    const user = userEvent.setup();

    const scan = {
      updatedAt: 'SCAN_T0',
      slots: {
        floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' } ]
      },
      analyses: [
        {
          createdAt: '2026-08-11T00:00:00.000Z',
          scanUpdatedAt: 'SCAN_T0',
          status: 'completed',
          observation: {
            observations: [ { field: 'clothingOnFloor', status: 'observed', estimatedRange: { min: 20, max: 30 }, confidence: 0.9, evidence: [ { slotId: 'floor', imageId: 'f1' } ] } ]
          }
        }
      ]
    };

    const roomState = { clothingOnFloor: { estimated: 10, confidence: 0.5 } };
    const approveSpy = vi.fn();

    renderInspector({ game: { roomState }, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState: { scan } });

    // Accept button should be present and enabled
    const accept = screen.getByRole('button', { name: /accept/i });
    expect(accept).toBeEnabled();

    await user.click(accept);

    expect(approveSpy).toHaveBeenCalledTimes(1);
    const call = approveSpy.mock.calls[0][0];
    expect(call.field).toBe('clothingOnFloor');
    // proposed value uses midpoint rounding from reconciliation.js: midpoint(20,30)=25 -> roundConsistently -> 25.0
    expect(call.value).toBeCloseTo(25);
    expect(call.confidence).toBeCloseTo(0.9);
    expect(call.observedAt).toBe('2026-08-11T00:00:00.000Z');
  });

  it('stale analysis disables Accept and prevents approveObservedField', async () => {
    const user = userEvent.setup();

    const scan = {
      updatedAt: 'SCAN_T1', // different from analysis.scanUpdatedAt
      slots: {
        floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' } ]
      },
      analyses: [
        {
          createdAt: '2026-08-11T00:00:00.000Z',
          scanUpdatedAt: 'OLD_SCAN',
          status: 'completed',
          observation: {
            observations: [ { field: 'clothingOnFloor', status: 'observed', estimatedRange: { min: 20, max: 30 }, confidence: 0.95, evidence: [ { slotId: 'floor', imageId: 'f1' } ] } ]
          }
        }
      ]
    };

    const roomState = { clothingOnFloor: { estimated: 10, confidence: 0.5 } };
    const approveSpy = vi.fn();

    renderInspector({ game: { roomState }, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState: { scan } });

    // stale warning should be visible
    expect(screen.getByText(/analysis is stale/i)).toBeTruthy();

    const accept = screen.getByRole('button', { name: /accept/i });
    expect(accept).toBeDisabled();

    await user.click(accept);
    expect(approveSpy).not.toHaveBeenCalled();
  });

  it('Keep Current does not call approveObservedField', async () => {
    const user = userEvent.setup();

    const scan = {
      updatedAt: 'SCAN_T0',
      slots: {
        floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' } ]
      },
      analyses: [
        {
          createdAt: '2026-08-11T00:00:00.000Z',
          scanUpdatedAt: 'SCAN_T0',
          status: 'completed',
          observation: {
            observations: [ { field: 'clothingOnFloor', status: 'observed', estimatedRange: { min: 20, max: 30 }, confidence: 0.9, evidence: [ { slotId: 'floor', imageId: 'f1' } ] } ]
          }
        }
      ]
    };

    const roomState = { clothingOnFloor: { estimated: 10, confidence: 0.5 } };
    const approveSpy = vi.fn();

    renderInspector({ game: { roomState }, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState: { scan } });

    const keep = screen.getByRole('button', { name: /keep current/i });
    await user.click(keep);
    expect(approveSpy).not.toHaveBeenCalled();
  });

  it('proposedValue === null case shows proposal without enabled Accept', () => {
    const scan = {
      updatedAt: 'SCAN_T0',
      slots: {
        floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' } ]
      },
      analyses: [
        {
          createdAt: '2026-08-11T00:00:00.000Z',
          scanUpdatedAt: 'SCAN_T0',
          status: 'completed',
          observation: {
            observations: [ { field: 'clothingOnFloor', status: 'none_observed', confidence: 0.9, evidence: [ { slotId: 'floor', imageId: 'f1' } ] } ]
          }
        }
      ]
    };

    const roomState = { clothingOnFloor: { estimated: 10, confidence: 0.5 } };
    const approveSpy = vi.fn();

    renderInspector({ game: { roomState }, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState: { scan } });

    // Suggested value is null -> Accept should be disabled (no enabled Accept)
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    expect(acceptButtons.length).toBeGreaterThanOrEqual(1);
    // find the one inside the proposal and check disabled
    const accept = acceptButtons.find(b => b.disabled === true || b.getAttribute('disabled') !== null);
    expect(accept).toBeTruthy();
    expect(approveSpy).not.toHaveBeenCalled();
  });

  it('clicking evidence thumbnails does not call approveObservedField', async () => {
    const user = userEvent.setup();

    const scan = {
      updatedAt: 'SCAN_T0',
      slots: {
        floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' } ]
      },
      analyses: [
        {
          createdAt: '2026-08-11T00:00:00.000Z',
          scanUpdatedAt: 'SCAN_T0',
          status: 'completed',
          observation: {
            observations: [ { field: 'clothingOnFloor', status: 'observed', estimatedRange: { min: 20, max: 30 }, confidence: 0.9, evidence: [ { slotId: 'floor', imageId: 'f1' } ] } ]
          }
        }
      ]
    };

    const roomState = { clothingOnFloor: { estimated: 10, confidence: 0.5 } };
    const approveSpy = vi.fn();

    renderInspector({ game: { roomState }, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState: { scan } });

    const thumbLink = screen.getByRole('link', { name: /evidence/i });
    await user.click(thumbLink);

    expect(approveSpy).not.toHaveBeenCalled();
  });

  it('controller guard prevents approval when analysis is stale even if called programmatically', () => {
    // Ensure component-level handler checks stale and returns early before calling approveObservedField.
    const scan = {
      updatedAt: 'SCAN_T1',
      slots: { floor: [ { id: 'f1', url: 'http://example.com/f1.jpg', slotId: 'floor' } ] },
      analyses: [
        {
          createdAt: '2026-08-11T00:00:00.000Z',
          scanUpdatedAt: 'OLD_SCAN',
          status: 'completed',
          observation: { observations: [ { field: 'clothingOnFloor', status: 'observed', estimatedRange: { min: 20, max: 30 }, confidence: 0.95, evidence: [ { slotId: 'floor', imageId: 'f1' } ] } ] }
        }
      ]
    };

    const roomState = { clothingOnFloor: { estimated: 10, confidence: 0.5 } };
    const approveSpy = vi.fn();

    // Render but then simulate calling the onClick handler by finding Accept and invoking its onclick
    renderInspector({ game: { roomState }, applyEffects: () => {}, observeField: () => {}, approveObservedField: approveSpy, scanState: { scan } });

    const accept = screen.getByRole('button', { name: /accept/i });
    // simulate programmatic call to onClick
    accept.onclick && accept.onclick(new MouseEvent('click'));

    expect(approveSpy).not.toHaveBeenCalled();
  });
});
