import { db } from "@/services/drizzle";
import { organizationMembers, sales } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

// Configurações
const CONFIG = {
	BATCH_SIZE: 50, // Quantidade de registros por lote
	MAX_RETRIES: 3, // Número máximo de tentativas por registro
	RETRY_DELAY_MS: 1000, // Delay entre tentativas (em ms)
	CONCURRENT_UPDATES: 10, // Número de updates paralelos dentro de cada lote
};

const FULFILLMENT_METHOD_MAP: Record<string, string> = {
	delivery: "ENTREGA",
	takeout: "RETIRADA",
	onsite: "PRESENCIAL",
	closed_table: "COMANDA",
};

// Utilitário para delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Divide array em chunks
function chunkArray<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

// Função de retry com backoff exponencial
async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number,
	baseDelay: number,
	context: string,
): Promise<{ success: true; result: T } | { success: false; error: string }> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const result = await fn();
			return { success: true, result };
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.warn(`[WARN] [TESTING] ${context} - Tentativa ${attempt}/${maxRetries} falhou: ${lastError.message}`);

			if (attempt < maxRetries) {
				const delayMs = baseDelay * 2 ** (attempt - 1); // Backoff exponencial
				await delay(delayMs);
			}
		}
	}

	return { success: false, error: lastError?.message ?? "Erro desconhecido" };
}

// Função para atualizar uma única venda
async function updateSale(sale: { id: string; parceiro: string | null; tipo: string | null }) {
	const canal = sale.parceiro;
	const entregaModalidade = sale.tipo ? FULFILLMENT_METHOD_MAP[sale.tipo] : "NÃO DEFINIDO";
	console.log(`[INFO] [TESTING] Atualizando venda ${sale.id} com entregaModalidade ${entregaModalidade} para o tipo ${sale.tipo}`);
	await db
		.update(sales)
		.set({
			entregaModalidade,
		})
		.where(eq(sales.id, sale.id));

	return sale.id;
}

// Processa um lote de vendas com concorrência limitada
async function processBatch(
	batch: Array<{ id: string; parceiro: string | null; tipo: string | null }>,
	batchIndex: number,
	totalBatches: number,
): Promise<{ successful: string[]; failed: Array<{ id: string; error: string }> }> {
	console.log(`[INFO] [TESTING] Processando lote ${batchIndex + 1}/${totalBatches} (${batch.length} registros)...`);

	const successful: string[] = [];
	const failed: Array<{ id: string; error: string }> = [];

	// Processa em sub-lotes para limitar concorrência
	const concurrentChunks = chunkArray(batch, CONFIG.CONCURRENT_UPDATES);

	for (const chunk of concurrentChunks) {
		const results = await Promise.allSettled(
			chunk.map(async (sale) => {
				const result = await withRetry(() => updateSale(sale), CONFIG.MAX_RETRIES, CONFIG.RETRY_DELAY_MS, `Sale ${sale.id}`);

				if (result.success) {
					return { id: sale.id, success: true as const };
				}
				return { id: sale.id, success: false as const, error: result.error };
			}),
		);

		for (const result of results) {
			if (result.status === "fulfilled") {
				if (result.value.success) {
					successful.push(result.value.id);
				} else {
					failed.push({ id: result.value.id, error: result.value.error });
				}
				continue;
			}
			// Promise rejeitada (não deveria acontecer com nosso try-catch, mas por segurança)
			failed.push({ id: "unknown", error: result.reason?.message ?? "Erro desconhecido" });
		}
	}

	console.log(`[INFO] [TESTING] Lote ${batchIndex + 1}/${totalBatches} concluído: ${successful.length} sucesso, ${failed.length} falhas`);
	return { successful, failed };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const startTime = Date.now();
	const memberships = await db.query.organizationMembers.findMany({});

	for (const membership of memberships) {
		await db
			.update(organizationMembers)
			.set({
				permissoes: {
					...membership.permissoes,
					empresa: {
						visualizar: true,
						editar: true,
					},
				},
			})
			.where(eq(organizationMembers.id, membership.id));
	}
	return res.status(200).json({ message: "Processo concluído com sucesso" });
	// try {
	// 	console.log("[INFO] [TESTING] Iniciando processo de correção de vendas...");
	// 	// Busca registros que precisam ser corrigidos
	// 	const salesToFix = await db.query.sales.findMany({
	// 		where: (fields, { and, eq, isNull }) =>
	// 			and(eq(fields.organizacaoId, "27817d9a-cb04-4704-a1f4-15b81a3610d3"), eq(fields.entregaModalidade, "NÃO DEFINIDO")),
	// 		columns: {
	// 			id: true,
	// 			parceiro: true,
	// 			tipo: true,
	// 		},
	// 	});
	// 	if (salesToFix.length === 0) {
	// 		console.log("[INFO] [TESTING] Nenhuma venda encontrada para corrigir.");
	// 		return res.status(200).json({
	// 			message: "Nenhuma venda encontrada para corrigir",
	// 			stats: { total: 0, successful: 0, failed: 0 },
	// 			durationMs: Date.now() - startTime,
	// 		});
	// 	}
	// 	console.log(`[INFO] [TESTING] Encontradas ${salesToFix.length} vendas para corrigir`);
	// 	// Divide em lotes
	// 	const batches = chunkArray(salesToFix, CONFIG.BATCH_SIZE);
	// 	console.log(`[INFO] [TESTING] Dividido em ${batches.length} lotes de até ${CONFIG.BATCH_SIZE} registros`);
	// 	// Métricas
	// 	const allSuccessful: string[] = [];
	// 	const allFailed: Array<{ id: string; error: string }> = [];
	// 	// Processa cada lote
	// 	for (const [batchIndex, batch] of batches.entries()) {
	// 		const { successful, failed } = await processBatch(batch, batchIndex, batches.length);
	// 		allSuccessful.push(...successful);
	// 		allFailed.push(...failed);
	// 	}
	// 	const durationMs = Date.now() - startTime;
	// 	const durationSeconds = (durationMs / 1000).toFixed(2);
	// 	console.log(`[INFO] [TESTING] Processo concluído em ${durationSeconds}s`);
	// 	console.log(`[INFO] [TESTING] Total: ${salesToFix.length} | Sucesso: ${allSuccessful.length} | Falhas: ${allFailed.length}`);
	// 	if (allFailed.length > 0) {
	// 		console.error("[ERROR] [TESTING] IDs com falha:", allFailed.map((f) => f.id).join(", "));
	// 	}
	// 	return res.status(200).json({
	// 		message: allFailed.length === 0 ? "Todas as vendas atualizadas com sucesso" : "Processo concluído com algumas falhas",
	// 		stats: {
	// 			total: salesToFix.length,
	// 			successful: allSuccessful.length,
	// 			failed: allFailed.length,
	// 		},
	// 		failedIds: allFailed.length > 0 ? allFailed : undefined,
	// 		durationMs,
	// 		durationSeconds: `${durationSeconds}s`,
	// 	});
	// } catch (error) {
	// 	const errorMessage = error instanceof Error ? error.message : String(error);
	// 	console.error("[ERROR] [TESTING] Erro fatal no processo:", errorMessage);
	// 	return res.status(500).json({
	// 		message: "Erro fatal no processo de atualização",
	// 		error: errorMessage,
	// 		durationMs: Date.now() - startTime,
	// 	});
	// }
}
