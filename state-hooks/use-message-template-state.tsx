import type {
	TMessageTemplateState,
	TMessageTemplateStateVersion,
} from "@/schemas/message-templates";
import type { TWhatsappTemplateBodyParameter, TWhatsappTemplateButton, TWhatsappTemplateComponents } from "@/schemas/whatsapp-templates";
import { useCallback, useState } from "react";

const DEFAULT_VERSION: TMessageTemplateStateVersion = {
	categoria: "MARKETING",
	componentes: {
		cabecalho: null,
		corpo: { conteudo: "", parametros: [] },
		rodape: null,
		botoes: null,
	},
};

const DEFAULT_STATE: TMessageTemplateState = {
	grupo: { nome: "" },
	versoes: [{ ...DEFAULT_VERSION }],
};

type UseMessageTemplateStateProps = {
	initialState?: Partial<TMessageTemplateState>;
};

export function useMessageTemplateState({ initialState }: UseMessageTemplateStateProps = {}) {
	const [state, setState] = useState<TMessageTemplateState>({
		grupo: initialState?.grupo ?? DEFAULT_STATE.grupo,
		versoes: initialState?.versoes ?? DEFAULT_STATE.versoes,
	});

	// ─── Group-level ──────────────────────────────────────────────────────────

	const updateGrupo = useCallback((changes: Partial<TMessageTemplateState["grupo"]>) => {
		setState((prev) => ({ ...prev, grupo: { ...prev.grupo, ...changes } }));
	}, []);

	// ─── Version-level ────────────────────────────────────────────────────────

	const addVersion = useCallback((version: TMessageTemplateStateVersion = { ...DEFAULT_VERSION }) => {
		setState((prev) => ({ ...prev, versoes: [...prev.versoes, version] }));
	}, []);

	const removeVersion = useCallback((index: number) => {
		setState((prev) => ({ ...prev, versoes: prev.versoes.filter((_, i) => i !== index) }));
	}, []);

	const updateVersion = useCallback((index: number, changes: Partial<TMessageTemplateStateVersion>) => {
		setState((prev) => ({
			...prev,
			versoes: prev.versoes.map((v, i) => (i === index ? { ...v, ...changes } : v)),
		}));
	}, []);

	const updateVersionComponents = useCallback((index: number, changes: Partial<TWhatsappTemplateComponents>) => {
		setState((prev) => ({
			...prev,
			versoes: prev.versoes.map((v, i) =>
				i === index ? { ...v, componentes: { ...v.componentes, ...changes } as TWhatsappTemplateComponents } : v,
			),
		}));
	}, []);

	const updateVersionBodyParameters = useCallback((index: number, parameters: TWhatsappTemplateBodyParameter[]) => {
		setState((prev) => ({
			...prev,
			versoes: prev.versoes.map((v, i) =>
				i === index ? { ...v, componentes: { ...v.componentes, corpo: { ...v.componentes.corpo, parametros: parameters } } } : v,
			),
		}));
	}, []);

	const addVersionButton = useCallback((index: number, button: TWhatsappTemplateButton) => {
		setState((prev) => ({
			...prev,
			versoes: prev.versoes.map((v, i) =>
				i === index
					? { ...v, componentes: { ...v.componentes, botoes: [...(v.componentes.botoes ?? []), button] as TWhatsappTemplateButton[] } }
					: v,
			),
		}));
	}, []);

	const removeVersionButton = useCallback((versionIndex: number, buttonIndex: number) => {
		setState((prev) => ({
			...prev,
			versoes: prev.versoes.map((v, i) =>
				i === versionIndex
					? {
							...v,
							componentes: {
								...v.componentes,
								botoes: v.componentes.botoes?.filter((_, bi) => bi !== buttonIndex) as TWhatsappTemplateButton[],
							},
						}
					: v,
			),
		}));
	}, []);

	// ─── Global ───────────────────────────────────────────────────────────────

	const redefineState = useCallback((newState: TMessageTemplateState) => {
		setState(newState);
	}, []);

	const resetState = useCallback(() => {
		setState(DEFAULT_STATE);
	}, []);

	return {
		state,
		updateGrupo,
		addVersion,
		removeVersion,
		updateVersion,
		updateVersionComponents,
		updateVersionBodyParameters,
		addVersionButton,
		removeVersionButton,
		redefineState,
		resetState,
	};
}

export type TUseMessageTemplateState = ReturnType<typeof useMessageTemplateState>;
