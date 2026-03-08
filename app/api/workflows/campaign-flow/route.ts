import { type CampaignFlowRunInput, type NodeResult, getNextNodeId, loadFlowGraph, processNode } from "@/lib/campaign-flows";
import { processSingleInteractionImmediately } from "@/lib/interactions";
import { serve } from "@/lib/workflows/serve";
import { db } from "@/services/drizzle";
import { campaignFlowExecutionSteps, campaignFlowExecutions, campaignFlows, clients, interactions } from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";

const MAX_STEPS_PER_RUN = 300;

export const POST = serve<CampaignFlowRunInput>(async (context) => {
	const { executionId, campanhaId, organizacaoId, clienteId, eventoMetadados } = context.requestPayload;

	if (!executionId || !campanhaId || !organizacaoId || !clienteId) {
		throw new Error("Payload do workflow inválido: executionId, campanhaId, organizacaoId e clienteId são obrigatórios.");
	}

	const execution = await db.query.campaignFlowExecutions.findFirst({
		where: and(
			eq(campaignFlowExecutions.id, executionId),
			eq(campaignFlowExecutions.campanhaId, campanhaId),
			eq(campaignFlowExecutions.organizacaoId, organizacaoId),
		),
		columns: {
			id: true,
			tipo: true,
			status: true,
			loteTotalClientes: true,
			loteClientesProcessados: true,
		},
	});

	if (!execution) {
		throw new Error(`Execução ${executionId} não encontrada para campanha ${campanhaId}.`);
	}

	if (execution.status === "PENDENTE") {
		await db
			.update(campaignFlowExecutions)
			.set({
				status: "EM_EXECUCAO",
				dataInicio: new Date(),
			})
			.where(eq(campaignFlowExecutions.id, executionId));
	}

	const graph = await (loadFlowGraph as any)({ tx: db, campanhaId });
	const entryNode = graph.getEntryNode();

	if (!entryNode) {
		await markClientRunFinished({ execution, clientStatus: "FALHOU", erro: "Nó gatilho não encontrado." });
		throw new Error("Nó gatilho não encontrado para o campaign flow.");
	}

	let currentNodeId: string | null = entryNode.id;
	let stepsProcessed = 0;
	let finalStatus: "CONCLUIDA" | "FALHOU" = "CONCLUIDA";
	let finalError: string | undefined;

	while (currentNodeId) {
		if (stepsProcessed >= MAX_STEPS_PER_RUN) {
			finalStatus = "FALHOU";
			finalError = `Limite máximo de ${MAX_STEPS_PER_RUN} passos atingido para evitar loop infinito.`;
			break;
		}

		const node = graph.getNode(currentNodeId);
		if (!node) {
			finalStatus = "FALHOU";
			finalError = `Nó ${currentNodeId} não encontrado no grafo.`;
			break;
		}

		const [step] = await db
			.insert(campaignFlowExecutionSteps)
			.values({
				execucaoId: executionId,
				noId: currentNodeId,
				clienteId,
				status: "EM_EXECUCAO",
				dataInicio: new Date(),
			})
			.returning({ id: campaignFlowExecutionSteps.id });

		let result: NodeResult = await (processNode as any)({
			tx: db as any,
			node,
			clienteId,
			executionId,
			campanhaId,
			organizacaoId,
			eventoMetadados,
		});

		result = await processImmediateWhatsappIfNeeded({
			result,
			organizacaoId,
			clienteId,
			campanhaId,
		});

		stepsProcessed++;

		if (node.tipo === "DELAY" && result.sucesso) {
			const sleepMsRaw = result.dados?.sleepMs;
			const sleepMs = typeof sleepMsRaw === "number" ? sleepMsRaw : Number(sleepMsRaw ?? 0);

			await db
				.update(campaignFlowExecutionSteps)
				.set({
					status: "AGUARDANDO_DELAY",
					resultado: result.dados ?? null,
					delayAte: sleepMs > 0 ? new Date(Date.now() + sleepMs) : null,
				})
				.where(eq(campaignFlowExecutionSteps.id, step.id));

			if (sleepMs > 0) {
				await context.sleep(`campaign-flow-delay-${step.id}`, sleepMs);
			}

			await db
				.update(campaignFlowExecutionSteps)
				.set({
					status: "CONCLUIDO",
					resultado: result.dados ?? null,
					delayAte: null,
					dataConclusao: new Date(),
				})
				.where(eq(campaignFlowExecutionSteps.id, step.id));

			currentNodeId = getNextNodeId(graph, currentNodeId, result);
			continue;
		}

		const stepStatus = result.pulado ? "PULADO" : result.sucesso ? "CONCLUIDO" : "FALHOU";

		await db
			.update(campaignFlowExecutionSteps)
			.set({
				status: stepStatus,
				resultado: result.dados ?? result,
				erro: result.erro,
				dataConclusao: new Date(),
			})
			.where(eq(campaignFlowExecutionSteps.id, step.id));

		if (!result.sucesso) {
			finalStatus = "FALHOU";
			finalError = result.erro ?? "Falha ao processar nó do workflow.";
			break;
		}

		if (result.pulado) {
			finalStatus = "CONCLUIDA";
			break;
		}

		currentNodeId = getNextNodeId(graph, currentNodeId, result);
	}

	await markClientRunFinished({
		execution,
		clientStatus: finalStatus,
		erro: finalError,
	});

	return {
		sucesso: finalStatus === "CONCLUIDA",
		executionId,
		clienteId,
		stepsProcessed,
		erro: finalError ?? null,
	};
});

async function processImmediateWhatsappIfNeeded({
	result,
	organizacaoId,
	clienteId,
	campanhaId,
}: {
	result: NodeResult;
	organizacaoId: string;
	clienteId: string;
	campanhaId: string;
}): Promise<NodeResult> {
	if (!result.sucesso || !result.dados?.requiresImmediateProcessing) return result;

	const interactionId = result.dados.interactionId;
	const whatsappTemplateId = result.dados.whatsappTemplateId;
	const whatsappConexaoTelefoneId = result.dados.whatsappConexaoTelefoneId;

	if (typeof interactionId !== "string" || typeof whatsappTemplateId !== "string" || typeof whatsappConexaoTelefoneId !== "string") {
		return {
			sucesso: false,
			erro: "Dados insuficientes para processamento imediato do WhatsApp.",
			dados: result.dados,
		};
	}

	const [clientData, template, campaign, connectionPhone, interactionRecord] = await Promise.all([
		db.query.clients.findFirst({
			where: eq(clients.id, clienteId),
			columns: {
				id: true,
				nome: true,
				telefone: true,
				email: true,
				analiseRFMTitulo: true,
				metadataProdutoMaisCompradoId: true,
				metadataGrupoProdutoMaisComprado: true,
			},
		}),
		db.query.whatsappTemplates.findFirst({
			where: (fields, { eq }) => eq(fields.id, whatsappTemplateId),
		}),
		db.query.campaignFlows.findFirst({
			where: eq(campaignFlows.id, campanhaId),
			columns: { autorId: true },
		}),
		db.query.whatsappConnectionPhones.findFirst({
			where: (fields, { eq }) => eq(fields.id, whatsappConexaoTelefoneId),
			with: {
				conexao: {
					columns: {
						token: true,
						gatewaySessaoId: true,
					},
				},
			},
		}),
		db.query.interactions.findFirst({
			where: eq(interactions.id, interactionId),
			columns: { metadados: true },
		}),
	]);

	if (!clientData || !template || !campaign || !connectionPhone?.conexao) {
		return {
			sucesso: false,
			erro: "Não foi possível carregar dados para envio imediato do WhatsApp.",
			dados: result.dados,
		};
	}

	const sendResult = await processSingleInteractionImmediately({
		interactionId,
		organizationId: organizacaoId,
		client: clientData,
		campaign: {
			autorId: campaign.autorId,
			whatsappConexaoTelefoneId,
			whatsappTemplate: template,
		},
		whatsappToken: connectionPhone.conexao.token ?? undefined,
		whatsappSessionId: connectionPhone.conexao.gatewaySessaoId ?? undefined,
		contextMetadados: interactionRecord?.metadados as any,
	});

	if (!sendResult.success) {
		return {
			sucesso: false,
			erro: sendResult.error ?? "Falha ao enviar mensagem de WhatsApp do workflow.",
			dados: result.dados,
		};
	}

	return {
		...result,
		dados: {
			...(result.dados ?? {}),
			immediateProcessingStatus: "ENVIADO",
		},
	};
}

async function markClientRunFinished({
	execution,
	clientStatus,
	erro,
}: {
	execution: {
		id: string;
		tipo: "INDIVIDUAL" | "LOTE";
		loteTotalClientes: number | null;
	};
	clientStatus: "CONCLUIDA" | "FALHOU";
	erro?: string;
}) {
	if (execution.tipo === "INDIVIDUAL") {
		await db
			.update(campaignFlowExecutions)
			.set({
				status: clientStatus,
				dataConclusao: new Date(),
				erro: erro ?? null,
			})
			.where(eq(campaignFlowExecutions.id, execution.id));
		return;
	}

	const [updated] = await db
		.update(campaignFlowExecutions)
		.set({
			loteClientesProcessados: sql`${campaignFlowExecutions.loteClientesProcessados} + 1`,
			...(clientStatus === "FALHOU" ? { erro: erro ?? "Falha em uma execução de cliente." } : {}),
		})
		.where(eq(campaignFlowExecutions.id, execution.id))
		.returning({
			loteClientesProcessados: campaignFlowExecutions.loteClientesProcessados,
			loteTotalClientes: campaignFlowExecutions.loteTotalClientes,
			erro: campaignFlowExecutions.erro,
		});

	if (!updated?.loteTotalClientes) return;

	const processedClients = Number(updated.loteClientesProcessados ?? 0);
	const totalClients = Number(updated.loteTotalClientes ?? 0);

	if (totalClients > 0 && processedClients >= totalClients) {
		await db
			.update(campaignFlowExecutions)
			.set({
				status: updated.erro ? "FALHOU" : "CONCLUIDA",
				dataConclusao: new Date(),
			})
			.where(eq(campaignFlowExecutions.id, execution.id));
	}
}
