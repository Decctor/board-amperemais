import { IfoodCatalogContextEnum, IfoodCatalogStatusEnum, IfoodOptionGroupTypeEnum } from "@/schemas/enums";
import { useCallback, useMemo, useState } from "react";
import z from "zod";

const IfoodOptionStateSchema = z.object({
	id: z.string().nullable(),
	produtoId: z.string().nullable(),
	nome: z.string(),
	preco: z.number().nullable(),
	codigoExterno: z.string().nullable(),
	status: IfoodCatalogStatusEnum,
});

const IfoodOptionGroupStateSchema = z.object({
	id: z.string().nullable(),
	nome: z.string(),
	tipo: IfoodOptionGroupTypeEnum,
	min: z.number(),
	max: z.number(),
	opcoes: z.array(IfoodOptionStateSchema),
});
export type TIfoodOptionGroupState = z.infer<typeof IfoodOptionGroupStateSchema>;
export type TIfoodOptionState = z.infer<typeof IfoodOptionStateSchema>;

// Um canal existe sempre no estado, mesmo sem sobrescrita: a UI precisa das três linhas para o
// usuário ver o que herda. `preco`/`status` nulos = herda a raiz do item.
const IfoodChannelStateSchema = z.object({
	contexto: IfoodCatalogContextEnum,
	preco: z.number().nullable(),
	status: IfoodCatalogStatusEnum.nullable(),
	codigoExterno: z.string().nullable(),
});
export type TIfoodChannelState = z.infer<typeof IfoodChannelStateSchema>;

export function buildDefaultChannels(): TIfoodChannelState[] {
	return IfoodCatalogContextEnum.options.map((contexto) => ({ contexto, preco: null, status: null, codigoExterno: null }));
}

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
		status: IfoodCatalogStatusEnum,
	}),
	gruposComplementos: z.array(IfoodOptionGroupStateSchema),
	canais: z.array(IfoodChannelStateSchema),
});
type TIfoodProductState = z.infer<typeof IfoodProductStateSchema>;

type TUseInternalIfoodProductStateProps = {
	initialState?: {
		produto?: Partial<TIfoodProductState["produto"]>;
		gruposComplementos?: TIfoodOptionGroupState[];
		canais?: TIfoodChannelState[];
	};
};

/** Grupo novo nasce opcional de 1 escolha — a configuração mais comum e a menos capaz de quebrar. */
function buildEmptyOptionGroup(): TIfoodOptionGroupState {
	return { id: null, nome: "", tipo: "OFFER_UNIT", min: 0, max: 1, opcoes: [] };
}

function buildEmptyOption(): TIfoodOptionState {
	return { id: null, produtoId: null, nome: "", preco: null, codigoExterno: null, status: "AVAILABLE" };
}

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
			gruposComplementos: initialState?.gruposComplementos ?? [],
			canais: initialState?.canais ?? buildDefaultChannels(),
		};
		// oxlint-disable-next-line react/exhaustive-deps -- Initialize state only once
	}, []);
	const [state, setState] = useState<TIfoodProductState>(initialStateHolder);

	const updateProduto = useCallback((produto: Partial<TIfoodProductState["produto"]>) => {
		setState((prev) => ({ ...prev, produto: { ...prev.produto, ...produto } }));
	}, []);

	const addGrupoComplemento = useCallback(() => {
		setState((prev) => ({ ...prev, gruposComplementos: [...prev.gruposComplementos, buildEmptyOptionGroup()] }));
	}, []);

	const updateGrupoComplemento = useCallback((indice: number, grupo: Partial<TIfoodOptionGroupState>) => {
		setState((prev) => ({
			...prev,
			gruposComplementos: prev.gruposComplementos.map((atual, i) => (i === indice ? { ...atual, ...grupo } : atual)),
		}));
	}, []);

	const removeGrupoComplemento = useCallback((indice: number) => {
		setState((prev) => ({ ...prev, gruposComplementos: prev.gruposComplementos.filter((_, i) => i !== indice) }));
	}, []);

	const addOpcao = useCallback((indiceGrupo: number) => {
		setState((prev) => ({
			...prev,
			gruposComplementos: prev.gruposComplementos.map((grupo, i) =>
				i === indiceGrupo ? { ...grupo, opcoes: [...grupo.opcoes, buildEmptyOption()] } : grupo,
			),
		}));
	}, []);

	const updateOpcao = useCallback((indiceGrupo: number, indiceOpcao: number, opcao: Partial<TIfoodOptionState>) => {
		setState((prev) => ({
			...prev,
			gruposComplementos: prev.gruposComplementos.map((grupo, i) =>
				i === indiceGrupo ? { ...grupo, opcoes: grupo.opcoes.map((atual, j) => (j === indiceOpcao ? { ...atual, ...opcao } : atual)) } : grupo,
			),
		}));
	}, []);

	const removeOpcao = useCallback((indiceGrupo: number, indiceOpcao: number) => {
		setState((prev) => ({
			...prev,
			gruposComplementos: prev.gruposComplementos.map((grupo, i) =>
				i === indiceGrupo ? { ...grupo, opcoes: grupo.opcoes.filter((_, j) => j !== indiceOpcao) } : grupo,
			),
		}));
	}, []);

	const updateCanal = useCallback((contexto: TIfoodChannelState["contexto"], canal: Partial<TIfoodChannelState>) => {
		setState((prev) => ({
			...prev,
			canais: prev.canais.map((atual) => (atual.contexto === contexto ? { ...atual, ...canal } : atual)),
		}));
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
		addGrupoComplemento,
		updateGrupoComplemento,
		removeGrupoComplemento,
		addOpcao,
		updateOpcao,
		removeOpcao,
		updateCanal,
		resetState,
		redefineState,
	};
}
export type TUseInternalIfoodProductState = ReturnType<typeof useInternalIfoodProductState>;
