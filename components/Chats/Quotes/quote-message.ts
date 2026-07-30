import { formatToMoney } from "@/lib/formatting";

/**
 * Texto do orçamento inserido na conversa.
 *
 * Não envia nada: preenche o campo de mensagem para que o atendente revise e envie. Isso mantém as
 * travas existentes do compositor (posse do atendimento e janela de 24h do WhatsApp) valendo, sem
 * abrir um caminho de envio paralelo.
 *
 * A frase sobre estoque é obrigatória: o orçamento não reserva nada, e prometer disponibilidade é o
 * erro mais caro que este fluxo pode causar.
 */

export type TQuoteMessageItem = {
	nome: string;
	variacao: string | null;
	quantidade: number;
	total: number;
};

/** Quantidade fracionada é real (0,5 kg), mas "1 un." lê melhor que "1,000". */
function formatQuantity(quantidade: number) {
	return Number.isInteger(quantidade) ? String(quantidade) : quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function buildQuoteMessage({ itens, valorTotal }: { itens: TQuoteMessageItem[]; valorTotal: number }) {
	const lines = itens.map((item) => {
		const nome = item.variacao ? `${item.nome} (${item.variacao})` : item.nome;
		return `• ${formatQuantity(item.quantidade)}x ${nome} — ${formatToMoney(item.total)}`;
	});

	return ["Segue o orçamento:", "", ...lines, "", `Total: ${formatToMoney(valorTotal)}`, "", "Os valores não reservam estoque."].join("\n");
}
