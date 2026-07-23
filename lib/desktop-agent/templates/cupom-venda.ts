import { formatDateAsLocale, formatToCNPJ, formatToMoney } from "@/lib/formatting";
import { z } from "zod";

// Cupom não fiscal de venda (finalidade CUPOM_VENDA) — layout v1 para térmica de 80mm via
// driver do SO (largura útil ~72mm). Renderizado no servidor: o agent só entrega ao driver
// (plano, decisão 2). Refinar com o food-service piloto (pergunta em aberto do plano).
export const CupomVendaDadosSchema = z.object({
	organizacao: z.object({
		nome: z.string({
			required_error: "Nome da organização não informado para o cupom.",
			invalid_type_error: "Tipo não válido para o nome da organização.",
		}),
		cnpj: z.string({ invalid_type_error: "Tipo não válido para o CNPJ." }).optional().nullable(),
		telefone: z.string({ invalid_type_error: "Tipo não válido para o telefone." }).optional().nullable(),
	}),
	venda: z.object({
		data: z.coerce.date({ invalid_type_error: "Tipo não válido para a data da venda." }),
		itens: z
			.array(
				z.object({
					descricao: z.string({
						required_error: "Descrição do item não informada.",
						invalid_type_error: "Tipo não válido para a descrição do item.",
					}),
					quantidade: z.number({
						required_error: "Quantidade do item não informada.",
						invalid_type_error: "Tipo não válido para a quantidade do item.",
					}),
					valorTotal: z.number({
						required_error: "Valor total do item não informado.",
						invalid_type_error: "Tipo não válido para o valor total do item.",
					}),
				}),
			)
			.optional()
			.nullable(),
		valorBruto: z.number({
			required_error: "Valor bruto da venda não informado.",
			invalid_type_error: "Tipo não válido para o valor bruto da venda.",
		}),
		descontos: z.number({ invalid_type_error: "Tipo não válido para os descontos." }).optional().nullable(),
		valorFinal: z.number({
			required_error: "Valor final da venda não informado.",
			invalid_type_error: "Tipo não válido para o valor final da venda.",
		}),
	}),
	cliente: z
		.object({
			nome: z.string({ invalid_type_error: "Tipo não válido para o nome do cliente." }).optional().nullable(),
			telefone: z.string({ invalid_type_error: "Tipo não válido para o telefone do cliente." }).optional().nullable(),
		})
		.optional()
		.nullable(),
	cashback: z
		.object({
			valorAcumulado: z.number({ invalid_type_error: "Tipo não válido para o cashback acumulado." }).optional().nullable(),
			saldoDisponivel: z.number({ invalid_type_error: "Tipo não válido para o saldo disponível." }).optional().nullable(),
			terminologia: z.string({ invalid_type_error: "Tipo não válido para a terminologia." }).optional().nullable(),
		})
		.optional()
		.nullable(),
	identificadorPedido: z.string({ invalid_type_error: "Tipo não válido para o identificador do pedido." }).optional().nullable(),
	mensagemRodape: z.string({ invalid_type_error: "Tipo não válido para a mensagem de rodapé." }).optional().nullable(),
});
export type TCupomVendaDados = z.infer<typeof CupomVendaDadosSchema>;

export function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export function renderCupomVendaHtml(dados: TCupomVendaDados) {
	const { organizacao, venda, cliente, cashback } = dados;
	const terminologia = cashback?.terminologia ?? "Cashback";

	const itensHtml = venda.itens?.length
		? `<table class="itens">
			${venda.itens
				.map(
					(item) => `<tr>
				<td class="qtd">${item.quantidade}x</td>
				<td class="desc">${escapeHtml(item.descricao)}</td>
				<td class="val">${formatToMoney(item.valorTotal)}</td>
			</tr>`,
				)
				.join("")}
		</table>
		<div class="sep"></div>`
		: "";

	const descontos = venda.descontos ?? 0;
	const cashbackHtml =
		cashback && (cashback.valorAcumulado != null || cashback.saldoDisponivel != null)
			? `<div class="sep"></div>
		<div class="bloco">
			${cashback.valorAcumulado != null ? `<div class="linha"><span>${escapeHtml(terminologia)} desta compra</span><span>${formatToMoney(cashback.valorAcumulado)}</span></div>` : ""}
			${cashback.saldoDisponivel != null ? `<div class="linha destaque"><span>Saldo disponível</span><span>${formatToMoney(cashback.saldoDisponivel)}</span></div>` : ""}
		</div>`
			: "";

	return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><style>
@page { margin: 0; }
@media print { body { margin: 0; } }
body { margin: 0; padding: 4mm; width: 72mm; box-sizing: border-box; font-family: 'Courier New', monospace; font-size: 9pt; color: #000; background: #fff; }
.centro { text-align: center; }
h1 { margin: 0; font-size: 11pt; text-transform: uppercase; }
p { margin: 0; line-height: 1.35; }
.sep { border-top: 1px dashed #000; margin: 2.5mm 0; }
.linha { display: flex; justify-content: space-between; gap: 2mm; }
.linha.destaque { font-weight: 700; font-size: 10pt; }
.itens { width: 100%; border-collapse: collapse; }
.itens td { padding: 0.5mm 0; vertical-align: top; }
.itens .qtd { width: 9mm; }
.itens .val { text-align: right; white-space: nowrap; }
.rodape { margin-top: 3mm; font-size: 8pt; }
</style></head><body>
<div class="centro">
	<h1>${escapeHtml(organizacao.nome)}</h1>
	${organizacao.cnpj ? `<p>CNPJ: ${escapeHtml(formatToCNPJ(organizacao.cnpj))}</p>` : ""}
	${organizacao.telefone ? `<p>${escapeHtml(organizacao.telefone)}</p>` : ""}
	<p>CUPOM NÃO FISCAL</p>
</div>
<div class="sep"></div>
<p>Data: ${formatDateAsLocale(venda.data, true)}</p>
${dados.identificadorPedido ? `<p>Pedido: ${escapeHtml(dados.identificadorPedido)}</p>` : ""}
${cliente?.nome ? `<p>Cliente: ${escapeHtml(cliente.nome)}</p>` : ""}
<div class="sep"></div>
${itensHtml}
<div class="bloco">
	<div class="linha"><span>Subtotal</span><span>${formatToMoney(venda.valorBruto)}</span></div>
	${descontos > 0 ? `<div class="linha"><span>Descontos</span><span>-${formatToMoney(descontos)}</span></div>` : ""}
	<div class="linha destaque"><span>TOTAL</span><span>${formatToMoney(venda.valorFinal)}</span></div>
</div>
${cashbackHtml}
${dados.mensagemRodape ? `<div class="sep"></div><p class="centro rodape">${escapeHtml(dados.mensagemRodape)}</p>` : ""}
</body></html>`;
}
