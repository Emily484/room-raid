import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { observeField, getEstimated, FIELD_METADATA } from '../../../src/game/roomFields.js';

describe('canonical field bounds and setter behavior', () => {
	it('FIELD_METADATA lists percent-like bounded fields', () => {
		// sanity: ensure meta exists for expected keys
		expect(FIELD_METADATA).toHaveProperty('tubCleanliness');
		expect(FIELD_METADATA.tubCleanliness.type).toBe('percent');
	});

	it('bounded fields clamp at 100 for additive numeric effects', () => {
		const before = { ...defaultRoomState };
		// tubCleanliness starts at 50; +60 should clamp to 100
		const after1 = applyStateEffects(before, { tubCleanliness: 60 });
		expect(getEstimated(after1, 'tubCleanliness')).toBe(100);

		// tubCleanliness 95 + 12 => 100
		const before2 = { ...defaultRoomState };
		before2.tubCleanliness = { ...before2.tubCleanliness, estimated: 95 };
		const after2 = applyStateEffects(before2, { tubCleanliness: 12 });
		expect(getEstimated(after2, 'tubCleanliness')).toBe(100);

		// tubCleanliness 20 + 30 => 50 (no clamping)
		const before3 = { ...defaultRoomState };
		before3.tubCleanliness = { ...before3.tubCleanliness, estimated: 20 };
		const after3 = applyStateEffects(before3, { tubCleanliness: 30 });
		expect(getEstimated(after3, 'tubCleanliness')).toBe(50);
	});

	it('other bounded fields obey 0..100 bounds for set/add operations', () => {
		const b = { ...defaultRoomState };
		b.floorCleanliness = { ...b.floorCleanliness, estimated: 90 };
		const a = applyStateEffects(b, { floorCleanliness: 30 });
		expect(getEstimated(a, 'floorCleanliness')).toBe(100);

		const b2 = { ...defaultRoomState };
		b2.bedMade = { ...b2.bedMade, estimated: 25 };
		const a2 = applyStateEffects(b2, { bedMade: 100 });
		expect(getEstimated(a2, 'bedMade')).toBe(100);

		// operation:'set' respects bounds
		const b3 = { ...defaultRoomState };
		b3.tubCleanliness = { ...b3.tubCleanliness, estimated: 10 };
		const a3 = applyStateEffects(b3, { tubCleanliness: { operation: 'set', value: 500 } });
		expect(getEstimated(a3, 'tubCleanliness')).toBe(100);

		// operation:'add' respects bounds
		const b4 = { ...defaultRoomState };
		b4.tubCleanliness = { ...b4.tubCleanliness, estimated: 95 };
		const a4 = applyStateEffects(b4, { tubCleanliness: { operation: 'add', value: 12 } });
		expect(getEstimated(a4, 'tubCleanliness')).toBe(100);
	});

	it('count fields floor at 0 and are not capped at 100', () => {
		const b = { ...defaultRoomState };
		b.cardboard = { ...b.cardboard, estimated: 5 };
		// adding -20 should floor at 0
		const a = applyStateEffects(b, { cardboard: -20 });
		expect(getEstimated(a, 'cardboard')).toBe(0);

		// adding +20 results in 25 (no cap)
		const b2 = { ...defaultRoomState };
		b2.cardboard = { ...b2.cardboard, estimated: 5 };
		const a2 = applyStateEffects(b2, { cardboard: 20 });
		expect(getEstimated(a2, 'cardboard')).toBe(25);

		// verify count fields are not capped at 100 by adding a large value
		const b3 = { ...defaultRoomState };
		b3.cardboard = { ...b3.cardboard, estimated: 90 };
		const a3 = applyStateEffects(b3, { cardboard: 50 });
		expect(getEstimated(a3, 'cardboard')).toBe(140);
	});
});
