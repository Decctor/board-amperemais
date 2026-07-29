import type { DBTransaction } from "@/services/drizzle";
import { saleItems, sales } from "@/services/drizzle/schema";
import type { TResolvedSaleItem } from "../resolve-sale-items";

export type TSaleDraftOrigin =
	| { tipo: "AGENTE_IA"; agenteId: string; runId: string; chatId: string; operacaoId: string }
	| { tipo: "POS" };

export async function createSaleDraft({
	tx,
	organizacaoId,
	clienteId,
	itens,
	origem,
	vendedorNome,
	observacoes,
}: {
	tx: DBTransaction;
	organizacaoId: string;
	clienteId: string | null;
	itens: TResolvedSaleItem[];
	origem: TSaleDraftOrigin;
	vendedorNome: string;
	observacoes?: string | null;
}) {
	if (itens.length === 0) throw new Error("Pelo menos um item é obrigatório para criar o orçamento.");

	const valorTotal = itens.reduce((total, item) => total + item.total, 0);
	const custoTotal = itens.reduce((total, item) => total + item.custoTotal, 0);
	const idExterno = origem.tipo === "AGENTE_IA" ? `AI-${origem.operacaoId}` : `POS-${Date.now()}`;

	const [sale] = await tx
		.insert(sales)
		.values({
			organizacaoId,
			clienteId,
			idExterno,
			valorTotal,
			descontosTotal: null,
			acrescimosTotal: null,
			custoTotal,
			vendedorNome,
			vendedorId: null,
			parceiro: "",
			chave: "",
			documento: "",
			modelo: "",
			movimento: "RECEITAS",
			natureza: "",
			serie: "",
			situacao: "",
			tipo: "Venda de produtos",
			canal: origem.tipo === "AGENTE_IA" ? "WHATSAPP" : "POS",
			observacoes: observacoes ?? null,
			rascunhoMetadados: { origem, estoqueReservado: false },
			processamentoOrigem: "INTERNO",
			statusVenda: "ORCAMENTO",
			emissaoFiscalAutomatica: false,
		})
		.returning({ id: sales.id });
	if (!sale) throw new Error("Erro ao criar o orçamento.");

	await tx.insert(saleItems).values(
		itens.map((item) => ({
			organizacaoId,
			vendaId: sale.id,
			clienteId,
			produtoId: item.produtoId,
			produtoVarianteId: item.produtoVarianteId,
			quantidade: item.quantidade,
			valorVendaUnitario: item.preco,
			valorCustoUnitario: item.custo,
			valorVendaTotalBruto: item.total,
			valorTotalDesconto: 0,
			valorVendaTotalLiquido: item.total,
			valorCustoTotal: item.custoTotal,
			metadados: {
				nome: item.nome,
				variacao: item.variacao,
				codigo: item.codigo,
				imagemUrl: item.imagemUrl,
				produtoId: item.produtoId,
				produtoVarianteId: item.produtoVarianteId,
				valorUnitarioBase: item.preco,
				valorModificadores: 0,
				modificadores: [],
			},
		})),
	);

	return {
		orcamentoId: sale.id,
		itens: itens.map((item) => ({
			nome: item.nome,
			variacao: item.variacao,
			quantidade: item.quantidade,
			preco: item.preco,
			total: item.total,
		})),
		valorTotal,
		estoqueReservado: false,
	};
}
