import type { TFilterTree } from "@/schemas/campaign-audiences";
import { CampaignFlowNodeStateSchema } from "@/schemas/campaign-flows";
import type { TCampaignFlowState } from "@/schemas/campaign-flows";
import { type DBTransaction, db } from "@/services/drizzle";
import {
  type TCampaignFlowEntity,
  campaignAudiences,
  campaignFlowExecutionSteps,
  campaignFlowExecutions,
  campaignFlows,
} from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { checkClientInAudience, resolveAudience } from "./audience-resolver";
import {
  type FlowGraph,
  type NodeResult,
  getNextNodeId,
  loadFlowGraph,
  validateFlowGraph,
} from "./graph-utils";
import { processNode } from "./node-processors";
import { startCampaignFlowRun } from "./workflow-dispatcher";

// ============================================================================
// TYPES
// ============================================================================

type TriggerFlowParams = {
  campanhaId: string;
  organizacaoId: string;
  clienteId: string;
  eventoTipo: string;
  eventoMetadados?: Record<string, unknown>;
};

type TriggerBatchFlowParams = {
  campanhaId: string;
  organizacaoId: string;
  dedupWindowStart?: Date;
};

export type FlowRunResult = {
  executionId: string;
  status: "CONCLUIDA" | "FALHOU" | "CANCELADA";
  stepsProcessed: number;
  erro?: string;
};

type TFlowTriggerNode = Extract<TCampaignFlowState["nos"][number], { tipo: "GATILHO" }>;
const FLOW_TRIGGER_SUBTYPES = [
  "NOVA-COMPRA",
  "PRIMEIRA-COMPRA",
  "ENTRADA-SEGMENTACAO",
  "PERMANENCIA-SEGMENTACAO",
  "CASHBACK-ACUMULADO",
  "CASHBACK-EXPIRANDO",
  "ANIVERSARIO_CLIENTE",
  "QUANTIDADE-TOTAL-COMPRAS",
  "VALOR-TOTAL-COMPRAS",
  "INICIO-RECORRENTE",
  "INICIO-UNICO",
] as const;
type TNormalizedFlowTriggerSubtype = (typeof FLOW_TRIGGER_SUBTYPES)[number];

type TTriggerConfigForSubtype<TSubtype extends TNormalizedFlowTriggerSubtype> =
  TSubtype extends "ANIVERSARIO_CLIENTE"
    ? Extract<
        TFlowTriggerNode,
        { subtipo: "ANIVERSARIO_CLIENTE" | "ANIVERSARIO-CLIENTE" }
      >["configuracao"]
    : Extract<TFlowTriggerNode, { subtipo: TSubtype }>["configuracao"];

type TShouldTriggerFireInput = {
  [TSubtype in TNormalizedFlowTriggerSubtype]: {
    gatilhoSubtipo: TSubtype;
    gatilhoConfig: TTriggerConfigForSubtype<TSubtype>;
    eventoMetadados: Record<string, unknown>;
  };
}[TNormalizedFlowTriggerSubtype];

// ============================================================================
// INDIVIDUAL EXECUTION (event-triggered)
// ============================================================================

/**
 * Triggers a campaign flow for a single client (event-driven campaigns).
 * Creates an execution record and walks the graph.
 */
export async function triggerFlowForClient({
  campanhaId,
  organizacaoId,
  clienteId,
  eventoTipo,
  eventoMetadados,
}: TriggerFlowParams): Promise<FlowRunResult> {
  // Create execution record
  const [execution] = await db
    .insert(campaignFlowExecutions)
    .values({
      campanhaId,
      organizacaoId,
      tipo: "INDIVIDUAL",
      clienteId,
      eventoTipo,
      eventoMetadados,
      status: "EM_EXECUCAO",
      dataInicio: new Date(),
    })
    .returning({ id: campaignFlowExecutions.id });

  return executeFlowForClient({
    executionId: execution.id,
    campanhaId,
    organizacaoId,
    clienteId,
    eventoMetadados,
  });
}

/**
 * Walks the flow graph for a single client within an existing execution.
 * This is the core execution loop.
 */
export async function executeFlowForClient({
  executionId,
  campanhaId,
  organizacaoId,
  clienteId,
  eventoMetadados,
}: {
  executionId: string;
  campanhaId: string;
  organizacaoId: string;
  clienteId: string;
  eventoMetadados?: Record<string, unknown> | null;
}): Promise<FlowRunResult> {
  let stepsProcessed = 0;

  try {
    const graph = await loadFlowGraph({ tx: db, campanhaId });
    const entryNode = graph.getEntryNode();

    if (!entryNode) {
      await markExecutionFailed(executionId, "Nó gatilho não encontrado.");
      return { executionId, status: "FALHOU", stepsProcessed, erro: "Nó gatilho não encontrado." };
    }

    let currentNodeId: string | null = entryNode.id;

    while (currentNodeId) {
      const node = graph.getNode(currentNodeId);
      if (!node) {
        await markExecutionFailed(executionId, `Nó ${currentNodeId} não encontrado no grafo.`);
        return {
          executionId,
          status: "FALHOU",
          stepsProcessed,
          erro: `Nó ${currentNodeId} não encontrado.`,
        };
      }

      // Create step record
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

      // Process node
      const result = await processNode({
        tx: db,
        node,
        clienteId,
        executionId,
        campanhaId,
        organizacaoId,
        eventoMetadados,
      });

      stepsProcessed++;

      // Handle DELAY nodes — return early with AGUARDANDO_DELAY status
      // The Vercel Workflow runner will call context.sleep() and then resume.
      if (node.tipo === "DELAY" && result.sucesso) {
        await db
          .update(campaignFlowExecutionSteps)
          .set({
            status: "AGUARDANDO_DELAY",
            resultado: result.dados,
            delayAte: result.dados?.sleepMs
              ? new Date(Date.now() + (result.dados.sleepMs as number))
              : null,
          })
          .where(eq(campaignFlowExecutionSteps.id, step.id));

        // Return the delay info — the caller (Vercel Workflow) handles the wait
        return {
          executionId,
          status: "CONCLUIDA", // Not really done, but the delay step is handled externally
          stepsProcessed,
        };
      }

      // Update step status
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

      // If failed or filtered out, stop
      if (!result.sucesso || result.pulado) {
        const finalStatus = result.pulado ? "CONCLUIDA" : "FALHOU";
        await markExecutionCompleted(executionId, finalStatus, result.erro);
        return {
          executionId,
          status: finalStatus,
          stepsProcessed,
          erro: result.erro,
        };
      }

      // Determine next node
      currentNodeId = getNextNodeId(graph, currentNodeId, result);
    }

    // All nodes processed
    await markExecutionCompleted(executionId, "CONCLUIDA");
    return { executionId, status: "CONCLUIDA", stepsProcessed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[CAMPAIGN_FLOW] Execution ${executionId} failed:`, error);
    await markExecutionFailed(executionId, errorMessage);
    return { executionId, status: "FALHOU", stepsProcessed, erro: errorMessage };
  }
}

// ============================================================================
// BATCH EXECUTION (recurrent / one-time)
// ============================================================================

/**
 * Triggers a campaign flow for all matching clients (recurrent or one-time).
 * Creates a batch execution and fans out to individual client runs.
 */
export async function triggerBatchFlow({
  campanhaId,
  organizacaoId,
  dedupWindowStart,
}: TriggerBatchFlowParams): Promise<{
  executionId: string;
  totalClients: number;
  clientIds: string[];
}> {
  // Load campaign to get audience
  const campaign = await db.query.campaignFlows.findFirst({
    where: eq(campaignFlows.id, campanhaId),
  });

  if (!campaign) throw new Error(`Campaign flow ${campanhaId} não encontrado.`);

  // Resolve audience
  let clientIds: string[];
  if (campaign.publicoId) {
    const audience = await db.query.campaignAudiences.findFirst({
      where: eq(campaignAudiences.id, campaign.publicoId),
    });

    if (audience) {
      clientIds = await resolveAudience({
        tx: db,
        organizacaoId,
        filtros: audience.filtros as TFilterTree,
      });
    } else {
      clientIds = [];
    }
  } else {
    // No audience filter — all clients
    const allClients = await db.query.clients.findMany({
      where: (fields, { eq }) => eq(fields.organizacaoId, organizacaoId),
      columns: { id: true },
    });
    clientIds = allClients.map((c) => c.id);
  }

  const eligibleClientIds = await filterEligibleClientsForFlow({
    campanhaId,
    clientIds,
    dedupWindowStart,
  });

  const hasClients = eligibleClientIds.length > 0;

  // Create batch execution
  const [execution] = await db
    .insert(campaignFlowExecutions)
    .values({
      campanhaId,
      organizacaoId,
      tipo: "LOTE",
      status: hasClients ? "EM_EXECUCAO" : "CONCLUIDA",
      loteTotalClientes: eligibleClientIds.length,
      loteClientesProcessados: 0,
      dataInicio: new Date(),
      dataConclusao: hasClients ? null : new Date(),
    })
    .returning({ id: campaignFlowExecutions.id });

  return {
    executionId: execution.id,
    totalClients: eligibleClientIds.length,
    clientIds: eligibleClientIds,
  };
}

export async function filterEligibleClientsForFlow({
  campanhaId,
  clientIds,
  dedupWindowStart,
}: {
  campanhaId: string;
  clientIds: string[];
  dedupWindowStart?: Date;
}): Promise<string[]> {
  const eligibilityResults = await Promise.all(
    clientIds.map(async (clienteId) => ({
      clienteId,
      canExecute: await canExecuteFlowForClient({
        campanhaId,
        clienteId,
        dedupWindowStart,
      }),
    })),
  );

  return eligibilityResults.filter((item) => item.canExecute).map((item) => item.clienteId);
}

export async function canExecuteFlowForClient({
  campanhaId,
  clienteId,
  dedupWindowStart,
}: {
  campanhaId: string;
  clienteId: string;
  dedupWindowStart?: Date;
}): Promise<boolean> {
  const inProgressSteps = await db
    .selectDistinct({ clienteId: campaignFlowExecutionSteps.clienteId })
    .from(campaignFlowExecutionSteps)
    .innerJoin(
      campaignFlowExecutions,
      eq(campaignFlowExecutionSteps.execucaoId, campaignFlowExecutions.id),
    )
    .where(
      and(
        eq(campaignFlowExecutions.campanhaId, campanhaId),
        eq(campaignFlowExecutionSteps.clienteId, clienteId),
        inArray(campaignFlowExecutionSteps.status, ["EM_EXECUCAO", "AGUARDANDO_DELAY"]),
      ),
    )
    .limit(1);

  if (inProgressSteps.length > 0) {
    return false;
  }

  if (!dedupWindowStart) {
    return true;
  }

  const recentSteps = await db
    .selectDistinct({ clienteId: campaignFlowExecutionSteps.clienteId })
    .from(campaignFlowExecutionSteps)
    .innerJoin(
      campaignFlowExecutions,
      eq(campaignFlowExecutionSteps.execucaoId, campaignFlowExecutions.id),
    )
    .where(
      and(
        eq(campaignFlowExecutions.campanhaId, campanhaId),
        eq(campaignFlowExecutionSteps.clienteId, clienteId),
        inArray(campaignFlowExecutionSteps.status, [
          "CONCLUIDO",
          "EM_EXECUCAO",
          "AGUARDANDO_DELAY",
        ]),
        gte(campaignFlowExecutionSteps.dataInsercao, dedupWindowStart),
      ),
    )
    .limit(1);

  return recentSteps.length === 0;
}

/**
 * Returns the list of client IDs that should be processed in a batch execution.
 * Useful for the Vercel Workflow runner to fan out.
 */
export async function getBatchClientIds({
  campanhaId,
  organizacaoId,
}: {
  campanhaId: string;
  organizacaoId: string;
}): Promise<string[]> {
  const campaign = await db.query.campaignFlows.findFirst({
    where: eq(campaignFlows.id, campanhaId),
  });

  if (!campaign) return [];

  if (campaign.publicoId) {
    const audience = await db.query.campaignAudiences.findFirst({
      where: eq(campaignAudiences.id, campaign.publicoId),
    });

    if (audience) {
      return resolveAudience({
        tx: db,
        organizacaoId,
        filtros: audience.filtros as TFilterTree,
      });
    }
    return [];
  }

  const allClients = await db.query.clients.findMany({
    where: (fields, { eq }) => eq(fields.organizacaoId, organizacaoId),
    columns: { id: true },
  });
  return allClients.map((c) => c.id);
}

// ============================================================================
// EVENT TRIGGER MATCHING
// ============================================================================

/**
 * Finds active campaign flows that match a given trigger event type.
 * Used by point-of-interaction and cron routes.
 */
export async function getActiveCampaignFlowsByTrigger({
  tx,
  organizacaoId,
  gatilhoSubtipo,
}: {
  tx: DBTransaction;
  organizacaoId: string;
  gatilhoSubtipo: TNormalizedFlowTriggerSubtype;
}) {
  const normalizedRequestedSubtype = normalizeFlowTriggerSubtype(gatilhoSubtipo);
  if (!isNormalizedFlowTriggerSubtype(normalizedRequestedSubtype)) return [];

  // Get active event-driven campaign flows for this organization
  const flows = await tx.query.campaignFlows.findMany({
    where: and(
      eq(campaignFlows.organizacaoId, organizacaoId),
      eq(campaignFlows.status, "ATIVO"),
      eq(campaignFlows.tipo, "EVENTO"),
    ),
    with: { nos: true },
  });

  // Filter to campaigns whose trigger node matches the requested event type
  return flows
    .map((flow) => {
      const triggerNodeRaw = flow.nos.find((n) => n.tipo === "GATILHO");
      if (!triggerNodeRaw) return null;

      const parsedTriggerNode = CampaignFlowNodeStateSchema.safeParse({
        tipo: triggerNodeRaw.tipo,
        subtipo: triggerNodeRaw.subtipo,
        rotulo: triggerNodeRaw.rotulo,
        configuracao: triggerNodeRaw.configuracao,
        posicaoX: triggerNodeRaw.posicaoX,
        posicaoY: triggerNodeRaw.posicaoY,
      });

      if (!parsedTriggerNode.success || parsedTriggerNode.data.tipo !== "GATILHO") return null;

      const triggerNodeSubtype = normalizeFlowTriggerSubtype(parsedTriggerNode.data.subtipo);
      if (triggerNodeSubtype !== normalizedRequestedSubtype) return null;

      return {
        ...flow,
        gatilhoSubtipo: normalizedRequestedSubtype,
        gatilhoConfig: getTriggerConfigForSubtype(
          normalizedRequestedSubtype,
          parsedTriggerNode.data,
        ),
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);
}

// ============================================================================
// TRIGGER VALIDATION
// ============================================================================

/**
 * Validates whether a trigger should fire based on event data and trigger config.
 * E.g., NOVA-COMPRA with valorMinimo check.
 */
export function shouldTriggerFire({
  gatilhoSubtipo,
  gatilhoConfig,
  eventoMetadados,
}: TShouldTriggerFireInput): boolean {
  switch (gatilhoSubtipo) {
    case "NOVA-COMPRA": {
      const { valorMinimo } = gatilhoConfig;
      if (valorMinimo != null) {
        const saleValue = eventoMetadados.valor as number;
        return saleValue >= valorMinimo;
      }
      return true;
    }

    case "PRIMEIRA-COMPRA":
      return true;

    case "CASHBACK-ACUMULADO": {
      const { valorMinimoNovo, valorMinimoTotal } = gatilhoConfig;
      const novoCashback = eventoMetadados.novoCashback as number;
      const totalCashback = eventoMetadados.totalCashback as number;

      if (valorMinimoNovo != null && novoCashback < valorMinimoNovo) return false;
      if (valorMinimoTotal != null && totalCashback < valorMinimoTotal) return false;
      return true;
    }

    case "QUANTIDADE-TOTAL-COMPRAS": {
      const { quantidade } = gatilhoConfig;
      if (quantidade == null) return true;
      const totalCompras = eventoMetadados.totalCompras as number;
      return totalCompras >= quantidade;
    }

    case "VALOR-TOTAL-COMPRAS": {
      const { valor } = gatilhoConfig;
      if (valor == null) return true;
      const valorTotal = eventoMetadados.valorTotalCompras as number;
      return valorTotal >= valor;
    }

    case "ENTRADA-SEGMENTACAO": {
      const { segmentos } = gatilhoConfig;
      const segmentoAtual = eventoMetadados.segmentoAtual as string;
      return segmentos?.includes(segmentoAtual) ?? false;
    }

    case "PERMANENCIA-SEGMENTACAO": {
      const { segmentos, tempoValor, tempoMedida } = gatilhoConfig;
      const segmentoAtual = eventoMetadados.segmentoAtual as string;
      const inSegment = segmentos?.includes(segmentoAtual) ?? false;
      if (!inSegment) return false;

      const segmentoUltimaAlteracaoData = eventoMetadados.segmentoUltimaAlteracaoData as
        | string
        | undefined;

      if (tempoValor != null && tempoMedida && segmentoUltimaAlteracaoData) {
        const startDate = dayjs(segmentoUltimaAlteracaoData);
        if (!startDate.isValid()) return false;

        const diff =
          tempoMedida === "DIAS"
            ? dayjs().diff(startDate, "day")
            : tempoMedida === "SEMANAS"
              ? dayjs().diff(startDate, "week")
              : dayjs().diff(startDate, "month");

        return diff > tempoValor;
      }

      const permanenciaAtingida = eventoMetadados.permanenciaAtingida as boolean | undefined;
      return permanenciaAtingida === true;
    }

    case "CASHBACK-EXPIRANDO":
    case "ANIVERSARIO_CLIENTE": {
      const { tempoAntecedenciaValor, tempoAntecedenciaMedida } = gatilhoConfig;
      const diasAntecedencia = eventoMetadados.diasAntecedencia as number | undefined;

      if (tempoAntecedenciaValor != null && tempoAntecedenciaMedida && diasAntecedencia != null) {
        const eventoNoMesmoTipo =
          tempoAntecedenciaMedida === "DIAS"
            ? diasAntecedencia
            : tempoAntecedenciaMedida === "SEMANAS"
              ? diasAntecedencia / 7
              : tempoAntecedenciaMedida === "MESES"
                ? diasAntecedencia / 30
                : diasAntecedencia / 365;

        return eventoNoMesmoTipo <= tempoAntecedenciaValor;
      }

      return true;
    }

    case "INICIO-RECORRENTE":
    case "INICIO-UNICO":
      return true;

    default:
      return false;
  }
}

export async function triggerEventCampaignFlows({
  organizacaoId,
  clienteId,
  gatilhoSubtipo,
  eventoTipo,
  eventoMetadados,
}: {
  organizacaoId: string;
  clienteId: string;
  gatilhoSubtipo: string;
  eventoTipo?: string;
  eventoMetadados: Record<string, unknown>;
}): Promise<{ disparados: number; avaliados: number }> {
  const normalizedSubtype = normalizeFlowTriggerSubtype(gatilhoSubtipo);
  if (!isNormalizedFlowTriggerSubtype(normalizedSubtype)) {
    return { disparados: 0, avaliados: 0 };
  }

  const matchingFlows = await getActiveCampaignFlowsByTrigger({
    tx: db as any,
    organizacaoId,
    gatilhoSubtipo: normalizedSubtype,
  });

  let disparados = 0;

  for (const flow of matchingFlows) {
    const shouldRun = shouldTriggerFire({
      gatilhoSubtipo: flow.gatilhoSubtipo,
      gatilhoConfig: flow.gatilhoConfig,
      eventoMetadados,
    });

    if (!shouldRun) continue;

    if (flow.publicoId) {
      const audience = await db.query.campaignAudiences.findFirst({
        where: eq(campaignAudiences.id, flow.publicoId),
      });

      if (!audience) continue;

      const inAudience = await checkClientInAudience({
        tx: db as any,
        organizacaoId,
        clienteId,
        filtros: audience.filtros as TFilterTree,
      });

      if (!inAudience) continue;
    }

    const canExecute = await canExecuteFlowForClient({
      campanhaId: flow.id,
      clienteId,
    });

    if (!canExecute) continue;

    const [execution] = await db
      .insert(campaignFlowExecutions)
      .values({
        campanhaId: flow.id,
        organizacaoId,
        tipo: "INDIVIDUAL",
        clienteId,
        eventoTipo: eventoTipo ?? normalizedSubtype,
        eventoMetadados,
        status: "EM_EXECUCAO",
        dataInicio: new Date(),
      })
      .returning({ id: campaignFlowExecutions.id });

    try {
      await startCampaignFlowRun({
        executionId: execution.id,
        campanhaId: flow.id,
        organizacaoId,
        clienteId,
        eventoMetadados,
      });
      disparados++;
    } catch (error) {
      await db
        .update(campaignFlowExecutions)
        .set({
          status: "FALHOU",
          erro: error instanceof Error ? error.message : "Falha ao iniciar execução de workflow.",
          dataConclusao: new Date(),
        })
        .where(eq(campaignFlowExecutions.id, execution.id));
    }
  }

  return {
    disparados,
    avaliados: matchingFlows.length,
  };
}

function normalizeFlowTriggerSubtype(gatilhoSubtipo: string): string {
  if (gatilhoSubtipo === "ENTRADA-SEGMENTAÇÃO") return "ENTRADA-SEGMENTACAO";
  if (gatilhoSubtipo === "PERMANÊNCIA-SEGMENTAÇÃO") return "PERMANENCIA-SEGMENTACAO";
  if (gatilhoSubtipo === "ANIVERSARIO-CLIENTE") return "ANIVERSARIO_CLIENTE";
  return gatilhoSubtipo;
}

function isNormalizedFlowTriggerSubtype(
  gatilhoSubtipo: string,
): gatilhoSubtipo is TNormalizedFlowTriggerSubtype {
  return (FLOW_TRIGGER_SUBTYPES as readonly string[]).includes(gatilhoSubtipo);
}

function getTriggerConfigForSubtype<TSubtype extends TNormalizedFlowTriggerSubtype>(
  gatilhoSubtipo: TSubtype,
  triggerNode: TFlowTriggerNode,
): TTriggerConfigForSubtype<TSubtype> {
  if (gatilhoSubtipo === "ANIVERSARIO_CLIENTE") {
    return triggerNode.configuracao as TTriggerConfigForSubtype<TSubtype>;
  }

  return triggerNode.configuracao as TTriggerConfigForSubtype<TSubtype>;
}

// ============================================================================
// HELPERS
// ============================================================================

async function markExecutionCompleted(
  executionId: string,
  status: "CONCLUIDA" | "FALHOU" | "CANCELADA",
  erro?: string,
) {
  await db
    .update(campaignFlowExecutions)
    .set({
      status,
      dataConclusao: new Date(),
      erro: erro ?? null,
    })
    .where(eq(campaignFlowExecutions.id, executionId));
}

async function markExecutionFailed(executionId: string, erro: string) {
  await markExecutionCompleted(executionId, "FALHOU", erro);
}

/**
 * Updates batch execution progress counter.
 */
export async function incrementBatchProgress(executionId: string) {
  await db
    .update(campaignFlowExecutions)
    .set({
      loteClientesProcessados: sql`${campaignFlowExecutions.loteClientesProcessados} + 1`,
    })
    .where(eq(campaignFlowExecutions.id, executionId));
}
