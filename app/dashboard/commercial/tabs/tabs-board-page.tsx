"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { ControlServicePoint } from "@/components/Modals/Internal/ServicePoints/ControlServicePoint";
import { NewServicePoint } from "@/components/Modals/Internal/ServicePoints/NewServicePoint";
import { NewTab } from "@/components/Modals/Internal/Tabs/NewTab";
import { ServiceSettings } from "@/components/Modals/Internal/Tabs/ServiceSettings";
import { ActionToolbar } from "@/components/ui/action-toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { useServicePoints, useServiceSettings, useTabs } from "@/lib/queries/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Plus, ReceiptText, Settings2, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import OrderRequestsSection from "./_components/OrderRequestsSection";
import { ServicePointCard, TabCard } from "./_components/BoardCards";
import { ServicePointPills } from "./_components/ServicePointPills";
import { useTickingNow } from "./_components/board-meta";

// ============================================================================
// Board operacional de contas (tabs). Duas leituras do mesmo estado: "Por conta"
// (o que esta consumindo) e "Por mesa" (mapa de salao, livres inclusive). A
// faixa de pills e atalho para os pontos mais relevantes; a visao completa vive
// no modo por mesa. O consumo em aberto e metrica derivada da venda rascunho —
// nao ha recebiveis antes do fechamento.
// ============================================================================

type TActiveModal =
	| { type: "nova-conta"; servicePointId?: string | null }
	| { type: "novo-ponto" }
	| { type: "editar-ponto"; pointId: string }
	| { type: "configuracoes" }
	| null;

export default function TabsBoardPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const now = useTickingNow();
	const { data: settings } = useServiceSettings();
	const { data: servicePoints, isLoading: pointsLoading, queryKey: pointsQueryKey } = useServicePoints();
	const { data: tabs, isLoading: tabsLoading, isError, error, queryKey: tabsQueryKey } = useTabs();
	const [activeModal, setActiveModal] = useState<TActiveModal>(null);
	const [mode, setMode] = useState<"por-conta" | "por-mesa">("por-conta");

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

	function openTab(tabId: string) {
		router.push(`/dashboard/commercial/tabs/${tabId}`);
	}

	const pontosHabilitados = settings?.pontos.habilitados ?? false;
	const contasHabilitadas = settings?.contas.habilitadas ?? false;
	// Sem pontos habilitados o modo por mesa nem existe — o board colapsa em "por conta".
	const effectiveMode = pontosHabilitados ? mode : "por-conta";
	const activePoints = useMemo(() => (servicePoints ?? []).filter((point) => point.ativo), [servicePoints]);
	const editingPoint = activeModal?.type === "editar-ponto" ? activePoints.find((point) => point.id === activeModal.pointId) : undefined;
	const openTabs = tabs ?? [];
	// Contas sem ponto (comandas avulsas) nao aparecem no mapa de salao — ganham sua propria faixa.
	const looseTabs = useMemo(() => openTabs.filter((tab) => !tab.servicePointId), [openTabs]);

	/**
	 * Clique num ponto pela pill. Com uma conta so, vai direto para ela; livre,
	 * abre/resolve conforme o modo de identificacao. Com varias contas a pill nao
	 * tem como desambiguar, entao leva ao modo por mesa, onde o card lista todas.
	 */
	function handlePointSelect(pointId: string) {
		const pointTabs = openTabsByPoint.get(pointId) ?? [];
		if (pointTabs.length === 1) return openTab(pointTabs[0].id);
		if (pointTabs.length === 0) return setActiveModal({ type: "nova-conta", servicePointId: pointId });
		return setMode("por-mesa");
	}

	return (
		<div className="flex h-full w-full flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
					<UtensilsCrossed className="size-5" />
					Mesas & Comandas
				</h1>
				<ActionToolbar>
					<ActionToolbar.Action icon={Settings2} onClick={() => setActiveModal({ type: "configuracoes" })}>
						MODO DE ATENDIMENTO
					</ActionToolbar.Action>
					{contasHabilitadas ? (
						<ActionToolbar.Primary icon={Plus} onClick={() => setActiveModal({ type: "nova-conta" })}>
							NOVA CONTA
						</ActionToolbar.Primary>
					) : null}
				</ActionToolbar>
			</div>

			{!contasHabilitadas ? (
				<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
					<UtensilsCrossed className="size-8 text-muted-foreground" />
					<p className="text-sm font-medium">Contas de atendimento estão desabilitadas.</p>
					<p className="max-w-md text-xs text-muted-foreground">
						Configure o modo de atendimento (mesas, comandas ou ambos) para começar a abrir contas e acumular pedidos até o fechamento.
					</p>
					<Button size="sm" variant="secondary" className="mt-1" onClick={() => setActiveModal({ type: "configuracoes" })}>
						CONFIGURAR
					</Button>
				</div>
			) : null}

			{contasHabilitadas ? <OrderRequestsSection /> : null}

			{contasHabilitadas ? (
				<Tabs value={effectiveMode} onValueChange={(value) => setMode(value as typeof mode)} className="flex w-full flex-col">
					{/* Abas nao encolhem: com a faixa de pills expandida, o seletor de modo
					    precisa continuar acessivel (o wrapper padrao e shrink-0 e espremeria
					    as abas ate sumirem). As pills ficam com o espaco restante e quebram. */}
					<div className="flex w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div className="shrink-0">
							<TabsList variant="page">
								<TabsTrigger value="por-conta">
									<ReceiptText className="size-4" />
									Por conta ({openTabs.length})
								</TabsTrigger>
								{pontosHabilitados ? (
									<TabsTrigger value="por-mesa">
										<LayoutGrid className="size-4" />
										Por mesa ({activePoints.length})
									</TabsTrigger>
								) : null}
							</TabsList>
						</div>

						{pontosHabilitados ? (
							<div className="min-w-0 lg:flex-1">
								{pointsLoading ? (
									<div className="flex items-center gap-2 lg:justify-end">
										{Array.from({ length: 4 }).map((_, index) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: skeletons estáticos
											<Skeleton key={index} className="h-9 w-24 rounded-lg" />
										))}
									</div>
								) : (
									<ServicePointPills
										points={activePoints}
										tabsByPoint={openTabsByPoint}
										now={now}
										onSelectPoint={(point) => handlePointSelect(point.id)}
										onCreatePoint={() => setActiveModal({ type: "novo-ponto" })}
									/>
								)}
							</div>
						) : null}
					</div>

					{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

					{/* ------------------------------------------------------------ Por conta */}
					<TabsContent value="por-conta" className="mt-3 flex flex-col gap-3">
						{tabsLoading ? <CardGridSkeleton /> : null}

						{!tabsLoading && openTabs.length === 0 ? (
							<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
								<ReceiptText className="size-8 text-muted-foreground" />
								<p className="text-sm font-semibold">Nenhuma conta aberta no momento.</p>
								<p className="max-w-sm text-xs text-muted-foreground">
									Abra uma conta para começar a lançar pedidos. O pagamento acontece só no fechamento.
								</p>
								<Button size="sm" className="mt-1" onClick={() => setActiveModal({ type: "nova-conta" })}>
									<Plus className="size-4" />
									ABRIR CONTA
								</Button>
							</div>
						) : null}

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{openTabs.map((tab) => (
								<TabCard key={tab.id} tab={tab} now={now} onOpen={() => openTab(tab.id)} />
							))}
						</div>
					</TabsContent>

					{/* ------------------------------------------------------------- Por mesa */}
					{pontosHabilitados ? (
						<TabsContent value="por-mesa" className="mt-3 flex flex-col gap-4">
							{pointsLoading ? <CardGridSkeleton /> : null}

							{!pointsLoading && activePoints.length === 0 ? (
								<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
									<LayoutGrid className="size-8 text-muted-foreground" />
									<p className="text-sm font-semibold">Nenhum ponto de atendimento cadastrado.</p>
									<p className="max-w-sm text-xs text-muted-foreground">Cadastre mesas, balcões ou quiosques para enxergar a ocupação do salão.</p>
									<Button size="sm" className="mt-1" onClick={() => setActiveModal({ type: "novo-ponto" })}>
										<Plus className="size-4" />
										CADASTRAR PONTO
									</Button>
								</div>
							) : null}

							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{activePoints.map((point) => (
									<ServicePointCard
										key={point.id}
										point={point}
										pointTabs={openTabsByPoint.get(point.id) ?? []}
										now={now}
										onOpenTab={openTab}
										onCreateTab={() => setActiveModal({ type: "nova-conta", servicePointId: point.id })}
										onEditPoint={() => setActiveModal({ type: "editar-ponto", pointId: point.id })}
									/>
								))}
							</div>

							{looseTabs.length > 0 ? (
								<div className="flex flex-col gap-2">
									<h2 className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Contas sem ponto ({looseTabs.length})</h2>
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
										{looseTabs.map((tab) => (
											<TabCard key={tab.id} tab={tab} now={now} onOpen={() => openTab(tab.id)} />
										))}
									</div>
								</div>
							) : null}
						</TabsContent>
					) : null}
				</Tabs>
			) : null}

			{activeModal?.type === "nova-conta" ? (
				<NewTab
					initialServicePointId={activeModal.servicePointId}
					closeModal={() => setActiveModal(null)}
					callbacks={{
						onSuccess: (data) => {
							refresh();
							// Abrir/resolver ja leva o operador direto para o workspace da conta.
							setActiveModal(null);
							openTab(data.data.tab.id);
						},
					}}
				/>
			) : null}
			{activeModal?.type === "novo-ponto" ? <NewServicePoint closeModal={() => setActiveModal(null)} callbacks={{ onSuccess: refresh }} /> : null}
			{activeModal?.type === "editar-ponto" && editingPoint ? (
				<ControlServicePoint servicePoint={editingPoint} closeModal={() => setActiveModal(null)} callbacks={{ onSuccess: refresh }} />
			) : null}
			{activeModal?.type === "configuracoes" ? <ServiceSettings closeModal={() => setActiveModal(null)} /> : null}
		</div>
	);
}

function CardGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 6 }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeletons estáticos
				<Skeleton key={index} className="h-44 w-full rounded-2xl" />
			))}
		</div>
	);
}
