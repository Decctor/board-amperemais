"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { CloseTab } from "@/components/Modals/Internal/Tabs/CloseTab";
import { TransferTab } from "@/components/Modals/Internal/Tabs/TransferTab";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { useTabById } from "@/lib/queries/tabs";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TabOrderComposer } from "./_components/TabOrderComposer";
import { TabOrdersPanel } from "./_components/TabOrdersPanel";
import { TAB_STATUS_META, formatTabAge } from "./_components/tab-meta";

// ============================================================================
// Workspace da conta: o detalhe e o compositor de pedido dividem a mesma
// superfície. No mobile os dois se alternam morfando no lugar (o gesto de
// voltar do navegador fecha o compositor antes de sair da conta); no desktop
// ficam lado a lado. Substitui a pilha de drawers ControlTab → LaunchTabOrder.
// ============================================================================

type TabWorkspacePageProps = {
	tabId: string;
};

export default function TabWorkspacePage({ tabId }: TabWorkspacePageProps) {
	const queryClient = useQueryClient();
	const { data: tab, isLoading, isError, error, queryKey } = useTabById({ tabId });
	const [composerOpen, setComposerOpen] = useState(false);
	const [activeModal, setActiveModal] = useState<"fechar" | "transferir" | null>(null);
	// True enquanto a entrada de histórico do compositor (mobile) está viva.
	const composerHistoryRef = useRef(false);

	function refresh() {
		queryClient.invalidateQueries({ queryKey });
		queryClient.invalidateQueries({ queryKey: ["tabs"] });
		queryClient.invalidateQueries({ queryKey: ["preparation-tickets"] });
	}

	// O compositor mobile entra no histórico: o gesto de voltar fecha o
	// compositor (volta para a conta) em vez de abandonar a página.
	function openComposer() {
		setComposerOpen(true);
		window.history.pushState({ tabComposer: true }, "");
		composerHistoryRef.current = true;
	}

	function closeComposer() {
		if (composerHistoryRef.current) window.history.back();
		else setComposerOpen(false);
	}

	useEffect(() => {
		const onPopState = () => {
			composerHistoryRef.current = false;
			setComposerOpen(false);
		};
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	const isOpen = tab?.status === "ABERTA";
	const etiqueta = tab ? (tab.servicePoint?.rotulo ?? (tab.codigo ? `Comanda ${tab.codigo}` : "Conta avulsa")) : "";
	const statusMeta = tab ? (TAB_STATUS_META[tab.status] ?? TAB_STATUS_META.ABERTA) : null;

	function handleLaunched() {
		refresh();
		if (composerOpen) closeComposer();
	}

	return (
		<div className="flex w-full flex-col gap-4">
			{/* Header de contexto da conta — no mobile o compositor assume o header */}
			<header className={cn("flex items-center gap-2", composerOpen && "hidden lg:flex")}>
				<Button asChild size="icon" variant="ghost" className="size-9 shrink-0" aria-label="Voltar para Mesas & Comandas">
					<Link href="/dashboard/commercial/tabs">
						<ChevronLeft className="size-5" />
					</Link>
				</Button>
				{isLoading ? (
					<div className="flex flex-col gap-1.5">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-3 w-24" />
					</div>
				) : tab ? (
					<div className="flex min-w-0 flex-col">
						<div className="flex items-center gap-2">
							<h1 className="truncate text-lg font-extrabold tracking-tight">{etiqueta}</h1>
							{statusMeta ? (
								<span className={cn("rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold", statusMeta.className)}>{statusMeta.label}</span>
							) : null}
						</div>
						<span className="text-xs text-muted-foreground">
							{tab.codigo && tab.servicePoint ? `Comanda ${tab.codigo}` : ""}
							{tab.codigo && tab.servicePoint && isOpen ? " · " : ""}
							{isOpen ? `aberta há ${formatTabAge(tab.dataAbertura)}` : ""}
						</span>
					</div>
				) : null}
			</header>

			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

			{isLoading ? <WorkspaceSkeleton /> : null}

			{tab && !isOpen ? (
				<div
					className={cn(
						"rounded-xl px-4 py-3 text-sm font-semibold",
						tab.status === "CANCELADA" ? "bg-destructive/5 text-destructive" : "bg-secondary/60",
					)}
				>
					{tab.status === "CANCELADA" ? "Conta cancelada" : "Conta fechada"}
					{tab.dataFechamento ? ` em ${formatDateAsLocale(tab.dataFechamento, true)}` : ""}. Somente leitura.
				</div>
			) : null}

			{tab ? (
				<div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-start lg:gap-6">
					{/* Detalhe da conta — no mobile some enquanto o compositor está aberto */}
					<div className={cn(composerOpen && "hidden lg:block")}>
						<TabOrdersPanel tab={tab} refresh={refresh} onRequestTransfer={() => setActiveModal("transferir")} />

						{/* Fechamento no desktop: ação clara no painel da conta */}
						{isOpen ? (
							<div className="mt-5 hidden lg:flex">
								<Button
									variant="brand"
									className="h-11 rounded-xl px-5 text-sm font-extrabold"
									disabled={(tab.consumoParcial ?? 0) <= 0}
									onClick={() => setActiveModal("fechar")}
								>
									<Receipt className="size-4" />
									FECHAR CONTA · {formatToMoney(tab.consumoParcial ?? 0)}
								</Button>
							</div>
						) : null}

						{/* Barra de ação da conta — zona do polegar (o desktop tem o compositor ao lado) */}
						{isOpen ? (
							<div className="sticky bottom-4 z-20 mt-5 flex gap-2 lg:hidden">
								<Button
									variant="brand"
									className="h-12 flex-1 rounded-2xl text-sm font-extrabold"
									disabled={(tab.consumoParcial ?? 0) <= 0}
									onClick={() => setActiveModal("fechar")}
								>
									<Receipt className="size-4" />
									FECHAR · {formatToMoney(tab.consumoParcial ?? 0)}
								</Button>
								<Button
									className="h-12 flex-1 rounded-2xl text-sm font-extrabold shadow-[0_10px_22px_-6px_rgba(36,84,156,0.38),0_3px_6px_rgba(36,84,156,0.22)]"
									onClick={openComposer}
								>
									<Plus className="size-4" />
									LANÇAR PEDIDO
								</Button>
							</div>
						) : null}
					</div>

					{/* Compositor — sempre montado (carrinho sobrevive ao voltar); visível
					    no mobile só quando aberto, no desktop como painel fixo ao lado */}
					{isOpen ? (
						<div
							className={cn(
								"min-w-0",
								composerOpen ? "animate-in fade-in-0 slide-in-from-bottom-2 duration-300" : "hidden",
								"lg:block lg:animate-none lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-4",
							)}
						>
							<TabOrderComposer tabId={tab.id} contextLabel={etiqueta} onLaunched={handleLaunched} onExit={closeComposer} />
						</div>
					) : null}
				</div>
			) : null}

			{activeModal === "fechar" && tab ? (
				<CloseTab
					tabId={tab.id}
					consumoParcial={tab.consumoParcial ?? 0}
					closeModal={() => setActiveModal(null)}
					callbacks={{ onSuccess: refresh }}
				/>
			) : null}
			{activeModal === "transferir" && tab ? (
				<TransferTab tabId={tab.id} currentServicePointId={tab.servicePointId} closeModal={() => setActiveModal(null)} callbacks={{ onSuccess: refresh }} />
			) : null}
		</div>
	);
}

function WorkspaceSkeleton() {
	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-3 w-28" />
				<Skeleton className="h-8 w-36" />
				<Skeleton className="h-3 w-64" />
			</div>
			<div className="flex flex-col gap-2.5">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-24 w-full rounded-2xl" />
				<Skeleton className="h-24 w-full rounded-2xl" />
			</div>
		</div>
	);
}
