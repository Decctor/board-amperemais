export const SESSION_COOKIE_NAME = "syncrono-session";

export const AppRoutes = [
	{
		path: "/dashboard",
		title: "Dashboard",
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
