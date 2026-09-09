"use client";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import WhatsappConnectionsPills from "@/components/WhatsappConnections/ConnectionsPills";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { LayoutDashboard } from "lucide-react";
import { useMemo } from "react";
import { resolveDashboardWidgets, type TDashboardWidget, type TDashboardWidgetProps } from "./_hub/registry";

type DashboardPageProps = {
	user: TAuthUserSession["user"];
	userOrg: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	membership: NonNullable<TAuthUserSession["membership"]>;
	/** Ids de vendedor do escopo de resultados do membro; `null` = sem escopo (organização inteira). */
	scopeSellersIds: string[] | null;
};

const todayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

/**
 * Casa única do dashboard: pendências que exigem ação e o pulso do dia, só no que o membro enxerga.
 * A análise profunda vive em cada módulo (Vendas > Resultados, Financeiro > Visão geral, Campanhas).
 */
export function DashboardPage({ user, userOrg, membership, scopeSellersIds }: DashboardPageProps) {
	const widgets = useMemo(
		() => resolveDashboardWidgets({ organization: userOrg, permissions: membership.permissoes, sellerId: membership.usuarioVendedorId ?? null }),
		[userOrg, membership.permissoes, membership.usuarioVendedorId],
	);
	const pendencias = widgets.filter((widget) => widget.kind === "pendencia");
	const pulso = widgets.filter((widget) => widget.kind === "pulso");

	const widgetProps: TDashboardWidgetProps = {
		scopeSellersIds,
		sellerId: membership.usuarioVendedorId ?? null,
		canViewSensitive: membership.permissoes.resultados.visualizarSensiveis,
	};

	const firstName = user.nome?.trim().split(/\s+/)[0] ?? "";

	return (
		<div className="flex w-full flex-col gap-4 p-1">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col">
					<h1 className="font-black text-2xl tracking-tight">{firstName ? `Olá, ${firstName}` : "Dashboard"}</h1>
					<p className="text-sm text-muted-foreground first-letter:uppercase">{todayLabel}</p>
				</div>
				<div className="self-end shrink-0">
					<WhatsappConnectionsPills />
				</div>
			</div>

			{widgets.length === 0 ? (
				<Empty className="justify-center bg-muted/25 py-12">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<LayoutDashboard className="text-muted-foreground" strokeWidth={1.5} aria-hidden />
						</EmptyMedia>
						<EmptyTitle className="text-sm font-semibold tracking-tight">Nada para acompanhar por aqui</EmptyTitle>
						<EmptyDescription className="max-w-[320px] text-xs leading-relaxed">
							Seu perfil ainda não tem acesso a módulos com pendências ou indicadores. Use o menu lateral para navegar.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<WidgetSection title="Precisa de atenção" widgets={pendencias} widgetProps={widgetProps} />
					<WidgetSection title="Pulso do dia" widgets={pulso} widgetProps={widgetProps} />
				</>
			)}
		</div>
	);
}

type WidgetSectionProps = {
	title: string;
	widgets: TDashboardWidget[];
	widgetProps: TDashboardWidgetProps;
};

function WidgetSection({ title, widgets, widgetProps }: WidgetSectionProps) {
	if (widgets.length === 0) return null;
	return (
		<section className="flex w-full flex-col gap-2">
			<h2 className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
			<div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
				{widgets.map(({ id, Component }) => (
					<Component key={id} {...widgetProps} />
				))}
			</div>
		</section>
	);
}
