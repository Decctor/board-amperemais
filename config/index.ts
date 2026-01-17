export const SESSION_COOKIE_NAME = "syncrono-session";

export const FREE_TRIAL_DURATION_DAYS = 15;

export const AppSubscriptionPlans: {
	[key in "ESSENCIAL" | "CRESCIMENTO" | "ESCALA"]: {
		name: string;
		description: string;
		routes: {
			[key: string]: {
				accessible: boolean;
				redirectTo: string | null;
			};
		};
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
		description: "Plano ideal para começar a implementar o RecompraCRM na sua empresa. Plug and Play (Sem integrações necessárias).",
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
				accessible: true,
				redirectTo: null,
			},
			"/dashboard/settings": {
				accessible: true,
				redirectTo: null,
			},
		},
		pricingTableFeatures: [
			{
				checked: false,
				label: "Business Performance com gráficos e análises completas",
			},
			{
				checked: false,
				label: "Integrações com ERP (Sincronização de dados automática)",
			},
			{
				checked: true,
				label: "Campanhas de reativação e relacionamento automáticas",
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
				price: 499,
				currency: "BRL",
				interval: "month",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESSENCIAL_MONTHLY_PLAN_PRICE_ID as string,
			},
			yearly: {
				price: 5499,
				currency: "BRL",
				interval: "year",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESSENCIAL_YEARLY_PLAN_PRICE_ID as string,
			},
		},
	},
	CRESCIMENTO: {
		name: "CRESCIMENTO",
		description: "Plano intermediário para usufruir do RecompraCRM na sua empresa junto com seu ERP.",
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
		pricingTableFeatures: [
			{
				checked: false,
				label: "Business Performance com gráficos e análises completas",
			},
			{
				checked: true,
				label: "Integrações com ERP (Sincronização de dados automática)",
			},
			{
				checked: true,
				label: "Campanhas de reativação e relacionamento automáticas",
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
				price: 999,
				currency: "BRL",
				interval: "month",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CRESCIMENTO_MONTHLY_PLAN_PRICE_ID as string,
			},
			yearly: {
				price: 9999,
				currency: "BRL",
				interval: "year",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CRESCIMENTO_YEARLY_PLAN_PRICE_ID as string,
			},
		},
	},
	ESCALA: {
		name: "ESCALA",
		description: "Plano completo com acesso ao módulo de IA.",
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
		pricingTableFeatures: [
			{
				checked: false,
				label: "Business Performance com gráficos e análises completas",
			},
			{
				checked: true,
				label: "Integrações com ERP (Sincronização de dados automática)",
			},
			{
				checked: true,
				label: "Campanhas de reativação e relacionamento automáticas",
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
				price: 999,
				currency: "BRL",
				interval: "month",
				stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESCALA_MONTHLY_PLAN_PRICE_ID as string,
			},
			yearly: {
				price: 9999,
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
