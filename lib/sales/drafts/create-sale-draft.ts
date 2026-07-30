import type { DBTransaction } from "@/services/drizzle";
import { saleItems, sales } from "@/services/drizzle/schema";
import type { TResolvedSaleItem } from "../resolve-sale-items";

export type TSaleDraftOrigin =
	| { tipo: "AGENTE_IA"; agenteId: string; runId: string; chatId: string; operacaoId: string }
	| { tipo: "HUB"; usuarioId: string; chatId: string | null }
	| { tipo: "POS" };

/**
 * Canal do rascunho: quem nasce de uma conversa é WHATSAPP (agente ou atendente do hub), o resto é POS.
 * O canal alimenta atribuição e relatórios — um orçamento montado no hub não é venda de balcão.
 */
function resolveDraftChannel(origem: TSaleDraftOrigin) {
	return origem.tipo === "POS" ? "POS" : "WHATSAPP";
}

/**
 * A operação durável do agente já é única por (organização, tipo, chave), então serve de `idExterno`.
 * O hub não tem esse envelope: usa UUID em vez do `Date.now()` legado do POS, que colide sob concorrência.
 */
function resolveDraftExternalId(origem: TSaleDraftOrigin) {
	if (origem.tipo === "AGENTE_IA") return `AI-${origem.operacaoId}`;
	if (origem.tipo === "HUB") return `HUB-${crypto.randomUUID()}`;
	return `POS-${Date.now()}`;
}

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
	const idExterno = resolveDraftExternalId(origem);

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
			canal: resolveDraftChannel(origem),
			observacoes: observacoes ?? null,
			// `sales` não tem coluna de criação (`dataVenda` só nasce na confirmação), então o instante
			// vive no metadado do rascunho. É o que permite ordenar e envelhecer orçamento em aberto
			// sem inventar data. Ver `resolveQuoteCreationDate` em lib/sales/quote-freshness.ts.
			rascunhoMetadados: { origem, estoqueReservado: false, criadoEm: new Date().toISOString() },
			processamentoOrigem: "INTERNO",
			statusVenda: "ORCAMENTO",
			// `null` = herda `organizations.fiscalEmissaoAutomatica` na confirmação. Gravar `false` aqui
			// travava a emissão automática de todo orçamento criado por este serviço, mesmo com a
			// organização configurada para emitir — o POS e a loja digital sempre herdaram.
			emissaoFiscalAutomatica: null,
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
