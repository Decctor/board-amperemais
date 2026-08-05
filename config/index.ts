import type { TOrganizationDefaults, TOrganizationConfiguration } from "@/schemas/organizations";
import type { TUserPermissions } from "@/schemas/users";
import type { TOrganizationEntity } from "@/services/drizzle/schema";

export const SESSION_COOKIE_NAME = "syncrono-session";

export const DEFAULT_ORGANIZATION_OWNER_PERMISSIONS: TUserPermissions = {
	usuarios: {
		visualizar: true,
		criar: true,
		editar: true,
		excluir: true,
	},
	resultados: {
		escopo: null,
		visualizar: true,
		visualizarSensiveis: true,
		criarMetas: true,
		visualizarMetas: true,
		editarMetas: true,
		excluirMetas: true,
	},
	atendimentos: {
		iniciar: true,
		visualizar: true,
		responder: true,
		finalizar: true,
		receberTransferencias: true,
	},
	empresa: {
		visualizar: true,
		editar: true,
	},
	vendas: {
		visualizar: true,
		criar: true,
		editar: true,
		excluir: true,
	},
	compras: {
		visualizar: true,
		criar: true,
		editar: true,
		excluir: true,
	},
	fiscal: {
		visualizar: true,
		configurar: true,
		emitir: true,
		cancelar: true,
	},
	integracoes: {
		visualizar: true,
		gerenciar: true,
	},
};

export const DEFAULT_ORGANIZATION_RFM_CONFIG = {
	recencia: {
		"1": {
			max: 999,
			min: 271,
		},
		"2": {
			max: 270,
			min: 181,
		},
		"3": {
			max: 180,
			min: 91,
		},
		"4": {
			max: 90,
			min: 31,
		},
		"5": {
			max: 30,
			min: 0,
		},
	},
	monetario: {
		"1": {
			max: 100,
			min: 1,
		},
		"2": {
			max: 300,
			min: 101,
		},
		"3": {
			max: 750,
			min: 301,
		},
		"4": {
			max: 2000,
			min: 751,
		},
		"5": {
			max: 99999999,
			min: 2001,
		},
	},
	frequencia: {
		"1": {
			max: 1,
			min: 1,
		},
		"2": {
			max: 2,
			min: 2,
		},
		"3": {
			max: 5,
			min: 3,
		},
		"4": {
			max: 10,
			min: 6,
		},
		"5": {
			max: 999999,
			min: 11,
		},
	},
	identificador: "CONFIG_RFM" as const,
};

export const FREE_TRIAL_DURATION_DAYS = 15;

export type TAppSubscriptionPlanKey = "ESSENCIAL" | "CRESCIMENTO" | "ESCALA";

// Consultoria (add-on FDE): produto Stripe separado, adicionado como 2ª line-item no
// checkout. NÃO altera as capabilities do plano — apenas marca consultoriaAtiva +
// baselineInicio na organização. Disponível apenas no ciclo mensal.
export const CONSULTORIA_ADDON = {
	name: "Gestor de Crescimento",
	description: "A gente opera a plataforma por você: dados, campanhas e relatório de resultado.",
	monthlyPrice: 500,
	currency: "BRL",
	stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CONSULTORIA_MONTHLY_PRICE_ID as string,
};

export const DEFAULT_ORGANIZATION_CONFIGURATION_RESOURCES: TOrganizationConfiguration["recursos"] = {
	analytics: {
		acesso: true,
	},
	campanhas: {
		acesso: false,
		limiteAtivas: 0,
	},
	programasCashback: {
		acesso: true,
	},
	hubAtendimentos: {
		acesso: false,
		limiteAtendentes: 0,
	},
	integracoes: {
		acesso: false,
		limiteAtivas: 0,
	},
	iaAtendimento: {
		acesso: false,
		limiteCreditos: 0,
	},
	relatoriosWhatsapp: {
		acesso: false,
	},
	erp: {
		acesso: false,
	},
};

export const DEFAULT_ORGANIZATION_CONFIGURATION_PREFERENCES: TOrganizationConfiguration["preferencias"] = {
	rastreamentoEstoque: DEFAULT_ORGANIZATION_CONFIGURATION_RESOURCES.erp.acesso === true,
	limiteMensagensSemanaisViaCampanhas: null,
	sessoesVenda: {
		habilitado: false,
		obrigatorio: false,
		escopo: "OPERADOR",
		exigirFundoTroco: false,
		conferenciaCega: false,
		bloquearFechamentoComPendenciaFiscal: false,
	},
	carteirasClientes: {
		habilitado: false,
	},
	integracaoERP: {
		fulfillment: false,
		estoque: false,
		financeiro: false,
		fiscal: false,
	},
	contasAtendimento: {
		habilitado: false,
	},
};

const DEFAULT_PAYMENT_METHOD_CONFIGURATION: TOrganizationConfiguration["defaults"]["pagamentos"]["metodos"]["DINHEIRO"] = {
	suportado: false,
	contaFinanceiraPadraoId: null,
	contaFinanceiraPadraoKey: null,
	contaFinanceiraEditavel: false,
	efetivacaoTipoPadrao: "IMEDIATA",
	delayDiasPadrao: 0,
	parcelamento: {
		permitido: false,
		minParcelas: 0,
		maxParcelas: null,
		intervaloMeses: null,
	},
};

export const DEFAULT_ORGANIZATION_CONFIGURATION_DEFAULTS: TOrganizationDefaults = {
	contabilidade: {
		lancamentosPadrao: {
			vendas: {
				debitoContaId: null,
				debitoContaKey: null,
				creditoContaId: null,
				creditoContaKey: null,
			},
			compras: {
				debitoContaId: null,
				debitoContaKey: null,
				creditoContaId: null,
				creditoContaKey: null,
			},
			transferencias: {
				debitoContaId: null,
				debitoContaKey: null,
				creditoContaId: null,
				creditoContaKey: null,
			},
		},
	},
	pagamentos: {
		metodos: {
			DINHEIRO: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
			PIX: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
			CARTAO_DEBITO: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
			CARTAO_CREDITO: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
			BOLETO: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
			TRANSFERENCIA: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
			CASHBACK: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
			VALE: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
			A_DEFINIR: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION, efetivacaoTipoPadrao: "PENDENTE" },
			FIADO_NOTA: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION, efetivacaoTipoPadrao: "PENDENTE" },
			OUTRO: { ...DEFAULT_PAYMENT_METHOD_CONFIGURATION },
		},
	},
};

export const AppSubscriptionPlans: {
	[key in TAppSubscriptionPlanKey]: {
		name: string;
		description: string;
		badgeColor: string;
		badgeForeground: string;
		routes: {
			[key: string]: {
				accessible: boolean;
				redirectTo: string | null;
			};
		};
		capabilities: TOrganizationConfiguration["recursos"];
		pricingTableFeatures: {
			checked: boolean;
			label: string;
		}[];
		pricing: {
			monthly: {
				price: number;
				currency: string;
				interval: "month" | "year";
				stripePriceId: string;
			};
			yearly: {
				price: number;
				currency: string;
				interval: "month" | "year";
				stripePriceId: string;
			};
		};
		color: string;
	};
} = {
	ESSENCIAL: {
		name: "ESSENCIAL",
		description: "Comece hoje. Cashback + PDV em tablet + campanhas básicas. Sem integração obrigatória.",
		badgeColor: "hsl(357 100% 45%)",
		badgeForeground: "hsl(222.2 47.4% 11.2%)",
		routes: {
			dashboard: {
				accessible: false,
				redirectTo: "/dashboard/growth/cashback",
			},
			"/dashboard/sales": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/customers/segments": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/customers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/management/partners": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/catalog/products": {
				accessible: false,
				redirectTo: "/dashboard/catalog/products",
			},
			"/dashboard/growth/campaigns": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/growth/cashback": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/management/sellers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/management/goals": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/channels/whatsapp": {
				accessible: false,
				redirectTo: "/dashboard/growth/campaigns",
			},
			"/dashboard/settings": {
				accessible: true,
				redirectTo: null,
			},
		},
		capabilities: {
			analytics: {
				acesso: true,
			},
			campanhas: {
				acesso: true,
				limiteAtivas: 5,
			},
			programasCashback: {
				acesso: true,
			},
			hubAtendimentos: {
				acesso: false,
				limiteAtendentes: 0,
			},
			integracoes: {
				acesso: false,
				limiteAtivas: 0,
			},
			iaAtendimento: {
				acesso: false,
				limiteCreditos: 0,
			},
			relatoriosWhatsapp: {
				acesso: false,
			},
			erp: {
				acesso: false,
			},
		},
		pricingTableFeatures: [
			{
				checked: true,
				label: "Business Intelligence",
			},
			{
				checked: true,
				label: "Até 5 campanhas/jornadas ativas",
			},
			{
				checked: true,
				label: "Programas de cashback flexíveis",
			},
			{
				checked: true,
				label: "Ponto de Interação (tablet) para acumulação de cashback",
			},
		],
		pricing: {
			monthly: {
				price: 199.9,
				currency: "BRL",
				interval: "month",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESSENCIAL_MONTHLY_PLAN_PRICE_ID as string,
			},
			yearly: {
				price: 1919.9,
				currency: "BRL",
				interval: "year",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESSENCIAL_YEARLY_PLAN_PRICE_ID as string,
			},
		},
		color: "#E7000B",
	},
	CRESCIMENTO: {
		name: "CRESCIMENTO",
		description: "BI completo + IA que sugere ações + integração com ERP. O mais escolhido.",
		badgeColor: "hsl(216 62% 38%)",
		badgeForeground: "hsl(355.7 100% 97.3%)",
		routes: {
			dashboard: {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/sales": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/customers/segments": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/customers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/management/partners": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/catalog/products": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/growth/campaigns": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/growth/cashback": {
				accessible: true,
				redirectTo: "/dashboard/growth/cashback",
			},
			"/dashboard/management/sellers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/management/goals": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/channels/whatsapp": {
				accessible: false,
				redirectTo: "/dashboard/growth/campaigns",
			},
			"/dashboard/settings": {
				accessible: true,
				redirectTo: null,
			},
		},
		capabilities: {
			analytics: {
				acesso: true,
			},
			campanhas: {
				acesso: true,
				limiteAtivas: 10,
			},
			programasCashback: {
				acesso: true,
			},
			integracoes: {
				acesso: true,
				limiteAtivas: null,
			},
			relatoriosWhatsapp: {
				acesso: true,
			},
			hubAtendimentos: {
				acesso: false,
				limiteAtendentes: 0,
			},
			iaAtendimento: {
				acesso: true,
				limiteCreditos: null,
			},
			erp: {
				acesso: false,
			},
		},
		pricingTableFeatures: [
			{
				checked: true,
				label: "Business Intelligence completo (vendas, produtos, vendedores e parceiros)",
			},
			{
				checked: true,
				label: "Integrações com ERPs (sincronização de dados automática)",
			},
			{
				checked: true,
				label: "Até 10 campanhas/jornadas ativas",
			},
			{
				checked: true,
				label: "Programas de cashback flexíveis",
			},
			{
				checked: true,
				label: "Ponto de Interação personalizado para acumulação de cashback",
			},
			{
				checked: true,
				label: "Relatórios de vendas direto no seu WhatsApp",
			},
		],
		pricing: {
			monthly: {
				price: 399.9,
				currency: "BRL",
				interval: "month",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CRESCIMENTO_MONTHLY_PLAN_PRICE_ID as string,
			},
			yearly: {
				price: 3839.9,
				currency: "BRL",
				interval: "year",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CRESCIMENTO_YEARLY_PLAN_PRICE_ID as string,
			},
		},
		color: "#24549C",
	},
	ESCALA: {
		name: "ESCALA",
		description: "Tudo do Crescimento + Hub de atendimentos + IA que responde clientes 24/7.",
		badgeColor: "hsl(44 100% 50%)",
		badgeForeground: "hsl(210 40% 98%)",
		routes: {
			dashboard: {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/sales": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/customers/segments": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/customers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/management/partners": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/catalog/products": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/growth/campaigns": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/growth/cashback": {
				accessible: true,
				redirectTo: "/dashboard/growth/cashback",
			},
			"/dashboard/management/sellers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/management/goals": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/channels/whatsapp": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/settings": {
				accessible: true,
				redirectTo: null,
			},
		},
		capabilities: {
			analytics: {
				acesso: true,
			},
			campanhas: {
				acesso: true,
				limiteAtivas: null,
			},
			programasCashback: {
				acesso: true,
			},
			integracoes: {
				acesso: true,
				limiteAtivas: null,
			},
			relatoriosWhatsapp: {
				acesso: true,
			},
			hubAtendimentos: {
				acesso: true,
				limiteAtendentes: 5,
			},
			iaAtendimento: {
				acesso: true,
				limiteCreditos: null,
			},
			erp: {
				acesso: true,
			},
		},
		pricingTableFeatures: [
			{
				checked: true,
				label: "Business Intelligence completo (vendas, produtos, vendedores e parceiros)",
			},
			{
				checked: true,
				label: "Integrações com ERP (sincronização de dados automática)",
			},
			{
				checked: true,
				label: "Campanhas/jornadas ilimitadas (uso justo)",
			},
			{
				checked: true,
				label: "Programas de cashback flexíveis",
			},
			{
				checked: true,
				label: "Ponto de Interação personalizado para acumulação de cashback",
			},
			{
				checked: true,
				label: "Relatórios de vendas direto no seu WhatsApp",
			},
			{
				checked: true,
				label: "Hub de Atendimentos (até 10 atendentes)",
			},
			{
				checked: true,
				label: "Atendimento com IA",
			},
		],
		pricing: {
			monthly: {
				price: 899.9,
				currency: "BRL",
				interval: "month",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESCALA_MONTHLY_PLAN_PRICE_ID as string,
			},
			yearly: {
				price: 8639.9,
				currency: "BRL",
				interval: "year",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESCALA_YEARLY_PLAN_PRICE_ID as string,
			},
		},
		color: "#FFB900",
	},
};

// Plano comercializado hoje. A separação em três tiers está deprecada: o self-serve já vende
// apenas este plano (ver components/Subscription/PlanSelectionMenu.tsx) e os deals B2B seguem a
// mesma regra — o admin não escolhe tier ao fechar um deal. Os outros tiers seguem no config
// porque organizações antigas ainda os têm gravados em `assinaturaPlano` (capabilities/paywall).
export const DEAL_PLAN_KEY: TAppSubscriptionPlanKey = "CRESCIMENTO";

// Teto do mandato PIX Automático (Stripe), em centavos. Cobre o maior combo mensal
// possível — plano ESCALA + consultoria (Gestor de Crescimento) — para que upgrade,
// downgrade ou adição da consultoria nunca exijam reautorização do débito no banco.
// PIX Automático só se aplica ao ciclo mensal (payment_schedule "monthly").
export const PIX_MANDATE_MAX_AMOUNT_CENTS = Math.round((AppSubscriptionPlans.ESCALA.pricing.monthly.price + CONSULTORIA_ADDON.monthlyPrice) * 100);

export function getOrganizationAccessToRoute({ organizationPlan, path }: { organizationPlan: keyof typeof AppSubscriptionPlans; path: string }) {
	const plan = AppSubscriptionPlans[organizationPlan];
	const route = plan.routes[path as keyof typeof plan.routes];
	if (!route) return { access: false, redirectTo: "/" };
	if (!route.accessible) return { access: false, redirectTo: route.redirectTo || "/" };
	return { access: true, redirectTo: null };
}
// `as const` deriva TAppRoutePath, que faz o mapa de ícones (config/app-route-icons)
// ser verificado pelo compilador: rota nova sem ícone não compila.
export const AppRoutes = [
	{
		path: "/dashboard",
		title: "Dashboard",
		description: "Visão geral das principais métricas do seu negócio",
	},
	{
		path: "/dashboard/sales/point-of-interaction",
		title: "Ponto de Interação",
		description: "Painel de acompanhamento e gestão do seu ponto de interação.",
	},
	{
		path: "/dashboard/sales",
		title: "Vendas",
		description: "Listagem das vendas realizadas",
	},
	{
		path: "/dashboard/sales/new",
		title: "Nova Venda",
		description: "Cadastro de nova venda.",
	},
	{
		path: "/dashboard/sales/orders",
		title: "Pedidos",
		description: "Controle de pedidos realizados.",
	},
	{
		path: "/dashboard/operations/preparation",
		title: "Preparo",
		description: "Acompanhamento dos pedidos em preparo.",
	},
	{
		path: "/dashboard/approvals",
		title: "Aprovações",
		description: "Revisão e decisão de solicitações pendentes.",
	},
	{
		path: "/dashboard/sales/service-accounts",
		title: "Mesas & Comandas",
		description: "Contas abertas por mesa ou comanda, com as rodadas em andamento.",
	},
	{
		path: "/dashboard/sales/cash-sessions",
		title: "Caixa",
		description: "Abertura, conferência e fechamento das sessões de caixa.",
	},
	{
		path: "/dashboard/customers/segments",
		title: "Segmentações",
		description: "Visualização da matriz RFM de clientes.",
	},
	{
		path: "/dashboard/customers",
		title: "Clientes",
		description: "Painel detalhadado do seu portfólio de clientes.",
	},
	{
		path: "/dashboard/management/partners",
		title: "Parceiros",
		description: "Painel detalhadado dos seus parceiros comerciais.",
	},
	{
		path: "/dashboard/catalog/products",
		title: "Produtos",
		description: "Painel detalhadado dos seus produtos.",
	},
	{
		path: "/dashboard/growth/campaigns",
		title: "Campanhas",
		description: "Painel de acompanhamento e gestão das campanhas de vendas.",
	},
	{
		path: "/dashboard/growth/cashback",
		title: "Programas de Cashback",
		description: "Painel de acompanhamento e gestão do seu programa de cashback.",
	},
	{
		path: "/dashboard/growth/coupons",
		title: "Cupons",
		description: "Painel de acompanhamento e gestão dos cupons de desconto.",
	},
	{
		path: "/dashboard/catalog/store",
		title: "Loja Digital",
		description: "Painel de acompanhamento e gestão da sua loja digital.",
	},
	{
		path: "/dashboard/growth/audiences",
		title: "Públicos",
		description: "Painel de acompanhamento e gestão de públicos.",
	},
	{
		path: "/dashboard/channels/paid-media",
		title: "Marketing",
		description: "Painel de acompanhamento e gestão de marketing.",
	},
	{
		path: "/dashboard/integrations",
		title: "Integrações",
		description: "Conexões com ERPs e canais de venda do seu negócio.",
	},
	{
		path: "/dashboard/customers/portfolios",
		title: "Carteira de Clientes",
		description: "Quem abordar, o que oferecer e por quê — sua carteira do dia.",
	},
	{
		path: "/dashboard/management/sellers",
		title: "Vendedores",
		description: "Painel detalhadado dos seus vendedores.",
	},
	{
		path: "/dashboard/management/goals",
		title: "Metas",
		description: "Painel de acompanhamento e gestão das metas de vendas.",
	},
	{
		path: "/dashboard/channels/whatsapp",
		title: "Conversas",
		description: "Hub de atendimento com os clientes.",
	},
	{
		path: "/dashboard/production",
		title: "Produções",
		description: "Painel de acompanhamento e gestão das produções do seu negócio.",
	},
	{
		path: "/dashboard/inventory",
		title: "Estoque",
		description: "Visão operacional do estoque: saldo, movimentação e lotes ativos dos seus produtos.",
	},
	{
		path: "/dashboard/inventory/lots",
		title: "Lotes de Estoque",
		description: "Painel de acompanhamento e gestão dos lotes de estoque do seu negócio.",
	},
	{
		path: "/dashboard/finance",
		title: "Financeiro",
		description: "Visão geral das finanças do seu negócio.",
	},
	{
		path: "/dashboard/finance/entries",
		title: "Lançamentos",
		description: "Lançamentos contábeis do seu negócio.",
	},
	{
		path: "/dashboard/finance/transactions",
		title: "Movimentações",
		description: "Movimentações financeiras do seu negócio.",
	},
	{
		path: "/dashboard/finance/accounts",
		title: "Contas Financeiras",
		description: "Contas financeiras do seu negócio e seus saldos.",
	},
	{
		path: "/dashboard/finance/credit-cards",
		title: "Faturas de Cartão",
		description: "Faturas dos cartões de crédito do seu negócio.",
	},
	{
		path: "/dashboard/finance/reconciliation",
		title: "Conciliação",
		description: "Conciliação bancária das contas financeiras do seu negócio.",
	},
	{
		path: "/dashboard/finance/reports/income-statement",
		title: "DRE",
		description: "Demonstrativo gerencial do resultado do exercício por competência.",
	},
	{
		path: "/dashboard/finance/reports/cash-flow",
		title: "Fluxo de Caixa",
		description: "Posição consolidada de caixa, burn, runway e projeção diária.",
	},
	{
		path: "/dashboard/finance/reports/receivables-payables",
		title: "Recebíveis & Pagáveis",
		description: "Aging de vencimentos, atrasos médios, custos de fricção e liquidez.",
	},
	{
		path: "/dashboard/fiscal",
		title: "Fiscal",
		description: "Painel de acompanhamento e gestão do seu recursos fiscais.",
	},
	{
		path: "/dashboard/purchases",
		title: "Compras",
		description: "Painel de acompanhamento e gestão das compras do seu negócio.",
	},
	{
		path: "/dashboard/settings",
		title: "Configurações",
		description: "Configurações do seu negócio.",
	},
	{
		path: "/admin-dashboard",
		title: "Painel Admin",
		description: "Painel de administração do sistema.",
	},
	{
		path: "/admin-dashboard/partnerships",
		title: "Parcerias",
		description: "Gestão de parcerias da plataforma.",
	},
	{
		path: "/admin-dashboard/community",
		title: "Comunidade",
		description: "Painel de acompanhamento e gestão da comunidade RecompraCRM.",
	},
] as const;

export type TAppRoutePath = (typeof AppRoutes)[number]["path"];

export function getAppRouteTitle(path: string) {
	const route = AppRoutes.find((route) => route.path === path);
	return route?.title || "";
}
export function getAppRouteDescription(path: string) {
	const route = AppRoutes.find((route) => route.path === path);
	return route?.description || "";
}

export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 15;

type TCheckSubscriptionStatus = {
	stripeStatus: TOrganizationEntity["stripeSubscriptionStatus"];
	stripeStatusUltimaAlteracao: TOrganizationEntity["stripeSubscriptionStatusUltimaAlteracao"];
	trialPeriodStart: TOrganizationEntity["periodoTesteInicio"];
	trialPeriodEnd: TOrganizationEntity["periodoTesteFim"];
};
export function checkSubscriptionStatus({ stripeStatus, stripeStatusUltimaAlteracao, trialPeriodStart, trialPeriodEnd }: TCheckSubscriptionStatus) {
	if (stripeStatus === "active") return true;

	// past_due: allow access during grace period (15 days from status change)
	if (stripeStatus === "past_due") {
		if (!stripeStatusUltimaAlteracao) return true; // no timestamp = conservative, grant grace
		const daysSinceChange = Math.floor((Date.now() - new Date(stripeStatusUltimaAlteracao).getTime()) / (1000 * 60 * 60 * 24));
		return daysSinceChange < SUBSCRIPTION_GRACE_PERIOD_DAYS;
	}

	// Trial period: allow access during trial + grace period
	if (trialPeriodStart && trialPeriodEnd) {
		const now = new Date();
		const trialEnd = new Date(trialPeriodEnd);
		if (now < trialEnd) return true;
		// Grace period after trial ends
		const daysSinceTrialEnd = Math.floor((now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60 * 24));
		return daysSinceTrialEnd < SUBSCRIPTION_GRACE_PERIOD_DAYS;
	}

	return false;
}
