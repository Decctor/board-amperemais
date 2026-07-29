import { completeAgentOperation } from "@/lib/ai/operations/lifecycle";
import { createSaleDraft } from "@/lib/sales/drafts/create-sale-draft";
import { resolveSaleItems, SaleItemResolutionError } from "@/lib/sales/resolve-sale-items";
import type { DB, DBTransaction } from "@/services/drizzle";
import z from "zod";
import { defineAgentTool } from "./define-tool";
import type { TAgentToolContext, TAgentToolOutput } from "./types";

export const QuoteInputSchema = z.object({
	itens: z
		.array(
			z
				.object({
					produtoId: z.string().min(1).describe("ID exato do produto retornado pela consulta de catálogo."),
					produtoVarianteId: z.string().min(1).optional().nullable().describe("ID exato da variação escolhida, quando houver."),
					quantidade: z.number().positive().describe("Quantidade solicitada pelo cliente."),
				})
				.strict(),
		)
		.min(1)
		.max(50),
	observacoes: z.string().max(500).optional().describe("Observação curta informada pelo cliente para o orçamento."),
}).strict();

async function inTransaction<T>(database: DB | DBTransaction, callback: (tx: DBTransaction) => Promise<T>): Promise<T> {
	if ("transaction" in database && typeof database.transaction === "function") return database.transaction(callback);
	return callback(database as DBTransaction);
}

function blockedOutput(error: SaleItemResolutionError, context: TAgentToolContext): TAgentToolOutput {
	return {
		success: false,
		message: "Alguns itens precisam ser confirmados pela equipe antes do orçamento.",
		result: {
			codigo: error.code,
			produtos: error.produtos,
			acao: context.capacidades.comercial.orcamentos.bloqueio,
		},
	};
}

export const quotesTool = defineAgentTool({
	name: "orcamentos.criar",
	description: `Cria um orçamento no sistema com os produtos, variações e quantidades solicitados pelo cliente.

Use somente depois de consultar o catálogo e esclarecer todos os produtos, variações e quantidades.
Passe apenas os IDs retornados pela ferramenta de produtos. Não calcule nem envie preços, custos,
descontos ou totais: o servidor consulta o catálogo e calcula tudo.

O orçamento é um rascunho: não reserva estoque, não confirma a venda e não permite descontos,
cupons, cashback, frete ou adicionais nesta versão. Se a resposta trouxer success=false, não estime
valores nem diga que o orçamento foi criado; siga a ação indicada no resultado.`,
	inputSchema: QuoteInputSchema,
	operation: { tipo: "ORCAMENTO_CRIAR", leaseMs: 60_000 },
	async execute(input, context) {
		if (!context.operation) throw new Error("Operação durável não preparada para criar o orçamento.");
		const operation = context.operation;

		return inTransaction(context.db, async (tx) => {
			try {
				const resolvedItems = await resolveSaleItems({ db: tx, organizacaoId: context.organizacaoId, itens: input.itens });
				const result = await createSaleDraft({
					tx,
					organizacaoId: context.organizacaoId,
					clienteId: context.chat.clienteId,
					itens: resolvedItems,
					origem: {
						tipo: "AGENTE_IA",
						agenteId: context.agent.id,
						runId: context.run.id,
						chatId: context.chat.id,
						operacaoId: operation.id,
					},
					vendedorNome: context.agent.nome,
					observacoes: input.observacoes,
				});
				const output: TAgentToolOutput = { success: true, message: "Orçamento criado com sucesso.", result };
				await completeAgentOperation({
					db: tx,
					operationId: operation.id,
					output,
					resource: { tipo: "VENDA", id: result.orcamentoId },
				});
				return output;
			} catch (error) {
				if (!(error instanceof SaleItemResolutionError)) throw error;
				const output = blockedOutput(error, context);
				await completeAgentOperation({ db: tx, operationId: operation.id, output });
				return output;
			}
		});
	},
});
