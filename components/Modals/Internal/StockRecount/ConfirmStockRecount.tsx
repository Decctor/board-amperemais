"use client";

import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces } from "@/lib/formatting";
import { applyStockRecount } from "@/lib/mutations/stock-recount";
import { useStockRecountBalances } from "@/lib/queries/stock-recount";
import { cn } from "@/lib/utils";
import { stockRecountEntryKey, type TStockRecountDraftEntry } from "@/state-hooks/use-stock-recount-draft";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, Equal, MessageSquareText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ConfirmStockRecountProps = {
	entries: TStockRecountDraftEntry[];
	clearEntry: (key: string) => void;
	closeModal: () => void;
	callbacks?: {
		onMutate?: (variables: Parameters<typeof applyStockRecount>[0]) => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

function entryDisplayName(entry: TStockRecountDraftEntry) {
	return entry.varianteNome ? `${entry.nome} — ${entry.varianteNome}` : entry.nome;
}

function DeltaChip({ delta }: { delta: number }) {
	const className = cn(
		"inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.7rem] font-bold tabular-nums",
		delta > 0 && "bg-success/15 text-success",
		delta < 0 && "bg-destructive/15 text-destructive",
		delta === 0 && "bg-muted text-muted-foreground",
	);
	const label = delta > 0 ? `+${formatDecimalPlaces(delta)}` : delta < 0 ? `-${formatDecimalPlaces(Math.abs(delta))}` : "0";
	return <span className={className}>{label}</span>;
}

/**
 * Passo de confirmação da recontagem. Os diffs exibidos (e aplicados) são calculados contra o saldo
 * mais fresco buscado ao abrir o menu — nunca contra o saldo visto no momento da digitação, que
 * pode ter mudado com vendas/compras no meio da contagem.
 */
export default function ConfirmStockRecount({ entries, clearEntry, closeModal, callbacks }: ConfirmStockRecountProps) {
	const [reason, setReason] = useState("");

	const entityIds = useMemo(() => entries.map((entry) => stockRecountEntryKey(entry.produtoId, entry.produtoVarianteId)), [entries]);
	const { data: freshRows, isLoading, error } = useStockRecountBalances({ entityIds });

	const buckets = useMemo(() => {
		const freshByKey = new Map((freshRows ?? []).map((row) => [stockRecountEntryKey(row.produtoId, row.produtoVarianteId), row]));

		const adjustable: Array<{ entry: TStockRecountDraftEntry; saldoAtual: number; delta: number; saldoMudou: boolean }> = [];
		const unchanged: Array<{ entry: TStockRecountDraftEntry; saldoAtual: number }> = [];
		const unavailable: TStockRecountDraftEntry[] = [];

		for (const entry of entries) {
			const fresh = freshByKey.get(stockRecountEntryKey(entry.produtoId, entry.produtoVarianteId));
			if (!fresh || !fresh.rastreamentoEstoqueAtivo) {
				unavailable.push(entry);
				continue;
			}
			const delta = entry.quantidadeContada - fresh.quantidade;
			if (delta === 0) unchanged.push({ entry, saldoAtual: fresh.quantidade });
			else adjustable.push({ entry, saldoAtual: fresh.quantidade, delta, saldoMudou: fresh.quantidade !== entry.quantidadeReferencia });
		}

		return { adjustable, unchanged, unavailable };
	}, [entries, freshRows]);

	// Entidades indisponíveis (excluídas ou sem rastreamento) ficam fora do payload — o servidor
	// abortaria a transação inteira com NotFound. Itens sem diferença vão junto para o resumo
	// do servidor refletir o que o usuário viu.
	const payloadItems = useMemo(
		() =>
			[...buckets.adjustable, ...buckets.unchanged].map(({ entry }) => ({
				produtoId: entry.produtoId,
				produtoVarianteId: entry.produtoVarianteId,
				quantidadeContada: entry.quantidadeContada,
			})),
		[buckets],
	);

	const { mutate, isPending } = useMutation({
		mutationKey: ["apply-stock-recount"],
		mutationFn: applyStockRecount,
		onMutate: (variables) => callbacks?.onMutate?.(variables),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="APLICAR RECONTAGEM"
			menuDescription="Revise as diferenças calculadas contra o saldo atual antes de registrar os ajustes."
			menuActionButtonText="APLICAR RECONTAGEM"
			menuActionButtonDisabled={payloadItems.length === 0}
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate({ itens: payloadItems, motivo: reason })}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
			drawerVariant="lg"
			lockClose={isPending}
		>
			<ResponsiveMenuSection title={`Ajustes (${buckets.adjustable.length})`} icon={<ClipboardCheck className="h-4 w-4" />}>
				{buckets.adjustable.length > 0 ? (
					<div className="flex flex-col gap-1.5">
						{buckets.adjustable.map(({ entry, saldoAtual, delta, saldoMudou }) => (
							<div
								key={stockRecountEntryKey(entry.produtoId, entry.produtoVarianteId)}
								className="border-border bg-muted/20 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
							>
								<div className="flex min-w-0 flex-col">
									<span className="truncate text-sm font-semibold tracking-tight">{entryDisplayName(entry)}</span>
									<span className="text-muted-foreground text-xs tabular-nums">
										{formatDecimalPlaces(saldoAtual)} → {formatDecimalPlaces(entry.quantidadeContada)} {entry.unidade}
									</span>
									{saldoMudou ? (
										<span className="text-muted-foreground mt-0.5 inline-flex items-center gap-1 text-[0.7rem]">
											<AlertTriangle className="h-3 w-3 min-h-3 min-w-3" />
											Saldo mudou desde a contagem (era {formatDecimalPlaces(entry.quantidadeReferencia)})
										</span>
									) : null}
								</div>
								<DeltaChip delta={delta} />
							</div>
						))}
					</div>
				) : (
					<p className="text-muted-foreground text-xs">Nenhuma diferença entre a contagem e os saldos atuais.</p>
				)}
			</ResponsiveMenuSection>

			{buckets.unchanged.length > 0 ? (
				<ResponsiveMenuSection title={`Sem diferença (${buckets.unchanged.length})`} icon={<Equal className="h-4 w-4" />}>
					<div className="flex flex-col gap-1">
						{buckets.unchanged.map(({ entry, saldoAtual }) => (
							<p key={stockRecountEntryKey(entry.produtoId, entry.produtoVarianteId)} className="text-muted-foreground truncate text-xs">
								{entryDisplayName(entry)} · {formatDecimalPlaces(saldoAtual)} {entry.unidade} — nenhum ajuste será registrado.
							</p>
						))}
					</div>
				</ResponsiveMenuSection>
			) : null}

			{buckets.unavailable.length > 0 ? (
				<ResponsiveMenuSection title={`Indisponíveis (${buckets.unavailable.length})`} icon={<AlertTriangle className="h-4 w-4" />}>
					<div className="flex flex-col gap-1.5">
						{buckets.unavailable.map((entry) => {
							const key = stockRecountEntryKey(entry.produtoId, entry.produtoVarianteId);
							return (
								<div key={key} className="border-border flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
									<div className="flex min-w-0 flex-col">
										<span className="truncate text-sm font-medium">{entryDisplayName(entry)}</span>
										<span className="text-muted-foreground text-xs">Produto excluído ou sem rastreamento de estoque ativo.</span>
									</div>
									<Button type="button" variant="ghost" size="sm" onClick={() => clearEntry(key)}>
										<X className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
										REMOVER
									</Button>
								</div>
							);
						})}
					</div>
				</ResponsiveMenuSection>
			) : null}

			<ResponsiveMenuSection title="Motivo" icon={<MessageSquareText className="h-4 w-4" />}>
				<TextareaInput label="Motivo" placeholder="Recontagem de estoque" value={reason} handleChange={setReason} />
				<p className="text-muted-foreground text-xs">
					Cada ajuste gera uma movimentação de estoque do tipo AJUSTE no saldo do produto/variante. Saldos de lotes não são reconciliados pela recontagem.
				</p>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}
