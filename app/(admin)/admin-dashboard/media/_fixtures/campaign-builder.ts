import type { TCampaignState } from "@/schemas/campaigns";
import type { TMessageTemplatePhoneStatusEnum } from "@/schemas/enums";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";

/**
 * Campanha fictícia usada pelas cópias estáticas do construtor
 * (/admin-dashboard/media, aba "Construtor de campanha").
 *
 * Tipada como `TCampaignState` de propósito: se o schema da campanha mudar, isso
 * quebra no TypeScript em vez de gerar um print de uma tela que não existe mais.
 *
 * A campanha escolhida é a de cashback expirando — ela acende quase todos os
 * campos do construtor (gatilho com config própria, cashback, cupom, filtros),
 * então rende as peças mais completas.
 */
export const STATIC_CAMPAIGN_STATE: TCampaignState = {
	campaign: {
		ativo: true,
		titulo: "Cashback expirando em 7 dias",
		descricao: "Avisa o cliente antes do saldo virar pó e traz ele de volta à loja dentro da semana.",
		gatilhoTipo: "CASHBACK-EXPIRANDO",
		gatilhoCashbackExpirandoAntecedenciaValor: 7,
		gatilhoCashbackExpirandoAntecedenciaMedida: "DIAS",
		gatilhoCashbackExpirandoValorMinimo: 20,
		recorrenciaTipo: null,
		recorrenciaIntervalo: 1,
		recorrenciaDiasSemana: null,
		recorrenciaDiasMes: null,
		gatilhoUsoUnicoDataReferencia: null,
		// "HORAS" existe no enum, mas `TimeDurationUnitsOptions` só oferece DIAS/SEMANAS/MESES/ANOS —
		// um valor fora da lista faz o SelectInput cair no placeholder.
		execucaoAgendadaMedida: "DIAS",
		execucaoAgendadaValor: 1,
		execucaoAgendadaDirecao: "DEPOIS",
		execucaoAgendadaBloco: "09:00",
		whatsappTemplateId: "tpl-cashback-expirando",
		whatsappConexaoTelefoneId: "phone-loja-centro",
		permitirRecorrencia: true,
		frequenciaIntervaloValor: 30,
		frequenciaIntervaloMedida: "DIAS",
		atribuicaoModelo: "LAST_TOUCH",
		atribuicaoJanelaDias: 7,
		cashbackGeracaoAtivo: true,
		cashbackGeracaoTipo: "FIXO",
		cashbackGeracaoValor: 15,
		cashbackGeracaoExpiracaoMedida: "DIAS",
		cashbackGeracaoExpiracaoValor: 30,
		cupomGeracaoAtivo: true,
		cupomGeracaoCupomId: "cup-volta-logo",
		cupomGeracaoExpiracaoMedida: "DIAS",
		cupomGeracaoExpiracaoValor: 15,
	},
	segmentations: [{ segmentacao: "EM RISCO" }, { segmentacao: "NÃO PODE PERDÊ-LOS" }, { segmentacao: "PRESTES A DORMIR" }],
	filtros: {
		tipo: "GRUPO",
		operador: "AND",
		itens: [
			{
				tipo: "CONDICAO",
				condicao: {
					id: "flt-localizacao",
					tipo: "LOCALIZAÇÃO",
					configuracao: {
						estados: ["MG", "SP"],
						cidades: ["Belo Horizonte", "Contagem", "Campinas"],
						bairros: [],
					},
				},
			},
			{
				tipo: "CONDICAO",
				condicao: {
					id: "flt-top-compradores",
					tipo: "TOP_COMPRADORES_PRODUTO",
					configuracao: {
						produtoId: "prd-cafe-especial-1kg",
						janela: "90_DIAS",
						top: 200,
					},
				},
			},
		],
	},
};

/** Nada é editável nas cópias estáticas — todo updater vira no-op. */
const noop = () => {};

/**
 * Mesmo formato que `useCampaignState()` retorna, só que congelado. As cópias
 * estáticas trocam a chamada do hook por esta constante e mantêm o corpo do
 * componente idêntico ao original.
 */
export const STATIC_BUILDER_CAMPAIGN: TUseCampaignState = {
	state: STATIC_CAMPAIGN_STATE,
	updateCampaign: noop,
	addSegmentation: noop,
	updateSegmentation: noop,
	deleteSegmentation: noop,
	updateFiltersRoot: noop,
	addFilterCondition: noop,
	updateFilterCondition: noop,
	addFilterGroup: noop,
	updateFilterGroupOperator: noop,
	removeFilterNode: noop,
	resetFilters: noop,
	resetState: noop,
	redefineState: noop,
};

/** Organização fictícia — o bloco de Ação precisa dela para os previews de template. */
export const STATIC_ORGANIZATION = {
	id: "org-demo-recompra",
	nome: "Mercado Bom Preço",
	logoUrl: null,
};

/** Telefones de WhatsApp conectados, no formato que o SelectInput do bloco de Ação espera. */
export const STATIC_WHATSAPP_PHONES = [
	{ id: "phone-loja-centro", label: "(31 99123-4567) - Loja Centro", value: "phone-loja-centro" },
	{ id: "phone-loja-shopping", label: "(31 99876-5432) - Loja Shopping", value: "phone-loja-shopping" },
];

/** Templates de mensagem compatíveis com o gatilho da campanha fictícia. */
export const STATIC_MESSAGE_TEMPLATES: { id: string; nome: string; statusGeral: TMessageTemplatePhoneStatusEnum }[] = [
	{ id: "tpl-cashback-expirando", nome: "Cashback expirando — 7 dias", statusGeral: "APROVADO" },
	{ id: "tpl-cashback-ultima-chance", nome: "Cashback — última chance", statusGeral: "APROVADO" },
	{ id: "tpl-volte-sempre", nome: "Volte sempre — genérico", statusGeral: "PENDENTE" },
];

/** Templates escondidos por incompatibilidade de variáveis com o gatilho. */
export const STATIC_HIDDEN_TEMPLATES = [
	{ id: "tpl-aniversario", nome: "Aniversário do cliente", incompatibleVariables: ["nome_aniversariante", "idade"] },
	{ id: "tpl-primeira-compra", nome: "Boas-vindas primeira compra", incompatibleVariables: ["valor_primeira_compra"] },
];

/** Cupons individuais ativos, para o bloco de geração de cupom. */
export const STATIC_COUPONS = [
	{ id: "cup-volta-logo", codigo: "VOLTALOGO10", titulo: "10% na próxima compra", escopo: "INDIVIDUAL" as const },
	{ id: "cup-frete-gratis", codigo: "FRETEGRATIS", titulo: "Frete grátis acima de R$ 80", escopo: "INDIVIDUAL" as const },
];

/** Contagem de clientes por segmentação RFM, exibida nas pílulas do público. */
export const STATIC_SEGMENT_AUDIENCE: Record<string, number> = {
	CAMPEÕES: 1284,
	"CLIENTES LEAIS": 2140,
	"POTENCIAIS CLIENTES LEAIS": 1876,
	"CLIENTES RECENTES": 940,
	PROMISSORES: 1120,
	"PRECISAM DE ATENÇÃO": 1685,
	"PRESTES A DORMIR": 1342,
	"EM RISCO": 2418,
	"NÃO PODE PERDÊ-LOS": 806,
	HIBERNANDO: 3271,
	PERDIDOS: 4102,
};

/** Total da prévia de audiência mostrada no rodapé do bloco de filtros. */
export const STATIC_AUDIENCE_TOTAL = 4909;

/** Nomes de produto para o resumo do filtro "top compradores". */
export const STATIC_PRODUCT_NAMES: Record<string, string> = {
	"prd-cafe-especial-1kg": "Café Especial Torrado e Moído 1kg",
};
