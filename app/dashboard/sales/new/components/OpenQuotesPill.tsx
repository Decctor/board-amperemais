"use client";

import { formatQuoteAge, getQuoteOriginDisplay, isQuoteStale, type TQuotePermissions } from "@/components/Chats/Quotes/config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { cancelSaleDraft } from "@/lib/mutations/pos";
import { appRoutes } from "@/lib/navigation/routes";
import { type TClientOpenQuote, getOrganizationOpenQuotesQueryKey, useOrganizationOpenQuotes } from "@/lib/queries/sales";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleUser, FileText, Loader2, ShoppingBag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Orçamentos em aberto no PDV.
 *
 * Um orçamento é uma venda que parou no meio: alguém pediu, o preço foi montado, e falta cobrar.
 * Fora do atendimento não havia superfície nenhuma que os mostrasse — quem está no balcão só
 * encontrava um orçamento passando pelo histórico e sabendo o nome do cliente. A pill traz a fila
 * para o lugar onde a venda acontece.
 *
 * O cliente é a âncora da linha (ao contrário da lista do atendimento, onde o cliente já é o
 * contexto): quem chega no balcão se identifica por nome, não por número de orçamento.
 *
 * O detalhe abre por clique e teclado, não por hover — popover dependente de hover não existe em
 * toque, e o PDV é operado em tablet.
 */

type OpenQuotesPillProps = {
	/** `vendas.visualizar` — mesmo gate da rota para a fila da organização. */
	canViewQuotes: boolean;
	permissions: TQuotePermissions;
	/**
	 * Itens da venda em curso. O carrinho do PDV é estado local: sair para o checkout de um
	 * orçamento descarta o que estiver montado, então a saída é confirmada quando há o que perder.
	 */
	cartItemCount: number;
};

export default function OpenQuotesPill({ canViewQuotes, permissions, cartItemCount }: OpenQuotesPillProps) {
	const router = useRouter();
	const { data } = useOrganizationOpenQuotes({ enabled: canViewQuotes });
	const [pendingQuoteId, setPendingQuoteId] = useState<string | null>(null);

	const quotes = data?.orcamentos ?? [];
	const total = data?.total ?? 0;

	function openCheckout(quoteId: string) {
		// Carrinho vazio não tem o que perder: a confirmação só apareceria como atrito.
		if (cartItemCount > 0) {
			setPendingQuoteId(quoteId);
			return;
		}
		router.push(appRoutes.sales.checkout(quoteId));
	}

	// Erro e carregamento não renderizam nada: a pill é informação ambiente e não pode piscar um
	// esqueleto sobre a busca de produtos nem quebrar o PDV.
	if (!canViewQuotes || total === 0) return null;

	const label = total === 1 ? "orçamento em aberto" : "orçamentos em aberto";
	const summary = `${total} ${label} · ${formatToMoney(data?.valorTotalEmAberto ?? 0)}`;
	// A lista mostra os mais recentes; o `total` conta todos. Sem esta linha a pill diria "45" sobre
	// uma lista de 30 e pareceria quebrada.
	const hiddenCount = total - quotes.length;

	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label={`${summary}. Ver detalhes.`}
						className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						<FileText className="size-3.5 shrink-0" />
						<span className="tabular-nums">{total}</span>
						<span className="hidden uppercase tracking-tight sm:inline">{label}</span>
					</button>
				</PopoverTrigger>

				<PopoverContent align="end" className="w-[min(26rem,92vw)] p-3">
					<div className="mb-2 flex items-baseline justify-between gap-2">
						<h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Orçamentos em aberto</h3>
						<span className="text-xs font-bold tabular-nums">{formatToMoney(data?.valorTotalEmAberto ?? 0)}</span>
					</div>

					<ul className="max-h-[min(26rem,60vh)] divide-y divide-border overflow-y-auto rounded-lg border border-border">
						{quotes.map((quote) => (
							<OpenQuoteRow key={quote.id} quote={quote} permissions={permissions} onOpenCheckout={() => openCheckout(quote.id)} />
						))}
					</ul>

					{hiddenCount > 0 ? (
						<p className="mt-2 text-center text-[11px] text-muted-foreground">
							Mostrando os {quotes.length} mais recentes de {total}. Veja os demais no histórico de vendas.
						</p>
					) : null}
				</PopoverContent>
			</Popover>

			<Dialog open={!!pendingQuoteId} onOpenChange={(open) => !open && setPendingQuoteId(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>DESCARTAR A VENDA EM CURSO?</DialogTitle>
						<DialogDescription>
							Você tem {cartItemCount} {cartItemCount === 1 ? "item" : "itens"} no carrinho. Abrir o checkout do orçamento sai desta tela e o que está
							montado aqui será perdido.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-2">
						<Button variant="ghost" onClick={() => setPendingQuoteId(null)}>
							CONTINUAR AQUI
						</Button>
						<Button
							onClick={() => {
								const quoteId = pendingQuoteId;
								setPendingQuoteId(null);
								if (quoteId) router.push(appRoutes.sales.checkout(quoteId));
							}}
						>
							<ShoppingBag className="size-4" />
							ABRIR CHECKOUT
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function OpenQuoteRow({
	quote,
	permissions,
	onOpenCheckout,
}: {
	quote: TClientOpenQuote;
	permissions: TQuotePermissions;
	onOpenCheckout: () => void;
}) {
	const queryClient = useQueryClient();
	const origin = getQuoteOriginDisplay(quote.origem);
	const age = formatQuoteAge(quote.criadoEm);
	const stale = isQuoteStale(quote.criadoEm);
	// Três nomes bastam para reconhecer o orçamento; o resto vira "+N" em vez de esticar a linha.
	const preview = [
		...quote.itens.slice(0, 3).map((item) => (item.variacao ? `${item.nome} (${item.variacao})` : item.nome)),
		...(quote.itens.length > 3 ? [`+${quote.itens.length - 3}`] : []),
	].join(", ");

	const { mutate: cancel, isPending: isCancelling } = useMutation({
		mutationKey: ["cancel-quote", quote.id],
		mutationFn: () => cancelSaleDraft(quote.id),
		onSuccess: () => {
			toast.success("Orçamento cancelado.");
			void queryClient.invalidateQueries({ queryKey: getOrganizationOpenQuotesQueryKey() });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<li className="flex flex-col gap-1.5 px-2.5 py-2.5">
			<div className="flex items-baseline justify-between gap-2">
				<span className="flex min-w-0 items-center gap-1.5">
					<CircleUser className="size-3.5 shrink-0 text-foreground/60" />
					<span className="truncate text-xs font-bold uppercase tracking-tight">{quote.clienteNome ?? "AO CONSUMIDOR"}</span>
				</span>
				<span className="shrink-0 text-sm font-extrabold tabular-nums">{formatToMoney(quote.valorTotal)}</span>
			</div>

			<div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
				<span className="inline-flex items-center gap-1 font-bold uppercase tracking-[0.06em]">
					<origin.Icon className="size-3" />
					{origin.label}
				</span>
				<span aria-hidden="true">·</span>
				<span className="tabular-nums">
					{quote.qtdeItens} {quote.qtdeItens === 1 ? "item" : "itens"}
				</span>
				{age && (
					<>
						<span aria-hidden="true">·</span>
						<span>{age}</span>
					</>
				)}
				{stale && <span className="rounded-full border border-border px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.06em]">Antigo</span>}
			</div>

			{preview.length > 0 && <p className="truncate text-[11px] text-foreground/80">{preview}</p>}

			<div className="mt-0.5 flex flex-wrap items-center gap-1">
				{permissions.editar && (
					<Button variant="outline" size="xs" className="text-[11px]" onClick={onOpenCheckout}>
						<ShoppingBag className="size-3" />
						Abrir checkout
					</Button>
				)}

				{permissions.cancelar && (
					<Button
						variant="ghost"
						size="xs"
						className="ml-auto text-[11px] text-muted-foreground hover:text-destructive"
						disabled={isCancelling}
						onClick={() => cancel()}
					>
						{isCancelling ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
						Cancelar
					</Button>
				)}
			</div>
		</li>
	);
}
