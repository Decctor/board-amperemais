export const SESSION_COOKIE_NAME = "syncrono-session";

export const AppSubscriptionPlans: {
	[key in "STARTER" | "PLUS"]: {
		name: string;
		description: string;
		routes: {
			[key: string]: {
				accessible: boolean;
				redirectTo: string | null;
			};
		};
		stripeProdutoId: string;
		pricing: {
			monthly: {
				price: number;
				currency: string;
				interval: "month" | "year";
			};
			yearly: {
				price: number;
				currency: string;
				interval: "month" | "year";
			};
		};
	};
} = {
	STARTER: {
		name: "Starter",
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
		stripeProdutoId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID_STARTER as string,
		pricing: {
			monthly: {
				price: 499,
				currency: "BRL",
				interval: "month",
			},
			yearly: {
				price: 5499,
				currency: "BRL",
				interval: "year",
			},
		},
	},
	PLUS: {
		name: "Plus",
		description: "Plano completo para usufruir do máximo do RecompraCRM na sua empresa (necessário integrações).",
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
		pricing: {
			monthly: {
				price: 999,
				currency: "BRL",
				interval: "month",
			},
			yearly: {
				price: 9999,
				currency: "BRL",
				interval: "year",
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
