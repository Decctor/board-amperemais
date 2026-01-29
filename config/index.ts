export const SESSION_COOKIE_NAME = "syncrono-session";

export const FREE_TRIAL_DURATION_DAYS = 15;

export type TAppSubscriptionPlanKey = "ESSENCIAL" | "CRESCIMENTO" | "ESCALA";

export type TAppSubscriptionPlanCapabilities = {
	features: {
		biLite: boolean;
		biCompleto: boolean;
		cashbackEPoi: boolean;
		campanhas: boolean;
		aiHints: boolean;
		relatoriosVendasWhatsapp: boolean;
		whatsappHub: boolean;
		whatsappHubIa: boolean;
	};
	limits: {
		/**
		 * Número máximo de campanhas/jornadas ativas simultâneas.
		 * null = ilimitado
		 */
		maxCampanhasAtivas: number | null;
		/**
		 * Créditos de AI-Hints por mês.
		 * 0 = não incluso
		 */
		aiHintsPorMes: number;
		/**
		 * Quantidade máxima de números conectados no WhatsApp Hub.
		 * 0 = não incluso
		 * null = ilimitado (uso justo)
		 */
		hubMaxNumeros: number | null;
		/**
		 * Quantidade máxima de atendentes (assentos) no WhatsApp Hub.
		 * 0 = não incluso
		 * null = ilimitado (uso justo)
		 */
		hubMaxAtendentes: number | null;
	};
};

export const AppSubscriptionPlans: {
	[key in TAppSubscriptionPlanKey]: {
		name: string;
		description: string;
		routes: {
			[key: string]: {
				accessible: boolean;
				redirectTo: string | null;
			};
		};
		capabilities: TAppSubscriptionPlanCapabilities;
		stripeProdutoId: string;
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
	};
} = {
	ESSENCIAL: {
		name: "ESSENCIAL",
		description: "Plano ideal para começar a implementar o RecompraCRM na sua empresa. Plug and Play (sem integrações necessárias).",
		routes: {
			dashboard: {
				accessible: false,
				redirectTo: "/dashboard/commercial/cashback-programs",
			},
			"/dashboard/commercial/sales": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/segments": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/clients": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/partners": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/products": {
				accessible: false,
				redirectTo: "/dashboard/commercial/products",
			},
			"/dashboard/commercial/campaigns": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/cashback-programs": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/team/sellers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/team/goals": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/chats": {
				accessible: false,
				redirectTo: "/dashboard/commercial/campaigns",
			},
			"/dashboard/settings": {
				accessible: true,
				redirectTo: null,
			},
		},
		capabilities: {
			features: {
				biLite: true,
				biCompleto: false,
				cashbackEPoi: true,
				campanhas: true,
				aiHints: false,
				relatoriosVendasWhatsapp: false,
				whatsappHub: false,
				whatsappHubIa: false,
			},
			limits: {
				maxCampanhasAtivas: 5,
				aiHintsPorMes: 0,
				hubMaxNumeros: 0,
				hubMaxAtendentes: 0,
			},
		},
		pricingTableFeatures: [
			{
				checked: true,
				label: "Business Intelligence Lite (campanhas, cashback e WhatsApp)",
			},
			{
				checked: false,
				label: "Business Intelligence completo (vendas, produtos, vendedores e parceiros)",
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
		stripeProdutoId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_STARTER as string,
		pricing: {
			monthly: {
				price: 199.9,
				currency: "BRL",
				interval: "month",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESSENCIAL_MONTHLY_PLAN_PRICE_ID as string,
			},
			yearly: {
				price: 2199.9,
				currency: "BRL",
				interval: "year",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESSENCIAL_YEARLY_PLAN_PRICE_ID as string,
			},
		},
	},
	CRESCIMENTO: {
		name: "CRESCIMENTO",
		description: "Plano intermediário para usufruir do RecompraCRM com BI completo e otimizações com IA.",
		routes: {
			dashboard: {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/sales": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/segments": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/clients": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/partners": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/products": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/campaigns": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/cashback-programs": {
				accessible: true,
				redirectTo: "/dashboard/commercial/cashback-programs",
			},
			"/dashboard/team/sellers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/team/goals": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/chats": {
				accessible: false,
				redirectTo: "/dashboard/commercial/campaigns",
			},
			"/dashboard/settings": {
				accessible: true,
				redirectTo: null,
			},
		},
		stripeProdutoId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_PLUS as string,
		capabilities: {
			features: {
				biLite: true,
				biCompleto: true,
				cashbackEPoi: true,
				campanhas: true,
				aiHints: true,
				relatoriosVendasWhatsapp: true,
				whatsappHub: false,
				whatsappHubIa: false,
			},
			limits: {
				maxCampanhasAtivas: 10,
				aiHintsPorMes: 10,
				hubMaxNumeros: 0,
				hubMaxAtendentes: 0,
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
				label: "Até 10 campanhas/jornadas ativas",
			},
			{
				checked: true,
				label: "Programas de cashback flexíveis",
			},
			{
				checked: true,
				label: "Ponto de Interação (tablet) para acumulação de cashback",
			},
			{
				checked: true,
				label: "AI-Hints (10/mês) + relatórios de vendas no WhatsApp",
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
				price: 4399.9,
				currency: "BRL",
				interval: "year",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CRESCIMENTO_YEARLY_PLAN_PRICE_ID as string,
			},
		},
	},
	ESCALA: {
		name: "ESCALA",
		description: "Plano completo com WhatsApp Hub e atendimento com IA.",
		routes: {
			dashboard: {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/sales": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/segments": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/clients": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/partners": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/products": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/campaigns": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/commercial/cashback-programs": {
				accessible: true,
				redirectTo: "/dashboard/commercial/cashback-programs",
			},
			"/dashboard/team/sellers": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/team/goals": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/chats": {
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/settings": {
				accessible: true,
				redirectTo: null,
			},
		},
		stripeProdutoId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_PLUS as string,
		capabilities: {
			features: {
				biLite: true,
				biCompleto: true,
				cashbackEPoi: true,
				campanhas: true,
				aiHints: true,
				relatoriosVendasWhatsapp: true,
				whatsappHub: true,
				whatsappHubIa: true,
			},
			limits: {
				maxCampanhasAtivas: null,
				aiHintsPorMes: 10,
				hubMaxNumeros: 3,
				hubMaxAtendentes: 10,
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
				label: "Ponto de Interação (tablet) para acumulação de cashback",
			},
			{
				checked: true,
				label: "AI-Hints (10/mês) + relatórios de vendas no WhatsApp",
			},
			{
				checked: true,
				label: "WhatsApp Hub com IA (até 3 números e 10 atendentes)",
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
				price: 9899.9,
				currency: "BRL",
				interval: "year",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESCALA_YEARLY_PLAN_PRICE_ID as string,
			},
		},
	},
};

export function getOrganizationAccessToRoute({ organizationPlan, path }: { organizationPlan: keyof typeof AppSubscriptionPlans; path: string }) {
	const plan = AppSubscriptionPlans[organizationPlan];
	const route = plan.routes[path as keyof typeof plan.routes];
	if (!route) return { access: false, redirectTo: "/" };
	if (!route.accessible) return { access: false, redirectTo: route.redirectTo || "/" };
	return { access: true, redirectTo: null };
}
export const AppRoutes = [
	{
		path: "/dashboard",
		title: "Dashboard",
	},
	{
		path: "/dashboard/commercial/sales",
		title: "Vendas",
	},
	{
		path: "/dashboard/commercial/segments",
		title: "Segmentações",
	},
	{
		path: "/dashboard/commercial/clients",
		title: "Clientes",
	},
	{
		path: "/dashboard/commercial/partners",
		title: "Parceiros",
	},
	{
		path: "/dashboard/commercial/products",
		title: "Produtos",
	},
	{
		path: "/dashboard/commercial/campaigns",
		title: "Campanhas",
	},
	{
		path: "/dashboard/commercial/cashback-programs",
		title: "Programas de Cashback",
	},
	{
		path: "/dashboard/team/sellers",
		title: "Vendedores",
	},
	{
		path: "/dashboard/team/goals",
		title: "Metas",
	},
	{
		path: "/dashboard/chats",
		title: "Conversas",
	},
	{
		path: "/dashboard/settings",
		title: "Configurações",
	},
];
export function getAppRouteTitle(path: string) {
	const route = AppRoutes.find((route) => route.path === path);
	return route?.title || "";
}
