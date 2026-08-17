import { db } from "@/services/drizzle";
import { cashbackProgramBalances, organizations, sales } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { TCupomVendaDados } from "./templates/cupom-venda";

// Builder único dos `dados` do CUPOM_VENDA — consumido pela impressão manual (rota de gestão) e
// pelo auto-print (lib/desktop-agent/auto-print.ts). Um builder só = cupom manual e automático
// sempre idênticos.
export async function buildCupomVendaDados({ organizacaoId, vendaId }: { organizacaoId: string; vendaId: string }): Promise<TCupomVendaDados> {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizacaoId),
		columns: { nome: true, cnpj: true, telefone: true },
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const sale = await db.query.sales.findFirst({
		where: and(eq(sales.id, vendaId), eq(sales.organizacaoId, organizacaoId)),
		columns: { id: true, dataVenda: true, valorTotal: true, descontosTotal: true, clienteId: true },
		with: {
			cliente: { columns: { id: true, nome: true, telefone: true } },
			itens: {
				columns: { quantidade: true, valorVendaTotalLiquido: true },
				with: {
					produto: { columns: { nome: true } },
					produtoVariante: { columns: { nome: true } },
				},
			},
		},
	});
	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");

	const clientBalance = sale.clienteId
		? await db.query.cashbackProgramBalances.findFirst({
				where: and(eq(cashbackProgramBalances.clienteId, sale.clienteId), eq(cashbackProgramBalances.organizacaoId, organizacaoId)),
				columns: { saldoValorDisponivel: true },
			})
		: null;

	return {
		organizacao: { nome: organization.nome, cnpj: organization.cnpj, telefone: organization.telefone },
		venda: {
			data: sale.dataVenda ?? new Date(),
			itens: sale.itens.map((item) => ({
				descricao: [item.produto?.nome, item.produtoVariante?.nome].filter(Boolean).join(" - ") || "Item",
				quantidade: item.quantidade,
				valorTotal: item.valorVendaTotalLiquido,
			})),
			valorBruto: sale.valorTotal + (sale.descontosTotal ?? 0),
			descontos: sale.descontosTotal ?? 0,
			valorFinal: sale.valorTotal,
		},
		cliente: sale.cliente ? { nome: sale.cliente.nome, telefone: sale.cliente.telefone } : null,
		cashback: clientBalance ? { saldoDisponivel: clientBalance.saldoValorDisponivel } : null,
		identificadorPedido: sale.id.slice(0, 8).toUpperCase(),
	};
}
