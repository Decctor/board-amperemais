import { useCallback } from "react";

export function useAutoScrollOnFocus(delay = 500) {
	return useCallback((e: React.FocusEvent<HTMLElement>) => {
		const target = e.target;
		setTimeout(() => {
			target.scrollIntoView({ behavior: "smooth", block: "center" });
		}, delay);
	}, [delay]);
}
