import type { TInteractionChannelEnum, TInteractionDirectionEnum, TInteractionInitiatorEnum } from "@/schemas/enums";
import type { TInteractionMetadata } from "@/schemas/interactions";
import { type DBTransaction, db } from "@/services/drizzle";
import { type TInteractionEntity, clients, interactions, sellers } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import createHttpError from "http-errors";

// Registro com mais de 24h de atraso é honesto na timeline, mas não pontua influência
// (anti-gaming — docs/seller-routine-hub-design.md §7).
const RETROACTIVE_THRESHOLD_HOURS = 24;

// Linhas manuais reutilizam os valores legados de `tipo` de propósito: todos os filtros
// existentes da máquina de entrega/quotas/stats usam `tipo = 'ENVIO-MENSAGEM'` e excluem
// linhas manuais por construção. Código novo lê canal/direcao/iniciadoPor.
const MANUAL_CHANNEL_TO_LEGACY_TYPE: Record<TInteractionChannelEnum, TInteractionEntity["tipo"]> = {
	WHATSAPP: "ATENDIMENTO",
	EMAIL: "ATENDIMENTO",
	LIGACAO: "LIGAÇÃO",
	PRESENCIAL: "ATENDIMENTO",
	VISITA: "ATENDIMENTO",
	SMS: "ATENDIMENTO",
	OUTRO: "ATENDIMENTO",
};

const CHANNEL_TITLES: Record<TInteractionChannelEnum, string> = {
	WHATSAPP: "Contato por WhatsApp",
	EMAIL: "Contato por e-mail",
	LIGACAO: "Ligação",
	PRESENCIAL: "Atendimento presencial",
	VISITA: "Visita",
	SMS: "Contato por SMS",
	OUTRO: "Contato",
};

type TCreateManualInteractionParams = {
	organizacaoId: string;
	clienteId: string;
	vendedorId: string;
	autorId: string | null;
	canal: TInteractionChannelEnum;
	direcao?: TInteractionDirectionEnum;
	iniciadoPor?: Extract<TInteractionInitiatorEnum, "USUARIO" | "AGENTE_IA">;
	/** Quando a interação aconteceu (passado) ou vai acontecer (PLANEJADA). Default: agora. */
	dataInteracao?: Date | null;
	/** true = cria uma interação PLANEJADA (follow-up) com dataInteracao futura. */
	planejada?: boolean;
	titulo?: string | null;
	descricao?: string | null;
	metadados?: Partial<TInteractionMetadata> | null;
};

/**
 * Ponto único de escrita de interações manuais (docs/seller-routine-hub-design.md §3.3).
 *
 * Invariantes garantidos aqui:
 * - linha manual nunca tem campanhaId, agendamento*, statusEnvio ou dataExecucao (não entra
 *   na máquina de entrega nem consome quota semanal);
 * - `tipo` legado nunca é 'ENVIO-MENSAGEM' (filtros existentes excluem manuais por construção);
 * - REALIZADA exige dataInteracao <= agora; PLANEJADA exige dataInteracao futura;
 * - registro retroativo (> 24h) é marcado em metadados.registroRetroativo;
 * - snapshots de contexto (segmento RFM, dias sem contato) capturados no momento do registro.
 */
export async function createManualInteraction(params: TCreateManualInteractionParams, trx?: DBTransaction) {
	const dbOrTrx = trx ?? db;
	const now = new Date();
	const planejada = params.planejada ?? false;
	const dataInteracao = params.dataInteracao ?? now;

	if (planejada && !dayjs(dataInteracao).isAfter(now)) {
		throw new createHttpError.BadRequest("Uma interação planejada precisa de uma data futura.");
	}
	if (!planejada && dayjs(dataInteracao).isAfter(now)) {
		throw new createHttpError.BadRequest("Uma interação realizada não pode ter data futura.");
	}

	const client = await dbOrTrx.query.clients.findFirst({
		where: and(eq(clients.id, params.clienteId), eq(clients.organizacaoId, params.organizacaoId)),
		columns: { id: true, nome: true, analiseRFMTitulo: true },
	});
	if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");

	const seller = await dbOrTrx.query.sellers.findFirst({
		where: and(eq(sellers.id, params.vendedorId), eq(sellers.organizacaoId, params.organizacaoId)),
		columns: { id: true, nome: true },
	});
	if (!seller) throw new createHttpError.NotFound("Vendedor não encontrado.");

	const lastRealizedInteraction = await dbOrTrx.query.interactions.findFirst({
		where: and(
			eq(interactions.organizacaoId, params.organizacaoId),
			eq(interactions.clienteId, params.clienteId),
			eq(interactions.status, "REALIZADA"),
			isNotNull(interactions.dataInteracao),
		),
		columns: { dataInteracao: true },
		orderBy: [desc(interactions.dataInteracao)],
	});

	const registroRetroativo = !planejada && dayjs(now).diff(dataInteracao, "hour") > RETROACTIVE_THRESHOLD_HOURS;
	const snapshotDiasSemContato = lastRealizedInteraction?.dataInteracao ? dayjs(dataInteracao).diff(lastRealizedInteraction.dataInteracao, "day") : null;

	const metadados: TInteractionMetadata = {
		...(params.metadados ?? {}),
		snapshotSegmentoRFM: client.analiseRFMTitulo ?? null,
		snapshotDiasSemContato,
		registroRetroativo: registroRetroativo || null,
	} as TInteractionMetadata;

	const [created] = await dbOrTrx
		.insert(interactions)
		.values({
			organizacaoId: params.organizacaoId,
			clienteId: params.clienteId,
			campanhaId: null,
			titulo: params.titulo?.trim() || `${CHANNEL_TITLES[params.canal]} — ${client.nome}`,
			descricao: params.descricao?.trim() || null,
			tipo: MANUAL_CHANNEL_TO_LEGACY_TYPE[params.canal],
			autorId: params.autorId,
			canal: params.canal,
			direcao: params.direcao ?? "SAIDA",
			iniciadoPor: params.iniciadoPor ?? "USUARIO",
			vendedorId: params.vendedorId,
			dataInteracao,
			status: planejada ? "PLANEJADA" : "REALIZADA",
			metadados,
		})
		.returning();

	return created;
}

/** Marca uma interação PLANEJADA como realizada agora (ou cancela). */
export async function resolvePlannedInteraction({
	organizacaoId,
	interactionId,
	resolution,
	descricao,
}: {
	organizacaoId: string;
	interactionId: string;
	resolution: "REALIZADA" | "CANCELADA";
	descricao?: string | null;
}) {
	const existing = await db.query.interactions.findFirst({
		where: and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizacaoId)),
		columns: { id: true, status: true, descricao: true },
	});
	if (!existing) throw new createHttpError.NotFound("Interação não encontrada.");
	if (existing.status !== "PLANEJADA") throw new createHttpError.BadRequest("Apenas interações planejadas podem ser resolvidas.");

	const [updated] = await db
		.update(interactions)
		.set({
			status: resolution,
			dataInteracao: resolution === "REALIZADA" ? new Date() : undefined,
			descricao: descricao?.trim() || existing.descricao,
		})
		.where(and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizacaoId)))
		.returning();

	return updated;
}
