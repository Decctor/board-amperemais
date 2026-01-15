import type { TSellerState } from "@/schemas/sellers";
import { useCallback, useState } from "react";

const getInitialState = (): TSellerState => ({
	seller: {
		ativo: true,
		nome: "",
		identificador: "",
		telefone: "",
		email: "",
		avatarUrl: "",
		dataInsercao: new Date(),
	},
	avatarHolder: {
		file: null,
		previewUrl: null,
	},
});

export function useSellerState() {
	const [state, setState] = useState<TSellerState>(getInitialState());

	const updateSeller = useCallback((changes: Partial<TSellerState["seller"]>) => {
		setState((prev) => ({
			...prev,
			seller: {
				...prev.seller,
				...changes,
			},
		}));
	}, []);

	const updateAvatarHolder = useCallback((changes: Partial<TSellerState["avatarHolder"]>) => {
		setState((prev) => ({
			...prev,
			avatarHolder: {
				...prev.avatarHolder,
				...changes,
			},
		}));
	}, []);

	const resetState = useCallback(() => {
		setState(getInitialState());
	}, []);

	const redefineState = useCallback((state: TSellerState) => {
		setState(state);
	}, []);

	return {
		state,
		updateSeller,
		updateAvatarHolder,
		resetState,
		redefineState,
	};
}

export type TUseSellerState = ReturnType<typeof useSellerState>;
