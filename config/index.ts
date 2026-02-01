import type { TOrganizationConfiguration } from "@/schemas/organizations";

export const SESSION_COOKIE_NAME = "syncrono-session";

export const FREE_TRIAL_DURATION_DAYS = 15;

export type TAppSubscriptionPlanKey = "ESSENCIAL" | "CRESCIMENTO" | "ESCALA";

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
	iaDicas: {
		acesso: false,
		limiteSemanal: 0,
	},
	iaAtendimento: {
		acesso: false,
		limiteCreditos: 0,
	},
	relatoriosWhatsapp: {
		acesso: false,
	},
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
		capabilities: TOrganizationConfiguration["recursos"];
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
		description: "Comece hoje. Cashback + PDV em tablet + campanhas básicas. Sem integração obrigatória.",
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
			iaDicas: {
				acesso: false,
				limiteSemanal: 0,
			},
			iaAtendimento: {
				acesso: false,
				limiteCreditos: 0,
			},
			relatoriosWhatsapp: {
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
		stripeProdutoId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_STARTER as string,
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
	},
	CRESCIMENTO: {
		name: "CRESCIMENTO",
		description: "BI completo + IA que sugere ações + integração com ERP. O mais escolhido.",
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
			iaDicas: {
				acesso: true,
				limiteSemanal: null,
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
				label: "Dicas de IA personalizadas para o seu negócio",
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
	},
	ESCALA: {
		name: "ESCALA",
		description: "Tudo do Crescimento + Hub de atendimentos + IA que responde clientes 24/7.",
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
			iaDicas: {
				acesso: true,
				limiteSemanal: null,
			},
			iaAtendimento: {
				acesso: true,
				limiteCreditos: null,
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
				label: "Dicas de IA personalizadas para o seu negócio",
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
