import { useCallback, useMemo, useState } from "react";
import z from "zod";

const IfoodProductStateSchema = z.object({
	produto: z.object({
		nome: z.string({
			required_error: "Nome do produto não informado.",
			invalid_type_error: "Tipo não válido para o nome do produto.",
		}),
		descricao: z.string({ invalid_type_error: "Tipo não válido para a descrição do produto." }).nullable(),
		codigoExterno: z.string({ invalid_type_error: "Tipo não válido para o código externo do produto." }).nullable(),
		imagemPath: z.string({ invalid_type_error: "Tipo não válido para a imagem do produto." }).nullable(),
		categoriaId: z.string({ invalid_type_error: "Tipo não válido para a categoria do produto." }).nullable(),
		preco: z.number({ invalid_type_error: "Tipo não válido para o preço do produto." }).nullable(),
		precoOriginal: z.number({ invalid_type_error: "Tipo não válido para o preço original do produto." }).nullable(),
		status: z.string({ invalid_type_error: "Tipo não válido para o status do produto." }),
	}),
});
type TIfoodProductState = z.infer<typeof IfoodProductStateSchema>;

type TUseInternalIfoodProductStateProps = {
	initialState?: {
		produto?: Partial<TIfoodProductState["produto"]>;
	};
};

/** Estado local do formulário de produto/item do catálogo iFood (produto base + contexto de venda). */
export function useInternalIfoodProductState({ initialState }: TUseInternalIfoodProductStateProps) {
	const initialStateHolder: TIfoodProductState = useMemo(() => {
		return {
			produto: {
				nome: initialState?.produto?.nome ?? "",
				descricao: initialState?.produto?.descricao ?? null,
				codigoExterno: initialState?.produto?.codigoExterno ?? null,
				imagemPath: initialState?.produto?.imagemPath ?? null,
				categoriaId: initialState?.produto?.categoriaId ?? null,
				preco: initialState?.produto?.preco ?? null,
				precoOriginal: initialState?.produto?.precoOriginal ?? null,
				status: initialState?.produto?.status ?? "AVAILABLE",
			},
		};
		// oxlint-disable-next-line react/exhaustive-deps -- Initialize state only once
	}, []);
	const [state, setState] = useState<TIfoodProductState>(initialStateHolder);

	const updateProduto = useCallback((produto: Partial<TIfoodProductState["produto"]>) => {
		setState((prev) => ({ ...prev, produto: { ...prev.produto, ...produto } }));
	}, []);

	const resetState = useCallback(() => {
		setState(initialStateHolder);
	}, [initialStateHolder]);

	const redefineState = useCallback((state: TIfoodProductState) => {
		setState(state);
	}, []);

	return {
		state,
		updateProduto,
		resetState,
		redefineState,
	};
}
export type TUseInternalIfoodProductState = ReturnType<typeof useInternalIfoodProductState>;
