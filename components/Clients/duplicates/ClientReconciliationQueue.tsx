"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePendingClientDuplicates, usePendingClientDuplicatesCount } from "@/lib/queries/client-duplicates";
import type { TGetClientDuplicatesOutput } from "@/app/api/clients/duplicates/route";
import { CopyXIcon } from "lucide-react";
import { useState } from "react";

import { ClientReconciliationDialog } from "./ClientReconciliationDialog";

type TPair = NonNullable<TGetClientDuplicatesOutput["data"]["default"]>["items"][number];

const SIGNAL_SHORT_LABELS: Record<string, string> = {
	TELEFONE: "Telefone",
	EMAIL: "E-mail",
	CPF_CNPJ: "CPF/CNPJ",
	INSTAGRAM_USERNAME: "Instagram",
};

/**
 * Fila global de reconciliação: botão no cabeçalho da página de clientes com o
 * total pendente, abrindo a lista de pares — cada par abre o mesmo diálogo de
 * comparação usado pelo pill das páginas de detalhe.
 */
export function ClientReconciliationQueue({ canReconcile }: { canReconcile: boolean }) {
	const [queueOpen, setQueueOpen] = useState(false);
	const [selectedPair, setSelectedPair] = useState<TPair | null>(null);

	const listQuery = usePendingClientDuplicates({ enabled: queueOpen });
	const countQuery = usePendingClientDuplicatesCount();
	const pendingCount = countQuery.data?.items.length ?? 0;

	const pairs = listQuery.data?.pages.flatMap((page) => page.items) ?? [];

	if (pendingCount === 0) return null;

	return (
		<>
			<Button variant="outline" size="sm" onClick={() => setQueueOpen(true)} className="gap-1.5">
				<CopyXIcon className="h-4 w-4" />
				Reconciliação
				<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold tabular-nums text-background">
					{countQuery.data?.nextCursor ? "99+" : pendingCount}
				</span>
			</Button>

			<Dialog open={queueOpen} onOpenChange={setQueueOpen}>
				<DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Reconciliação de clientes</DialogTitle>
						<DialogDescription>Possíveis cadastros duplicados detectados por telefone, e-mail, CPF/CNPJ ou @ do Instagram.</DialogDescription>
					</DialogHeader>

					{listQuery.isLoading ? (
						<div className="space-y-2">
							{[0, 1, 2].map((index) => (
								<div key={index} className="h-14 animate-pulse rounded-lg bg-muted/60" />
							))}
						</div>
					) : pairs.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">Nenhuma duplicidade pendente. Tudo reconciliado.</p>
					) : (
						<ul className="flex flex-col gap-2">
							{pairs.map((pair) => (
								<li key={pair.id}>
									<button
										type="button"
										onClick={() => setSelectedPair(pair)}
										className="flex w-full flex-col gap-1 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-muted/40"
									>
										<span className="text-xs font-semibold">
											{pair.clienteA?.nome ?? "Cliente"} <span className="font-normal text-muted-foreground">×</span> {pair.clienteB?.nome ?? "Cliente"}
										</span>
										<span className="flex flex-wrap gap-1">
											{pair.motivos.map((reason, index) => (
												<Chip.Root
													key={`${reason.tipo}-${index}`}
													variant="muted"
													size="xs"
													shape="pill"
													className="bg-amber-100 text-amber-700 dark:bg-amber-200/20 dark:text-amber-500"
												>
													<Chip.Label>{SIGNAL_SHORT_LABELS[reason.tipo] ?? reason.tipo}</Chip.Label>
												</Chip.Root>
											))}
										</span>
									</button>
								</li>
							))}
							{listQuery.hasNextPage ? (
								<li className="pt-1 text-center">
									<Button type="button" variant="ghost" size="xs" disabled={listQuery.isFetchingNextPage} onClick={() => void listQuery.fetchNextPage()}>
										{listQuery.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
									</Button>
								</li>
							) : null}
						</ul>
					)}
				</DialogContent>
			</Dialog>

			{selectedPair?.clienteA ? (
				<ClientReconciliationDialog
					pairs={[selectedPair]}
					perspectiveClienteId={selectedPair.clienteA.id}
					canReconcile={canReconcile}
					onClose={() => setSelectedPair(null)}
					onResolved={() => {
						void listQuery.refetch();
						void countQuery.refetch();
					}}
				/>
			) : null}
		</>
	);
}
