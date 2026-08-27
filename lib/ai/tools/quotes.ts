import { completeAgentOperation } from "@/lib/ai/operations/lifecycle";
import { createSaleDraft } from "@/lib/sales/drafts/create-sale-draft";
import { findStockShortages, resolveSaleItems, SaleItemResolutionError, type TSaleItemShortage } from "@/lib/sales/resolve-sale-items";
import type { TAiAgentStockConfig } from "@/schemas/ai-agents";
import type { DB, DBTransaction } from "@/services/drizzle";
import z from "zod";
import { defineAgentTool } from "./define-tool";
import type { TAgentToolContext, TAgentToolOutput } from "./types";

export const QuoteInputSchema = z
	.object({
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
	})
	.strict();

async function inTransaction<T>(database: DB | DBTransaction, callback: (tx: DBTransaction) => Promise<T>): Promise<T> {
	if ("transaction" in database && typeof database.transaction === "function") return database.transaction(callback);
	return callback(database as DBTransaction);
}

/**
 * Redige a falta de saldo conforme a política de visibilidade — o número só aparece quando a
 * organização autoriza dizê-lo.
 *
 * Sob `OCULTO` a frase é genérica de propósito: um saldo vazado por dentro de uma mensagem de erro é
 * vazado do mesmo jeito. Sob `DISPONIBILIDADE` o agente pode nomear o item em falta, mas a instrução
 * de não quantificar viaja junto com a frase, porque é ali que ele decide o que escrever.
 */
function formatShortageWarning(faltas: TSaleItemShortage[], visibilidade: TAiAgentStockConfig["visibilidade"]): string {
	if (visibilidade === "OCULTO" || faltas.length === 0) {
		return "A quantidade pedida precisa ser confirmada pela equipe.";
	}
	if (visibilidade === "DISPONIBILIDADE") {
		return `Não há saldo suficiente para: ${faltas.map((falta) => falta.nome).join(", ")}. Avise o cliente sem citar quantidades.`;
	}
	return `Não há saldo suficiente para: ${faltas
		.map((falta) => `${falta.nome} (pedido ${falta.solicitado}, disponível ${falta.disponivel})`)
		.join("; ")}.`;
}

/** Faltas no payload seguem a mesma regra da mensagem: quantidade só sob `QUANTIDADE`. */
function formatShortageResult(faltas: TSaleItemShortage[], visibilidade: TAiAgentStockConfig["visibilidade"]) {
	if (visibilidade === "OCULTO") return undefined;
	return visibilidade === "QUANTIDADE" ? faltas : faltas.map((falta) => ({ nome: falta.nome }));
}

function blockedOutput(error: SaleItemResolutionError, context: TAgentToolContext): TAgentToolOutput {
	const { visibilidade } = context.capacidades.comercial.estoque;
	const isShortage = error.code === "ESTOQUE_INSUFICIENTE" && error.faltas.length > 0;
	const faltas = isShortage ? formatShortageResult(error.faltas, visibilidade) : undefined;
	return {
		success: false,
		message: isShortage
			? `${formatShortageWarning(error.faltas, visibilidade)} O orçamento não foi criado.`
			: "Alguns itens precisam ser confirmados pela equipe antes do orçamento.",
		result: {
			codigo: error.code,
			produtos: error.produtos,
			...(faltas ? { faltas } : {}),
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
valores nem diga que o orçamento foi criado; siga a ação indicada no resultado.

Se a resposta trouxer "faltas", a quantidade pedida passa do saldo desses itens. Com success=true o
orçamento existe e você deve avisar o cliente na mesma mensagem; com success=false ele não foi criado.
Só cite números se eles vierem em "faltas".`,
	inputSchema: QuoteInputSchema,
	operation: { tipo: "ORCAMENTO_CRIAR", leaseMs: 60_000 },
	async execute(input, context) {
		if (!context.operation) throw new Error("Operação durável não preparada para criar o orçamento.");
		const operation = context.operation;

		const { excedente, visibilidade } = context.capacidades.comercial.estoque;

		return inTransaction(context.db, async (tx) => {
			try {
				const resolvedItems = await resolveSaleItems({
					db: tx,
					organizacaoId: context.organizacaoId,
					itens: input.itens,
					validateAvailableStock: excedente === "BLOQUEAR",
				});
				// Sob AVISAR o orçamento é criado de todo modo: o aviso serve para o agente alinhar a
				// expectativa do cliente, não para desfazer o que a equipe ainda pode resolver.
				const faltas = excedente === "AVISAR" ? await findStockShortages({ db: tx, organizacaoId: context.organizacaoId, resolved: resolvedItems }) : [];
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
				const shortageResult = faltas.length > 0 ? formatShortageResult(faltas, visibilidade) : undefined;
				const output: TAgentToolOutput = {
					success: true,
					message: faltas.length > 0 ? `Orçamento criado com sucesso. ${formatShortageWarning(faltas, visibilidade)}` : "Orçamento criado com sucesso.",
					result: shortageResult ? { ...result, faltas: shortageResult } : result,
				};
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
