import assert from "node:assert/strict";
import test from "node:test";
import { getPreviousPeriod, getTrailingMonthKeys } from "./periods";

test("previous period is an immediately preceding window of identical duration", () => {
	const period = { after: new Date("2026-07-01T00:00:00.000Z"), before: new Date("2026-07-31T23:59:59.999Z") };
	const previous = getPreviousPeriod(period);
	assert.equal(previous.before.getTime(), period.after.getTime() - 1);
	assert.equal(previous.before.getTime() - previous.after.getTime(), period.before.getTime() - period.after.getTime());
});

test("trailing month keys end at the month of the reference date", () => {
	const keys = getTrailingMonthKeys(new Date("2026-07-15T12:00:00.000Z"));
	assert.equal(keys.length, 12);
	assert.equal(keys[0], "2025-08");
	assert.equal(keys[11], "2026-07");
});
