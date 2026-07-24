"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { ControlServicePoint } from "@/components/Modals/Internal/ServicePoints/ControlServicePoint";
import { NewServicePoint } from "@/components/Modals/Internal/ServicePoints/NewServicePoint";
import { ControlTab } from "@/components/Modals/Internal/Tabs/ControlTab";
import { NewTab } from "@/components/Modals/Internal/Tabs/NewTab";
import { ServiceSettings } from "@/components/Modals/Internal/Tabs/ServiceSettings";
import OrderRequestsSection from "./_components/OrderRequestsSection";
import { ActionToolbar } from "@/components/ui/action-toolbar";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { useServicePoints, useServiceSettings, useTabs } from "@/lib/queries/tabs";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { CircleUser, Clock, LayoutGrid, MapPin, Pencil, Plus, Settings2, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";

// ============================================================================
// Board operacional de contas (tabs): dois eixos — ocupacao dos pontos
// ("mapa de mesas" via LEFT JOIN de contas abertas) e contas abertas.
// O consumo em aberto e metrica derivada da venda rascunho; nao ha recebiveis
// antes do fechamento.
// ============================================================================

function formatTabAge(from: Date | string) {
	const minutes = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
	if (minutes < 60) return `${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h${(minutes % 60).toString().padStart(2, "0")}`;
	return `${Math.floor(hours / 24)}d`;
}

type TActiveModal =
	| { type: "nova-conta"; servicePointId?: string | null }
	| { type: "conta"; tabId: string }
	| { type: "novo-ponto" }
	| { type: "editar-ponto"; pointId: string }
	| { type: "configuracoes" }
	| null;

export default function TabsBoardPage() {
	const queryClient = useQueryClient();
	const { data: settings } = useServiceSettings();
	const { data: servicePoints, isLoading: pointsLoading, queryKey: pointsQueryKey } = useServicePoints();
	const { data: tabs, isLoading: tabsLoading, isError, error, queryKey: tabsQueryKey } = useTabs();
	const [activeModal, setActiveModal] = useState<TActiveModal>(null);

	const openTabsByPoint = useMemo(() => {
		const map = new Map<string, NonNullable<typeof tabs>>();
		for (const tab of tabs ?? []) {
			if (!tab.servicePointId) continue;
			map.set(tab.servicePointId, [...(map.get(tab.servicePointId) ?? []), tab]);
		}
		return map;
	}, [tabs]);

	function refresh() {
		queryClient.invalidateQueries({ queryKey: tabsQueryKey });
		queryClient.invalidateQueries({ queryKey: pointsQueryKey });
	}

	const pontosHabilitados = settings?.pontos.habilitados ?? false;
	const contasHabilitadas = settings?.contas.habilitadas ?? false;
	const resolveOnPointClick = settings?.contas.identificacao === "AUTOMATICA" && settings?.contas.maxAbertasPorPonto === 1;
	const activePoints = (servicePoints ?? []).filter((point) => point.ativo);
	const editingPoint = activeModal?.type === "editar-ponto" ? (servicePoints ?? []).find((point) => point.id === activeModal.pointId) : undefined;

	return (
		<div className="flex h-full w-full flex-col gap-3">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
					<UtensilsCrossed className="w-5 h-5" />
					Mesas & Comandas
				</h1>
				<ActionToolbar>
					<ActionToolbar.Action icon={Settings2} onClick={() => setActiveModal({ type: "configuracoes" })}>
						MODO DE ATENDIMENTO
					</ActionToolbar.Action>
					{pontosHabilitados ? (
						<ActionToolbar.Action icon={LayoutGrid} onClick={() => setActiveModal({ type: "novo-ponto" })}>
							NOVO PONTO
						</ActionToolbar.Action>
					) : null}
					{contasHabilitadas ? (
						<ActionToolbar.Primary icon={Plus} onClick={() => setActiveModal({ type: "nova-conta" })}>
							NOVA CONTA
						</ActionToolbar.Primary>
					) : null}
				</ActionToolbar>
			</div>

			{!contasHabilitadas ? (
				<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
					<UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
					<p className="text-sm font-medium">Contas de atendimento estão desabilitadas.</p>
					<p className="text-xs text-muted-foreground max-w-md">
						Configure o modo de atendimento (mesas, comandas ou ambos) para começar a abrir contas e acumular pedidos até o fechamento.
					</p>
					<Button size="sm" variant="secondary" className="mt-1" onClick={() => setActiveModal({ type: "configuracoes" })}>
						CONFIGURAR
					</Button>
				</div>
			) : null}

			{contasHabilitadas ? <OrderRequestsSection /> : null}

			{contasHabilitadas && pontosHabilitados ? (
				<div className="flex flex-col gap-2">
					<h2 className="text-sm font-bold uppercase tracking-tight text-muted-foreground">Pontos de atendimento</h2>
					{pointsLoading ? <LoadingComponent /> : null}
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
						{activePoints.map((point) => {
							const pointTabs = openTabsByPoint.get(point.id) ?? [];
							const occupied = pointTabs.length > 0;
							return (
								<div
									key={point.id}
									className={cn(
										"group relative flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2.5 transition-colors",
										occupied ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10" : "border-border bg-card hover:bg-secondary/40",
									)}
									onClick={() => {
										// Ocupado com 1 conta -> abre a conta; livre -> abre/resolve conforme o modo.
										if (occupied && pointTabs.length === 1) return setActiveModal({ type: "conta", tabId: pointTabs[0].id });
										if (resolveOnPointClick || !occupied) return setActiveModal({ type: "nova-conta", servicePointId: point.id });
									}}
								>
									<div className="flex items-center justify-between">
										<span className="text-sm font-bold tracking-tight">{point.rotulo}</span>
										<button
											type="button"
											className="opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={(event) => {
												event.stopPropagation();
												setActiveModal({ type: "editar-ponto", pointId: point.id });
											}}
										>
											<Pencil className="w-3 h-3 text-muted-foreground" />
										</button>
									</div>
									{point.grupo ? <span className="text-[0.65rem] uppercase text-muted-foreground">{point.grupo}</span> : null}
									<span
										className={cn(
											"w-fit rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold",
											occupied ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-green-500/10 text-green-700 dark:text-green-400",
										)}
									>
										{occupied ? (pointTabs.length === 1 ? `OCUPADO · ${formatToMoney(pointTabs[0].consumoParcial)}` : `${pointTabs.length} CONTAS`) : "LIVRE"}
									</span>
								</div>
							);
						})}
						{!pointsLoading && activePoints.length === 0 ? (
							<button
								type="button"
								className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-6 text-xs text-muted-foreground hover:bg-secondary/40 transition-colors"
								onClick={() => setActiveModal({ type: "novo-ponto" })}
							>
								<Plus className="w-4 h-4" />
								Cadastrar primeiro ponto
							</button>
						) : null}
					</div>
				</div>
			) : null}

			{contasHabilitadas ? (
				<div className="flex flex-col gap-2">
					<h2 className="text-sm font-bold uppercase tracking-tight text-muted-foreground">Contas abertas ({(tabs ?? []).length})</h2>
					{tabsLoading ? <LoadingComponent /> : null}
					{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
					{!tabsLoading && (tabs ?? []).length === 0 ? (
						<p className="py-4 text-center text-xs text-muted-foreground">Nenhuma conta aberta no momento.</p>
					) : null}
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{(tabs ?? []).map((tab) => {
							const pedidosAtivos = tab.pedidos.filter((order) => !["ENTREGUE", "CANCELADO"].includes(order.status)).length;
							const etiqueta = tab.servicePoint?.rotulo ?? (tab.codigo ? `Comanda ${tab.codigo}` : "Conta avulsa");
							return (
								<div
									key={tab.id}
									className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card px-3.5 py-3 shadow-2xs hover:shadow-sm hover:border-border transition-all"
									onClick={() => setActiveModal({ type: "conta", tabId: tab.id })}
								>
									<div className="flex items-center justify-between">
										<span className="flex items-center gap-1.5 text-sm font-bold tracking-tight uppercase">
											<MapPin className="w-3.5 h-3.5" />
											{etiqueta}
											{tab.codigo && tab.servicePoint ? <span className="text-xs text-muted-foreground font-medium">· {tab.codigo}</span> : null}
										</span>
										<span className="flex items-center gap-1 text-xs text-muted-foreground">
											<Clock className="w-3 h-3" />
											{formatTabAge(tab.dataAbertura)}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-base font-bold">{formatToMoney(tab.consumoParcial)}</span>
										<span className="text-xs text-muted-foreground">
											{tab.pedidos.length} {tab.pedidos.length === 1 ? "pedido" : "pedidos"}
											{pedidosAtivos > 0 ? ` · ${pedidosAtivos} em andamento` : ""}
										</span>
									</div>
									{tab.cliente ? (
										<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<CircleUser className="w-3 h-3" />
											{tab.cliente.nome}
										</span>
									) : null}
								</div>
							);
						})}
					</div>
				</div>
			) : null}

			{activeModal?.type === "nova-conta" ? (
				<NewTab
					initialServicePointId={activeModal.servicePointId}
					closeModal={() => setActiveModal(null)}
					callbacks={{
						onSuccess: (data) => {
							refresh();
							// Abrir/resolver ja leva o operador direto para a conta.
							setActiveModal({ type: "conta", tabId: data.data.tab.id });
						},
					}}
				/>
			) : null}
			{activeModal?.type === "conta" ? <ControlTab tabId={activeModal.tabId} closeModal={() => setActiveModal(null)} callbacks={{ onSuccess: refresh }} /> : null}
			{activeModal?.type === "novo-ponto" ? <NewServicePoint closeModal={() => setActiveModal(null)} callbacks={{ onSuccess: refresh }} /> : null}
			{activeModal?.type === "editar-ponto" && editingPoint ? (
				<ControlServicePoint servicePoint={editingPoint} closeModal={() => setActiveModal(null)} callbacks={{ onSuccess: refresh }} />
			) : null}
			{activeModal?.type === "configuracoes" ? <ServiceSettings closeModal={() => setActiveModal(null)} /> : null}
		</div>
	);
}
