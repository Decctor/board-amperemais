"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { cancelSaleDraft } from "@/lib/mutations/pos";
import { getClientOpenQuotesQueryKey, type TClientOpenQuote } from "@/lib/queries/sales";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CornerUpLeft, ExternalLink, Loader2, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { formatQuoteAge, getQuoteOriginDisplay, isQuoteStale, type TQuotePermissions } from "./config";

/**
 * Linhas de orçamento em aberto, compartilhadas pelo popover do header e pelo bloco do painel de
 * contexto. Uma implementação só porque as duas superfícies precisam dizer exatamente a mesma coisa —
 * duplicar a linha é como "abrir checkout" acaba significando coisas diferentes em dois lugares.
 */

type ChatQuotesListProps = {
	clientId: string;
	quotes: TClientOpenQuote[];
	permissions: TQuotePermissions;
	/** Ausente quando a conversa não pode receber mensagem (sem posse ou fora da janela de 24h). */
	onInsertInConversation?: (quote: TClientOpenQuote) => void;
	className?: string;
};

function QuoteRow({
	quote,
	clientId,
	permissions,
	onInsertInConversation,
}: {
	quote: TClientOpenQuote;
	clientId: string;
	permissions: TQuotePermissions;
	onInsertInConversation?: (quote: TClientOpenQuote) => void;
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
			void queryClient.invalidateQueries({ queryKey: getClientOpenQuotesQueryKey(clientId) });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<li className="flex flex-col gap-1.5 px-2.5 py-2.5">
			<div className="flex items-baseline justify-between gap-2">
				<span className="text-sm font-extrabold tabular-nums">{formatToMoney(quote.valorTotal)}</span>
				<span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
					<origin.Icon className="size-3" />
					{origin.label}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
				<span className="tabular-nums">
					{quote.qtdeItens} {quote.qtdeItens === 1 ? "item" : "itens"}
				</span>
				{age && (
					<>
						<span aria-hidden="true">·</span>
						<span>{age}</span>
					</>
				)}
				{stale && (
					<span className="rounded-full border border-border px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.06em]">Antigo</span>
				)}
			</div>

			{preview.length > 0 && <p className="truncate text-[11px] text-foreground/80">{preview}</p>}

			<div className="mt-0.5 flex flex-wrap items-center gap-1">
				{permissions.editar && (
					<Button asChild variant="outline" size="xs" className="text-[11px]">
						{/* Nova aba: quem fecha um orçamento está no meio de um atendimento, e perder a
						    conversa para navegar até o checkout custa mais que o ganho. */}
						<a href={`/dashboard/commercial/sales/checkout/${quote.id}`} target="_blank" rel="noopener noreferrer">
							<ShoppingBag className="size-3" />
							Abrir checkout
							<ExternalLink className="size-2.5 opacity-60" />
							<span className="sr-only">abre em nova aba</span>
						</a>
					</Button>
				)}

				{onInsertInConversation && (
					<Button variant="ghost" size="xs" className="text-[11px] text-muted-foreground" onClick={() => onInsertInConversation(quote)}>
						<CornerUpLeft className="size-3" />
						Inserir na conversa
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

export function ChatQuotesList({ clientId, quotes, permissions, onInsertInConversation, className }: ChatQuotesListProps) {
	return (
		<ul className={cn("divide-y divide-border overflow-hidden rounded-lg border border-border", className)}>
			{quotes.map((quote) => (
				<QuoteRow
					key={quote.id}
					quote={quote}
					clientId={clientId}
					permissions={permissions}
					onInsertInConversation={onInsertInConversation}
				/>
			))}
		</ul>
	);
}
