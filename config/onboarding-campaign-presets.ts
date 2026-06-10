import type { TOnboardingMessageTemplateKey } from "./onboarding-message-templates";
import type { TNewCampaignEntity } from "@/services/drizzle/schema";

/**
 * Onboarding campaign catalog. Each preset is parameterized by whether the merchant runs a cashback
 * program: when `cashbackAtivo` is false, the campaign generates no cashback (`cashbackGeracaoAtivo`
 * is false) and the campaigns step seeds the SEM_CASHBACK template variant. Presets flagged
 * `requiresCashback` only make sense with cashback on (e.g. the "expiring cashback" nudge) and are
 * hidden otherwise.
 */
export type TOnboardingCampaignPresetKey = "primeira-compra" | "segunda-compra" | "aniversario" | "recuperacao" | "cashback-expirando";

/** Fields the seed step injects: organizacaoId, autorId, whatsappTemplateId, whatsappConexaoTelefoneId. */
export type TOnboardingCampaignFields = Omit<
	TNewCampaignEntity,
	"id" | "organizacaoId" | "autorId" | "whatsappTemplateId" | "whatsappConexaoTelefoneId" | "dataInsercao"
>;

export type TOnboardingCampaignPreset = {
	key: TOnboardingCampaignPresetKey;
	titulo: string;
	descricao: string;
	gatilhoLabel: string;
	requiresCashback: boolean;
	defaultSelected: boolean;
	templateKey: TOnboardingMessageTemplateKey;
	segmentacoes: string[];
	buildCampaignFields: (cashbackAtivo: boolean) => TOnboardingCampaignFields;
};

const ALL_RFM_SEGMENTS = [
	"CAMPEÕES",
	"CLIENTES LEAIS",
	"POTENCIAIS CLIENTES LEAIS",
	"CLIENTES RECENTES",
	"PROMISSORES",
	"PRECISAM DE ATENÇÃO",
	"PRESTES A DORMIR",
	"EM RISCO",
	"NÃO PODE PERDÊ-LOS",
	"HIBERNANDO",
	"PERDIDOS",
];

const RECOVERY_SEGMENTS = ["PRECISAM DE ATENÇÃO", "PRESTES A DORMIR", "EM RISCO"];

/** Cashback generation block shared by presets that gift cashback when the program is on. */
function cashbackGiftFields(cashbackAtivo: boolean): Pick<
	TOnboardingCampaignFields,
	"cashbackGeracaoAtivo" | "cashbackGeracaoTipo" | "cashbackGeracaoValor" | "cashbackGeracaoExpiracaoMedida" | "cashbackGeracaoExpiracaoValor"
> {
	if (!cashbackAtivo) {
		return {
			cashbackGeracaoAtivo: false,
			cashbackGeracaoTipo: null,
			cashbackGeracaoValor: null,
			cashbackGeracaoExpiracaoMedida: null,
			cashbackGeracaoExpiracaoValor: null,
		};
	}
	return {
		cashbackGeracaoAtivo: true,
		cashbackGeracaoTipo: "FIXO",
		cashbackGeracaoValor: 15,
		cashbackGeracaoExpiracaoMedida: "DIAS",
		cashbackGeracaoExpiracaoValor: 10,
	};
}

/** Trigger-irrelevant fields left at their schema defaults / nulls, shared across presets. */
const SHARED_NULL_TRIGGERS = {
	gatilhoNovaCompraValorMinimo: null,
	gatilhoTempoPermanenciaMedida: null,
	gatilhoTempoPermanenciaValor: null,
	gatilhoNovoCashbackAcumuladoValorMinimo: null,
	gatilhoTotalCashbackAcumuladoValorMinimo: null,
	gatilhoCashbackExpirandoAntecedenciaValor: null,
	gatilhoCashbackExpirandoAntecedenciaMedida: null,
	gatilhoCashbackExpirandoValorMinimo: null,
	gatilhoQuantidadeTotalCompras: null,
	gatilhoValorTotalCompras: null,
	gatilhoUsoUnicoDataReferencia: null,
	recorrenciaTipo: null,
	recorrenciaIntervalo: null,
	recorrenciaDiasSemana: null,
	recorrenciaDiasMes: null,
	permitirRecorrencia: false,
	limiteEnviosSemanais: null,
	frequenciaIntervaloValor: 0,
	frequenciaIntervaloMedida: "DIAS",
	atribuicaoModelo: "LAST_TOUCH",
	atribuicaoJanelaDias: 14,
	execucaoAgendadaDirecao: "DEPOIS",
	filtros: null,
} satisfies Partial<TOnboardingCampaignFields>;

export const OnboardingCampaignPresets: TOnboardingCampaignPreset[] = [
	{
		key: "primeira-compra",
		titulo: "Boas-vindas na primeira compra",
		descricao: "Agradece e convida o cliente a voltar logo após a primeira compra.",
		gatilhoLabel: "Após a primeira compra",
		requiresCashback: false,
		defaultSelected: true,
		templateKey: "primeira_compra",
		segmentacoes: ALL_RFM_SEGMENTS,
		buildCampaignFields: (cashbackAtivo) => ({
			ativo: true,
			titulo: "Campanha Primeira Compra (RecompraCRM)",
			descricao: "Campanha sugerida para clientes que fizeram sua primeira compra.",
			gatilhoTipo: "PRIMEIRA-COMPRA",
			...SHARED_NULL_TRIGGERS,
			execucaoAgendadaMedida: "DIAS",
			execucaoAgendadaValor: 1,
			execucaoAgendadaBloco: "06:00",
			...cashbackGiftFields(cashbackAtivo),
		}),
	},
	{
		key: "segunda-compra",
		titulo: "Fidelização na segunda compra",
		descricao: "Reforça o relacionamento quando o cliente volta para a segunda compra.",
		gatilhoLabel: "Na 2ª compra do cliente",
		requiresCashback: false,
		defaultSelected: true,
		templateKey: "segunda_compra",
		segmentacoes: ALL_RFM_SEGMENTS,
		buildCampaignFields: (cashbackAtivo) => ({
			ativo: true,
			titulo: "Campanha Segunda Compra (RecompraCRM)",
			descricao: "Campanha sugerida para clientes que fizeram sua segunda compra.",
			gatilhoTipo: "QUANTIDADE-TOTAL-COMPRAS",
			...SHARED_NULL_TRIGGERS,
			gatilhoQuantidadeTotalCompras: 2,
			execucaoAgendadaMedida: "DIAS",
			execucaoAgendadaValor: 1,
			execucaoAgendadaBloco: "06:00",
			...cashbackGiftFields(cashbackAtivo),
		}),
	},
	{
		key: "aniversario",
		titulo: "Presente de aniversário",
		descricao: "Cria conexão enviando uma mensagem carinhosa no aniversário do cliente.",
		gatilhoLabel: "No aniversário do cliente",
		requiresCashback: false,
		defaultSelected: true,
		templateKey: "presente_aniversario",
		segmentacoes: ALL_RFM_SEGMENTS,
		buildCampaignFields: (cashbackAtivo) => ({
			ativo: true,
			titulo: "Campanha Presente de Aniversário (RecompraCRM)",
			descricao: "Campanha sugerida para conexão com clientes no aniversário.",
			gatilhoTipo: "ANIVERSARIO_CLIENTE",
			...SHARED_NULL_TRIGGERS,
			execucaoAgendadaMedida: "DIAS",
			execucaoAgendadaValor: 0,
			execucaoAgendadaBloco: "09:00",
			...cashbackGiftFields(cashbackAtivo),
		}),
	},
	{
		key: "recuperacao",
		titulo: "Recuperação de clientes",
		descricao: "Reativa clientes que entraram em segmentos de risco e estão sumindo.",
		gatilhoLabel: "Ao entrar em segmento de risco",
		requiresCashback: false,
		defaultSelected: true,
		templateKey: "recuperacao_clientes",
		segmentacoes: RECOVERY_SEGMENTS,
		buildCampaignFields: (cashbackAtivo) => ({
			ativo: true,
			titulo: "Campanha Recuperação de Clientes (RecompraCRM)",
			descricao: "Campanha sugerida para recuperar clientes inativos.",
			gatilhoTipo: "ENTRADA-SEGMENTAÇÃO",
			...SHARED_NULL_TRIGGERS,
			execucaoAgendadaMedida: "DIAS",
			execucaoAgendadaValor: 0,
			execucaoAgendadaBloco: "09:00",
			...cashbackGiftFields(cashbackAtivo),
		}),
	},
	{
		key: "cashback-expirando",
		titulo: "Cashback prestes a expirar",
		descricao: "Avisa o cliente quando o cashback está perto de expirar para trazê-lo de volta.",
		gatilhoLabel: "Antes do cashback expirar",
		requiresCashback: true,
		defaultSelected: true,
		templateKey: "cashback_expirando",
		segmentacoes: ALL_RFM_SEGMENTS,
		buildCampaignFields: () => ({
			ativo: true,
			titulo: "Campanha Cashback Expirando (RecompraCRM)",
			descricao: "Campanha sugerida para avisar sobre cashback prestes a expirar.",
			gatilhoTipo: "CASHBACK-EXPIRANDO",
			...SHARED_NULL_TRIGGERS,
			gatilhoCashbackExpirandoAntecedenciaValor: 3,
			gatilhoCashbackExpirandoAntecedenciaMedida: "DIAS",
			execucaoAgendadaMedida: "DIAS",
			execucaoAgendadaValor: 0,
			execucaoAgendadaBloco: "09:00",
			// Always cashback-on (requiresCashback); never seeded otherwise.
			cashbackGeracaoAtivo: false,
			cashbackGeracaoTipo: null,
			cashbackGeracaoValor: null,
			cashbackGeracaoExpiracaoMedida: null,
			cashbackGeracaoExpiracaoValor: null,
		}),
	},
];

export const OnboardingCampaignPresetsByKey = new Map(OnboardingCampaignPresets.map((preset) => [preset.key, preset]));

/** Presets available for the given cashback choice (hides cashback-only presets when off). */
export function getAvailableCampaignPresets(cashbackAtivo: boolean): TOnboardingCampaignPreset[] {
	return OnboardingCampaignPresets.filter((preset) => cashbackAtivo || !preset.requiresCashback);
}
