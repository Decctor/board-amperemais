import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { createSaleDraft } from "@/lib/sales/drafts/create-sale-draft";
import { resolveQuoteCreationDate } from "@/lib/sales/quote-freshness";
import { SaleItemResolutionError, resolveSaleItems } from "@/lib/sales/resolve-sale-items";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const GetQuotesInputSchema = z.object({
	clientId: z.string({ required_error: "ID do cliente não informado.", invalid_type_error: "Tipo inválido para ID do cliente." }),
});
export type TGetQuotesInput = z.infer<typeof GetQuotesInputSchema>;

/**
 * Mesma superfície de entrada da ferramenta `orcamentos.criar` do agente: só referência de catálogo e
 * quantidade. Preço, custo, total, desconto, cupom, cashback e status não são aceitos do cliente —
 * o servidor reconsulta o catálogo e calcula tudo em `resolveSaleItems`.
 */
const CreateQuoteInputSchema = z
	.object({
		clientId: z.string({ required_error: "ID do cliente não informado.", invalid_type_error: "Tipo inválido para ID do cliente." }),
		chatId: z.string({ invalid_type_error: "Tipo inválido para ID da conversa." }).optional().nullable(),
		items: z
			.array(
				// As chaves aninhadas são a referência de catálogo e viajam com o nome da entidade.
				z
					.object({
						produtoId: z.string({ required_error: "ID do produto não informado." }).min(1),
						produtoVarianteId: z.string({ invalid_type_error: "Tipo inválido para ID da variação." }).min(1).optional().nullable(),
						quantidade: z.number({ required_error: "Quantidade não informada." }).positive(),
					})
					.strict(),
			)
			.min(1, "Pelo menos um item é obrigatório.")
			.max(50, "Um orçamento aceita no máximo 50 itens."),
		observations: z.string({ invalid_type_error: "Tipo inválido para observações." }).max(500).optional().nullable(),
	})
	.strict();
export type TCreateQuoteInput = z.infer<typeof CreateQuoteInputSchema>;

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Um orçamento em aberto é a interseção estreita de um status sobrecarregado: `ORCAMENTO` também
 * marca pedido da loja digital aguardando confirmação e rascunho de conta de atendimento. Sem os
 * três filtros abaixo a lista mentiria para quem atende.
 */
const QUOTES_FETCH_LIMIT = 50;
const QUOTES_RETURN_LIMIT = 20;

export type TOpenQuoteOrigin = "AGENTE_IA" | "HUB" | "POS" | "OUTRO";

function resolveQuoteOrigin({ rascunhoMetadados, canal }: { rascunhoMetadados: unknown; canal: string | null }): TOpenQuoteOrigin {
	const origem =
		rascunhoMetadados && typeof rascunhoMetadados === "object" && "origem" in rascunhoMetadados
			? (rascunhoMetadados as { origem?: { tipo?: unknown } }).origem
			: null;
	const tipo = origem?.tipo;

	if (tipo === "AGENTE_IA" || tipo === "HUB" || tipo === "POS") return tipo;
	// Rascunho do POS anterior ao serviço compartilhado não grava `origem`.
	if (canal === "POS") return "POS";
	return "OUTRO";
}

async function getQuotes({ input, session }: { input: TGetQuotesInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const rows = await db.query.sales.findMany({
		where: (fields, { and, eq, isNull, ne, or }) =>
			and(
				eq(fields.organizacaoId, organizacaoId),
				eq(fields.clienteId, input.clientId),
				eq(fields.statusVenda, "ORCAMENTO"),
				eq(fields.processamentoOrigem, "INTERNO"),
				// Conta de atendimento se gerencia pelo board de Mesas & Comandas (invariante 11).
				isNull(fields.tabId),
				// `canal` é nullable: `ne` sozinho descartaria as linhas NULL em silêncio.
				or(isNull(fields.canal), ne(fields.canal, "SHOP")),
			),
		columns: {
			id: true,
			idExterno: true,
			valorTotal: true,
			canal: true,
			vendedorNome: true,
			observacoes: true,
			rascunhoMetadados: true,
		},
		with: {
			itens: {
				// Preço de venda e total do item; custo e margem nunca saem daqui — orçamento é
				// artefato de cliente, e a lista alimenta a mensagem enviada na conversa.
				columns: { id: true, quantidade: true, valorVendaUnitario: true, valorVendaTotalLiquido: true },
				with: {
					produto: { columns: { nome: true } },
					produtoVariante: { columns: { nome: true } },
				},
			},
		},
		limit: QUOTES_FETCH_LIMIT,
	});

	const quotes = rows
		.map((row) => ({
			id: row.id,
			idExterno: row.idExterno,
			valorTotal: row.valorTotal,
			qtdeItens: row.itens.length,
			itens: row.itens.map((item) => ({
				nome: item.produto?.nome ?? "Item",
				variacao: item.produtoVariante?.nome ?? null,
				quantidade: item.quantidade,
				preco: item.valorVendaUnitario,
				total: item.valorVendaTotalLiquido,
			})),
			origem: resolveQuoteOrigin({ rascunhoMetadados: row.rascunhoMetadados, canal: row.canal }),
			vendedorNome: row.vendedorNome,
			observacoes: row.observacoes,
			criadoEm: resolveQuoteCreationDate({ rascunhoMetadados: row.rascunhoMetadados, idExterno: row.idExterno }),
		}))
		// Sem coluna de criação não há como ordenar no banco: a ordenação acontece sobre a data
		// reconstruída, e o que não tem data vai para o fim em vez de fingir ser recente.
		.sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0))
		.slice(0, QUOTES_RETURN_LIMIT);

	return {
		data: {
			orcamentos: quotes,
			valorTotalEmAberto: quotes.reduce((total, quote) => total + quote.valorTotal, 0),
		},
		message: "Orçamentos em aberto carregados com sucesso.",
	};
}
export type TGetQuotesOutput = Awaited<ReturnType<typeof getQuotes>>;

/**
 * Criação de orçamento pelo atendente, reusando as duas peças que o agente já usa:
 * `resolveSaleItems` (resolução autoritativa e isolada por organização) e `createSaleDraft`
 * (venda `ORCAMENTO` transacional, sem efeito de estoque, caixa ou fiscal).
 *
 * O orçamento não recebe desconto, cupom, cashback, recompensa, entrega nem pagamento: tudo isso
 * exige autorização, caixa aberto ou endereço, e vive no checkout.
 */
async function createQuote({ input, session }: { input: TCreateQuoteInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership?.permissoes.vendas.criar) throw new createHttpError.Forbidden("Você não possui permissão para criar orçamentos.");

	const client = await db.query.clients.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.clientId), eq(fields.organizacaoId, organizacaoId)),
		columns: { id: true },
	});
	if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");

	// A conversa é rastreabilidade, não autorização: precisa existir na organização e pertencer ao
	// mesmo cliente, senão o orçamento nasceria apontando para um atendimento alheio.
	if (input.chatId) {
		const chat = await db.query.chats.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.chatId as string), eq(fields.organizacaoId, organizacaoId)),
			columns: { id: true, clienteId: true },
		});
		if (!chat) throw new createHttpError.NotFound("Conversa não encontrada.");
		if (chat.clienteId !== input.clientId) throw new createHttpError.BadRequest("A conversa informada não pertence a este cliente.");
	}

	try {
		const result = await db.transaction(async (tx) => {
			const itens = await resolveSaleItems({ db: tx, organizacaoId, itens: input.items });
			return createSaleDraft({
				tx,
				organizacaoId,
				clienteId: input.clientId,
				itens,
				origem: { tipo: "HUB", usuarioId: session.user.id, chatId: input.chatId ?? null },
				vendedorNome: session.user.nome,
				observacoes: input.observations,
			});
		});

		return { data: result, message: "Orçamento criado com sucesso." };
	} catch (error) {
		// A mensagem do resolvedor já nomeia o produto que bloqueou ("O produto X está sem preço de
		// venda."), então vale mais que um erro genérico — sobe como 400 legível para quem atende.
		if (error instanceof SaleItemResolutionError) throw new createHttpError.BadRequest(error.message);
		throw error;
	}
}
export type TCreateQuoteOutput = Awaited<ReturnType<typeof createQuote>>;

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

async function getQuotesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const input = GetQuotesInputSchema.parse({ clientId: searchParams.get("clientId") });
	const result = await getQuotes({ input, session });
	return NextResponse.json(result);
}

async function createQuoteRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const body = await request.json();
	const input = CreateQuoteInputSchema.parse(body);
	const result = await createQuote({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getQuotesRoute });
export const POST = appApiHandler({ POST: createQuoteRoute });
