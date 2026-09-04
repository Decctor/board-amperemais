export type TClientVinculationFlowState =
	| {
			mode: "search";
			suppressAutomaticCreationFor: string | null;
	  }
	| {
			mode: "create";
			source: "manual" | "no_results";
			seedSearch: string;
	  };

export type TClientVinculationFlowEvent =
	| { type: "SEARCH_CHANGED"; search: string }
	| { type: "START_CREATION"; search: string; source: "manual" | "no_results" }
	| { type: "RETURN_TO_SEARCH" };

export const INITIAL_CLIENT_VINCULATION_FLOW_STATE: TClientVinculationFlowState = {
	mode: "search",
	suppressAutomaticCreationFor: null,
};

function normalizeSearch(search: string) {
	return search.trim();
}

export function clientVinculationFlowReducer(state: TClientVinculationFlowState, event: TClientVinculationFlowEvent): TClientVinculationFlowState {
	switch (event.type) {
		case "SEARCH_CHANGED": {
			if (state.mode !== "search" || state.suppressAutomaticCreationFor === null) return state;
			if (normalizeSearch(event.search) === state.suppressAutomaticCreationFor) return state;

			return INITIAL_CLIENT_VINCULATION_FLOW_STATE;
		}
		case "START_CREATION":
			return {
				mode: "create",
				source: event.source,
				seedSearch: normalizeSearch(event.search),
			};
		case "RETURN_TO_SEARCH":
			if (state.mode !== "create") return state;

			return {
				mode: "search",
				suppressAutomaticCreationFor: state.seedSearch,
			};
	}
}
