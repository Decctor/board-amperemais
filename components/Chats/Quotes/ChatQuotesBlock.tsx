"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { useClientOpenQuotes } from "@/lib/queries/sales";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ChatQuoteBuilder } from "./ChatQuoteBuilder";
import { ChatQuotesList } from "./ChatQuotesList";
import type { TQuotePermissions } from "./config";
import { buildQuoteMessage } from "./quote-message";

/**
 * Bloco de orçamentos no painel de contexto do atendimento.
 *
 * Fica acima de "Oportunidades agora" porque pendência acionável ganha de sugestão de cross-sell: um
 * orçamento em aberto é dinheiro esperando uma resposta.
 *
 * Compartilha a chave de consulta com a pill do header, então abrir a aba não gera requisição nova.
 * Ao contrário das outras seções da aba, este bloco renderiza mesmo vazio quando o usuário pode
 * orçar — é onde o recurso se ensina.
 */

type ChatQuotesBlockProps = {
	chatId: string;
	clientId: string | null;
	clientName: string;
	permissions: TQuotePermissions;
	onInsertInConversation?: (texto: string) => void;
};

export function ChatQuotesBlock({ chatId, clientId, clientName, permissions, onInsertInConversation }: ChatQuotesBlockProps) {
	const [isBuilderOpen, setIsBuilderOpen] = useState(false);
	const { data, isPending, isError, error } = useClientOpenQuotes({ clientId });

	if (!clientId) return null;

	const quotes = data?.orcamentos ?? [];
	// Sem orçamento e sem permissão de criar não há nada a dizer: a seção desaparece em vez de
	// ocupar espaço com um vazio permanente.
	if (!isPending && !isError && quotes.length === 0 && !permissions.criar) return null;

	return (
		<div className="border-t border-border pt-3">
			<div className="mb-1 flex items-baseline justify-between gap-2">
				<h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Orçamentos em aberto</h3>
				{quotes.length > 0 && <span className="text-xs font-bold tabular-nums">{formatToMoney(data?.valorTotalEmAberto ?? 0)}</span>}
			</div>

			{isPending ? (
				<div className="flex flex-col gap-1.5">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : isError ? (
				<p className="py-2 text-xs text-destructive">{getErrorMessage(error)}</p>
			) : quotes.length === 0 ? (
				<p className="py-1 text-[11px] leading-snug text-muted-foreground">
					Nenhum orçamento em aberto. Monte um a partir da conversa — descontos, entrega e pagamento ficam para o checkout.
				</p>
			) : (
				<ChatQuotesList
					clientId={clientId}
					quotes={quotes}
					permissions={permissions}
					onInsertInConversation={onInsertInConversation ? (quote) => onInsertInConversation(buildQuoteMessage(quote)) : undefined}
				/>
			)}

			{permissions.criar && (
				<Button variant="outline" size="sm" className="mt-2 w-full text-xs" onClick={() => setIsBuilderOpen(true)}>
					<Plus className="size-3.5" />
					Novo orçamento
				</Button>
			)}

			{permissions.criar && (
				<ChatQuoteBuilder
					open={isBuilderOpen}
					onOpenChange={setIsBuilderOpen}
					clientId={clientId}
					chatId={chatId}
					clientName={clientName}
					onInsertInConversation={onInsertInConversation ? (quote) => onInsertInConversation(buildQuoteMessage(quote)) : undefined}
				/>
			)}
		</div>
	);
}
