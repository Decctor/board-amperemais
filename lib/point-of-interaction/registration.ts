import type { TCustomFieldOption } from "@/schemas/custom-fields";
import type { TCustomFieldTypeEnum, TPoiRegistrationFlowEnum } from "@/schemas/enums";
import type { TOrganizationPoiConfig, TPoiRegistrationSurfaceConfig } from "@/schemas/organizations";

/** As duas superfícies do POI. Espelha as chaves de `poiConfiguracao.cadastro`. */
export type TPoiInterfaceMode = "kiosk" | "mobile";

/**
 * Cadastro rápido, sem campos: o comportamento que o POI sempre teve. É o que vale para toda
 * organização que nunca configurou `poiConfiguracao.cadastro` — por isso a ausência da chave não
 * exige backfill nem muda nada em produção.
 */
export const DEFAULT_POI_REGISTRATION_SURFACE_CONFIG: TPoiRegistrationSurfaceConfig = { fluxo: "RAPIDO", campos: [] };

/**
 * Lê a configuração de cadastro de uma superfície do POI, com o default RÁPIDO/sem campos.
 *
 * Tolerante a jsonb parcial de propósito: a coluna é escrita por versões diferentes do app ao
 * longo do tempo, e um `cadastro` gravado sem `campos` não pode derrubar o ponto de interação.
 */
export function resolvePoiRegistrationConfig(
	poiConfiguracao: TOrganizationPoiConfig | null | undefined,
	interfaceMode: TPoiInterfaceMode,
): TPoiRegistrationSurfaceConfig {
	const surfaceConfig = poiConfiguracao?.cadastro?.[interfaceMode];
	if (!surfaceConfig) return { ...DEFAULT_POI_REGISTRATION_SURFACE_CONFIG };
	return {
		fluxo: surfaceConfig.fluxo ?? DEFAULT_POI_REGISTRATION_SURFACE_CONFIG.fluxo,
		campos: surfaceConfig.campos ?? [],
	};
}

/**
 * Um passo do assistente de cadastro: a definição do campo (o que a organização coleta) fundida
 * com a política local da superfície (`obrigatorio`). É o que o wizard público consome — ele nunca
 * precisa conhecer `custom_fields` nem o jsonb da organização.
 */
export type TPoiRegistrationFieldDefinition = {
	campoId: string;
	obrigatorio: boolean;
	chaveNativa: string | null;
	titulo: string;
	descricao: string | null;
	tipo: TCustomFieldTypeEnum;
	opcoes: TCustomFieldOption[] | null;
};

/** Contrato entregue à superfície pública do POI: o fluxo e os passos já ordenados. */
export type TPoiRegistrationConfig = {
	fluxo: TPoiRegistrationFlowEnum;
	campos: TPoiRegistrationFieldDefinition[];
};

/** A definição de campo, como o servidor a lê de `custom_fields` — só o que o assistente usa. */
type TPoiRegistrationFieldSource = {
	id: string;
	chaveNativa: string | null;
	titulo: string;
	descricao: string | null;
	tipo: TCustomFieldTypeEnum;
	opcoes: TCustomFieldOption[] | null;
};

type BuildPoiRegistrationConfigParams = {
	poiConfiguracao: TOrganizationPoiConfig | null | undefined;
	interfaceMode: TPoiInterfaceMode;
	/** Campos CLIENTE ATIVOS da organização. A ordem aqui é irrelevante — a config manda. */
	customFields: TPoiRegistrationFieldSource[];
};

/**
 * Junta a configuração da superfície com as definições dos campos, preservando a ordem do array
 * `campos` (que é a ordem dos passos).
 *
 * Campos configurados que não estão mais na lista de ativos são silenciosamente descartados: uma
 * definição desativada não deve travar o cadastro do cliente no balcão. A tela de configurações é
 * onde essa divergência fica visível e é corrigida.
 */
export function buildPoiRegistrationConfig({
	poiConfiguracao,
	interfaceMode,
	customFields,
}: BuildPoiRegistrationConfigParams): TPoiRegistrationConfig {
	const surfaceConfig = resolvePoiRegistrationConfig(poiConfiguracao, interfaceMode);
	if (surfaceConfig.fluxo !== "COMPLETO") return { fluxo: surfaceConfig.fluxo, campos: [] };

	const customFieldsById = new Map(customFields.map((customField) => [customField.id, customField]));

	const campos: TPoiRegistrationFieldDefinition[] = [];
	for (const configuredField of surfaceConfig.campos) {
		const definition = customFieldsById.get(configuredField.campoId);
		if (!definition) continue;
		campos.push({
			campoId: definition.id,
			obrigatorio: configuredField.obrigatorio ?? false,
			chaveNativa: definition.chaveNativa,
			titulo: definition.titulo,
			descricao: definition.descricao,
			tipo: definition.tipo,
			opcoes: definition.opcoes,
		});
	}

	return { fluxo: surfaceConfig.fluxo, campos };
}
