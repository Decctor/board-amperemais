import * as React from "react";

const EMPTY_SUBSCRIBE = () => () => {};

// useSyncExternalStore em vez de useState + useEffect: com o estado iniciando em `false`, todo
// ResponsiveMenu montava a árvore do Drawer (mobile) e só no efeito trocava pelo Dialog — duas
// montagens completas por abertura de modal. Aqui a leitura já é correta no primeiro render de
// cliente, e o getServerSnapshot mantém a hidratação estável para quem renderiza no servidor.
export function useMediaQuery(query: string) {
	const subscribe = React.useCallback(
		(onStoreChange: () => void) => {
			if (typeof window === "undefined" || typeof window.matchMedia !== "function") return EMPTY_SUBSCRIBE();
			const result = window.matchMedia(query);
			result.addEventListener("change", onStoreChange);
			return () => result.removeEventListener("change", onStoreChange);
		},
		[query],
	);

	const getSnapshot = React.useCallback(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
		return window.matchMedia(query).matches;
	}, [query]);

	return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
