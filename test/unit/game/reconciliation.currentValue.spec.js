/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { generateProposalForObservation, generateProposals } from '../../../src/game/reconciliation.js';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';
import { getEstimated } from '../../../src/game/roomFields.js';
import React from 'react';
import { render } from '@testing-library/react';
import RoomInspector from '../../../src/components/DevPage/RoomInspector.jsx';
import { MemoryRouter } from 'react-router-dom';

describe('reconciliation proposal currentValue behavior', () => {
	it('none_observed proposal contains canonical current estimated value and proposedValue is null when confidence low', () => {
		const obs = { field: 'cardboard', status: 'none_observed', confidence: 0.1 };
		const p = generateProposalForObservation({ roomState: defaultRoomState, observation: obs, currentValue: defaultRoomState.cardboard.estimated });
		expect(p).toHaveProperty('currentValue');
		expect(p.currentValue).toBe(defaultRoomState.cardboard.estimated);
		// low confidence should not propose numeric value
		expect(p.proposedValue).toBeNull();
	});

	it('none_observed with high confidence proposes zero and includes currentValue', () => {
		const obs = { field: 'cardboard', status: 'none_observed', confidence: 0.9 };
		const p = generateProposalForObservation({ roomState: defaultRoomState, observation: obs, currentValue: defaultRoomState.cardboard.estimated });
		expect(p).toHaveProperty('currentValue');
		expect(p.currentValue).toBe(defaultRoomState.cardboard.estimated);
		expect(p.proposedValue).toBe(0);
	});

	it('unknown and not_visible proposals include currentValue and proposedValue null', () => {
		const unknown = { field: 'tubCleanliness', status: 'unknown' };
		const p1 = generateProposalForObservation({ roomState: defaultRoomState, observation: unknown, currentValue: defaultRoomState.tubCleanliness.estimated });
		expect(p1.currentValue).toBe(defaultRoomState.tubCleanliness.estimated);
		expect(p1.proposedValue).toBeNull();

		const notVisible = { field: 'tubCleanliness', status: 'not_visible' };
		const p2 = generateProposalForObservation({ roomState: defaultRoomState, observation: notVisible, currentValue: defaultRoomState.tubCleanliness.estimated });
		expect(p2.currentValue).toBe(defaultRoomState.tubCleanliness.estimated);
		expect(p2.proposedValue).toBeNull();
	});

	it('qualitative/manual-review observations include currentValue and do not produce numeric proposals', () => {
		const qual = { field: 'surfaceClutter', status: 'qualitative', severity: 'high' };
		const p = generateProposalForObservation({ roomState: defaultRoomState, observation: qual, currentValue: defaultRoomState.surfaceClutter.estimated });
		expect(p.currentValue).toBe(defaultRoomState.surfaceClutter.estimated);
		expect(p.proposedValue).toBeNull();
	});

	it('generateProposals uses fallback for missing canonical value instead of undefined', () => {
		const rs = { ...defaultRoomState };
		delete rs.cardboard; // remove canonical field to simulate missing value
		const analysis = { observation: { observations: [ { field: 'cardboard', status: 'unknown' } ] } };
		const proposals = generateProposals({ roomState: rs, analysis });
		expect(proposals.length).toBe(1);
		const p = proposals[0];
		// fallback should be numeric (getEstimated returns 0 when missing)
		expect(p).toHaveProperty('currentValue');
		expect(p.currentValue).toBe(0);
	});
});

describe('RoomInspector SSR rendering avoids literal "Current: undefined"', () => {
	it('does not render the exact text "Current: undefined" for proposals', () => {
		// Render with no scan and empty proposals to ensure no undefined text
		const fakeGame = { roomState: defaultRoomState };
				const { container } = render(
					React.createElement(MemoryRouter, {}, React.createElement(RoomInspector, { game: fakeGame, applyEffects: () => {}, observeField: () => {}, approveObservedField: () => {}, scanState: { scan: null, totalImages: 0 } }))
				);
		const text = container.textContent || '';
		expect(text.includes('Current: undefined')).toBe(false);
	});
});
