import type { TAppRoutePath } from "@/config";
import {
	BadgePercent,
	Banknote,
	BookText,
	Boxes,
	CalendarCheck,
	CirclePlay,
	Factory,
	Goal,
	GraduationCap,
	Grid3X3,
	Handshake,
	Home,
	type LucideIcon,
	Megaphone,
	MessageCircle,
	Package,
	PackageSearch,
	Plug,
	ScanBarcode,
	Settings,
	Shield,
	ShoppingCart,
	Store,
	Target,
	Ticket,
	UserRound,
	UsersRound,
	UtensilsCrossed,
	Wallet,
} from "lucide-react";

// ============================================================================
// Ícone de cada rota mapeada, no mesmo vocabulário do AppSidebar — a mesma rota
// usa o mesmo símbolo na navegação e no cabeçalho.
//
// Vive separado de config/index.ts de propósito: aquele módulo entra na cadeia
// de imports do servidor (rotas de API, sessão) e não deve arrastar componentes
// React junto. O Record tipado por TAppRoutePath garante que toda rota do
// AppRoutes tenha ícone — esquecer um quebra o build, não a interface.
// ============================================================================

export const APP_ROUTE_ICONS: Record<TAppRoutePath, LucideIcon> = {
	"/dashboard": Home,
	"/dashboard/commercial/point-of-interaction": CirclePlay,
	"/dashboard/commercial/sales": ShoppingCart,
	"/dashboard/commercial/sales/new-sale": ScanBarcode,
	"/dashboard/commercial/tabs": UtensilsCrossed,
	"/dashboard/commercial/cash-sessions": Banknote,
	"/dashboard/commercial/segments": Grid3X3,
	"/dashboard/commercial/clients": UsersRound,
	"/dashboard/commercial/partners": Handshake,
	"/dashboard/commercial/products": Package,
	"/dashboard/commercial/campaigns": Megaphone,
	"/dashboard/commercial/cashback-programs": BadgePercent,
	"/dashboard/commercial/coupons": Ticket,
	"/dashboard/commercial/shop": Store,
	"/dashboard/commercial/audiences": UsersRound,
	"/dashboard/commercial/marketing": Target,
	"/dashboard/integrations": Plug,
	"/dashboard/team/client-portfolios": CalendarCheck,
	"/dashboard/team/sellers": UserRound,
	"/dashboard/team/goals": Goal,
	"/dashboard/chats": MessageCircle,
	"/dashboard/operational/productions": Factory,
	"/dashboard/operational/stocks": Boxes,
	"/dashboard/operational/stocks/lots": PackageSearch,
	"/dashboard/operational/finances": Wallet,
	"/dashboard/operational/fiscal": BookText,
	"/dashboard/operational/purchases": ShoppingCart,
	"/dashboard/settings": Settings,
	"/admin-dashboard": Shield,
	"/admin-dashboard/partnerships": Handshake,
	"/admin-dashboard/community": GraduationCap,
};

export function getAppRouteIcon(path: string): LucideIcon | null {
	return APP_ROUTE_ICONS[path as TAppRoutePath] ?? null;
}
