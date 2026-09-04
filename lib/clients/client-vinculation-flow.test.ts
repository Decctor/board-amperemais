import assert from "node:assert/strict";
import test from "node:test";
import { clientVinculationFlowReducer, INITIAL_CLIENT_VINCULATION_FLOW_STATE, type TClientVinculationFlowState } from "./client-vinculation-flow";

test("starts creation manually and preserves the normalized search as its seed", () => {
	const state = clientVinculationFlowReducer(INITIAL_CLIENT_VINCULATION_FLOW_STATE, {
		type: "START_CREATION",
		source: "manual",
		search: "  Lucas Fernandes  ",
	});

	assert.deepEqual(state, {
		mode: "create",
		source: "manual",
		seedSearch: "Lucas Fernandes",
	});
});

test("returning from creation suppresses automatic reopening for the same search", () => {
	const creatingState: TClientVinculationFlowState = {
		mode: "create",
		source: "no_results",
		seedSearch: "Lucas Fernandes",
	};

	const state = clientVinculationFlowReducer(creatingState, { type: "RETURN_TO_SEARCH" });

	assert.deepEqual(state, {
		mode: "search",
		suppressAutomaticCreationFor: "Lucas Fernandes",
	});
});

test("editing the search clears automatic-creation suppression", () => {
	const suppressedState: TClientVinculationFlowState = {
		mode: "search",
		suppressAutomaticCreationFor: "Lucas Fernandes",
	};

	const unchangedState = clientVinculationFlowReducer(suppressedState, {
		type: "SEARCH_CHANGED",
		search: " Lucas Fernandes ",
	});
	assert.equal(unchangedState, suppressedState);

	const changedState = clientVinculationFlowReducer(suppressedState, {
		type: "SEARCH_CHANGED",
		search: "Maria",
	});
	assert.deepEqual(changedState, INITIAL_CLIENT_VINCULATION_FLOW_STATE);
});
