import type {
	TWhatsappTemplateBodyParameter,
	TWhatsappTemplateButton,
	TWhatsappTemplateComponents,
	TWhatsappTemplateState,
} from "@/schemas/whatsapp-templates";
import { useState } from "react";

type WhatsappTemplateActions = {
	updateTemplate: (update: Partial<TWhatsappTemplateState["whatsappTemplate"]>) => void;
	updateComponents: (update: Partial<TWhatsappTemplateComponents>) => void;
	updateBodyParameters: (parameters: TWhatsappTemplateBodyParameter[]) => void;
	addBodyParameter: (parameter: TWhatsappTemplateBodyParameter) => void;
	removeBodyParameter: (index: number) => void;
	updateButton: (index: number, button: TWhatsappTemplateButton) => void;
	addButton: (button: TWhatsappTemplateButton) => void;
	removeButton: (index: number) => void;
	redefineState: (newState: TWhatsappTemplateState) => void;
	resetState: () => void;
};

type UseWhatsappTemplateStateProps = {
	initialState?: Partial<TWhatsappTemplateState>;
};

export const useWhatsappTemplateState = ({ initialState }: UseWhatsappTemplateStateProps) => {
	const [state, setState] = useState<TWhatsappTemplateState>({
		whatsappTemplate: initialState?.whatsappTemplate || {
			nome: "",
			categoria: "MARKETING",
			componentes: {
				cabecalho: null,
				corpo: {
					conteudo: "",
					parametros: [],
				},
				rodape: null,
				botoes: null,
			},
		},
	});

	function updateTemplate(changes: Partial<TWhatsappTemplateState["whatsappTemplate"]>) {
		return setState((prev) => ({ ...prev, whatsappTemplate: { ...prev.whatsappTemplate, ...changes } as TWhatsappTemplateState["whatsappTemplate"] }));
	}

	function updateComponents(changes: Partial<TWhatsappTemplateState["whatsappTemplate"]["componentes"]>) {
		return setState((prev) => ({
			...prev,
			whatsappTemplate: {
				...prev.whatsappTemplate,
				componentes: { ...prev.whatsappTemplate.componentes, ...changes } as TWhatsappTemplateState["whatsappTemplate"]["componentes"],
			},
		}));
	}

	function updateBodyParameters(parameters: TWhatsappTemplateBodyParameter[]) {
		return setState((prev) => ({
			...prev,
			whatsappTemplate: {
				...prev.whatsappTemplate,
				componentes: { ...prev.whatsappTemplate.componentes, corpo: { ...prev.whatsappTemplate.componentes.corpo, parametros: parameters } },
			},
		}));
	}

	function addBodyParameter(parameter: TWhatsappTemplateBodyParameter) {
		return setState((prev) => ({
			...prev,
			whatsappTemplate: {
				...prev.whatsappTemplate,
				componentes: {
					...prev.whatsappTemplate.componentes,
					corpo: {
						...prev.whatsappTemplate.componentes.corpo,
						parametros: [...prev.whatsappTemplate.componentes.corpo.parametros, parameter] as TWhatsappTemplateBodyParameter[],
					},
				},
			},
		}));
	}

	function removeBodyParameter(index: number) {
		return setState((prev) => ({
			...prev,
			whatsappTemplate: {
				...prev.whatsappTemplate,
				componentes: {
					...prev.whatsappTemplate.componentes,
					corpo: {
						...prev.whatsappTemplate.componentes.corpo,
						parametros: prev.whatsappTemplate.componentes.corpo.parametros.filter((_, i) => i !== index) as TWhatsappTemplateBodyParameter[],
					},
				},
			},
		}));
	}

	function updateButton(index: number, button: TWhatsappTemplateButton) {
		return setState((prev) => ({
			...prev,
			whatsappTemplate: {
				...prev.whatsappTemplate,
				componentes: {
					...prev.whatsappTemplate.componentes,
					botoes: prev.whatsappTemplate.componentes.botoes?.map((b, i) => (i === index ? button : b)) as TWhatsappTemplateButton[],
				},
			},
		}));
	}

	function addButton(button: TWhatsappTemplateButton) {
		return setState((prev) => ({
			...prev,
			whatsappTemplate: {
				...prev.whatsappTemplate,
				componentes: {
					...prev.whatsappTemplate.componentes,
					botoes: [...(prev.whatsappTemplate.componentes.botoes || []), button] as TWhatsappTemplateButton[],
				},
			},
		}));
	}

	function removeButton(index: number) {
		return setState((prev) => ({
			...prev,
			whatsappTemplate: {
				...prev.whatsappTemplate,
				componentes: {
					...prev.whatsappTemplate.componentes,
					botoes: prev.whatsappTemplate.componentes.botoes?.filter((_, i) => i !== index) as TWhatsappTemplateButton[],
				},
			},
		}));
	}

	function resetState() {
		return setState({
			whatsappTemplate: {
				nome: "",
				categoria: "UTILIDADE",
				componentes: {
					cabecalho: null,
					corpo: {
						conteudo: "",
						parametros: [],
					},
					rodape: null,
					botoes: null,
				},
			},
		});
	}
	function redefineState(state: TWhatsappTemplateState) {
		return setState(state);
	}

	return {
		state,
		updateTemplate,
		updateComponents,
		updateBodyParameters,
		addBodyParameter,
		removeBodyParameter,
		updateButton,
		addButton,
		removeButton,
		redefineState,
		resetState,
	};
};
export type TUseWhatsappTemplateState = ReturnType<typeof useWhatsappTemplateState>;
