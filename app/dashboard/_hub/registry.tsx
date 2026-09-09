"use client";

import type { TDashboardCapability } from "@/lib/access/capabilities";
import { type TCapabilityContext } from "@/lib/access/capabilities";
import { filterNavigationItems } from "@/lib/access/navigation";
import type { ComponentType } from "react";
import { ApprovalsWidget } from "./widgets/approvals-widget";
import { CampaignsWeekWidget } from "./widgets/campaigns-week-widget";
import { FinanceDueWidget } from "./widgets/finance-due-widget";
import { FiscalPendingWidget } from "./widgets/fiscal-pending-widget";
import { GoalWidget } from "./widgets/goal-widget";
import { LowStockWidget } from "./widgets/low-stock-widget";
import { OpenOrdersWidget } from "./widgets/open-orders-widget";
import { OpenTabsWidget } from "./widgets/open-tabs-widget";
import { SalesTodayWidget } from "./widgets/sales-today-widget";
import { SellerRoutineWidget } from "./widgets/seller-routine-widget";

/**
 * Registro dos widgets do dashboard. Mesmo filtro de capacidades da sidebar e da paleta de comandos
 * (`filterNavigationItems`): um widget novo entra aqui com a capability que o governa e aparece
 * só para quem enxerga o módulo correspondente.
 *
 * Dois tipos, de propósito:
 * - `pendencia`: algo que exige ação agora (contagem + contexto + link).
 * - `pulso`: um número de hoje/mês com link para a visão geral do módulo. Sem filtros — a análise
 *   profunda vive em cada módulo.
 */
export type TDashboardWidgetKind = "pendencia" | "pulso";

export type TDashboardWidgetProps = {
	/** Ids de vendedor do escopo de resultados do membro; `null` = organização inteira. */
	scopeSellersIds: string[] | null;
	/** Vendedor vinculado ao membro (`organizationMembers.usuarioVendedorId`). */
	sellerId: string | null;
	canViewSensitive: boolean;
};

export type TDashboardWidget = {
	id: string;
	kind: TDashboardWidgetKind;
	capability: TDashboardCapability;
	/** Widgets da rotina do vendedor só fazem sentido para membros com vendedor vinculado. */
	requiresSeller?: boolean;
	Component: ComponentType<TDashboardWidgetProps>;
};

export const DashboardWidgetRegistry: readonly TDashboardWidget[] = [
	// Pendências — ordem por urgência: dinheiro parado, documentos travados, pedidos esperando.
	{ id: "approvals", kind: "pendencia", capability: "approvals", Component: ApprovalsWidget },
	{ id: "open-orders", kind: "pendencia", capability: "orders", Component: OpenOrdersWidget },
	{ id: "fiscal-pending", kind: "pendencia", capability: "fiscal", Component: FiscalPendingWidget },
	{ id: "finance-due", kind: "pendencia", capability: "finance", Component: FinanceDueWidget },
	{ id: "low-stock", kind: "pendencia", capability: "inventory", Component: LowStockWidget },
	// Pulso — o vendedor primeiro (é quem abre o app todo dia), depois a organização.
	{ id: "seller-routine", kind: "pulso", capability: "portfolios", requiresSeller: true, Component: SellerRoutineWidget },
	{ id: "sales-today", kind: "pulso", capability: "salesResults", Component: SalesTodayWidget },
	{ id: "goal", kind: "pulso", capability: "goals", Component: GoalWidget },
	{ id: "open-tabs", kind: "pulso", capability: "serviceAccounts", Component: OpenTabsWidget },
	{ id: "campaigns-week", kind: "pulso", capability: "campaigns", Component: CampaignsWeekWidget },
];

export type TDashboardWidgetContext = TCapabilityContext & { sellerId: string | null };

export function resolveDashboardWidgets(context: TDashboardWidgetContext): TDashboardWidget[] {
	return filterNavigationItems([...DashboardWidgetRegistry], context).filter((widget) => !widget.requiresSeller || context.sellerId !== null);
}
