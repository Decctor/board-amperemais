import type { TInteractionsStatusEnum } from "@/schemas/interactions";
import { db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { adjustWeeklySendQuota } from "./weekly-send-counters";

const PROGRESSIVE_DELIVERY_STATUS_RANK: Partial<Record<TInteractionsStatusEnum, number>> = {
	PENDENTE: 0,
	ENVIADO: 1,
	ENTREGUE: 2,
	LIDO: 3,
};

const QUOTA_CONSUMING_STATUSES: TInteractionsStatusEnum[] = ["PENDENTE", "ENVIADO", "ENTREGUE", "LIDO"];
const QUOTA_RELEASING_STATUSES: TInteractionsStatusEnum[] = ["FALHOU", "BLOQUEADA"];

function resolveNextDeliveryStatus({
	current,
	incoming,
	preventStatusDowngrade,
}: {
	current: TInteractionsStatusEnum | null;
	incoming: TInteractionsStatusEnum;
	preventStatusDowngrade: boolean;
}) {
	if (!preventStatusDowngrade || current == null) return incoming;
	if (current === "BLOQUEADA" && incoming !== "BLOQUEADA") return current;

	const currentRank = PROGRESSIVE_DELIVERY_STATUS_RANK[current];
	const incomingRank = PROGRESSIVE_DELIVERY_STATUS_RANK[incoming];
	if (incomingRank != null && currentRank != null && currentRank > incomingRank) return current;
	if ((current === "ENTREGUE" || current === "LIDO") && incoming === "FALHOU") return current;

	return incoming;
}

function asMetadataRecord(value: unknown): Record<string, unknown> {
	return value != null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

type TUpdateInteractionDeliveryStateInput = {
	interactionId: string;
	organizationId?: string;
	statusEnvio: TInteractionsStatusEnum;
	erroEnvio?: string | null;
	metadataPatch?: Record<string, unknown>;
	occurredAt?: Date;
	preventStatusDowngrade?: boolean;
};

type TUpdateInteractionDeliveryStateOutput = {
	updated: boolean;
	interactionId: string;
	previousStatus: TInteractionsStatusEnum | null;
	nextStatus: TInteractionsStatusEnum;
	statusChanged: boolean;
};

// Serializa transições concorrentes da mesma interação com FOR UPDATE. A mudança de status e o
// eventual delta de quota são confirmados na mesma transação, evitando liberação duplicada por
// webhooks repetidos ou concorrentes.
//
// A regra de status espelha a antiga resolveNextStatus() quando preventStatusDowngrade está ativo:
//   - status atual nulo OU prevenção desligada  -> aplica o incoming
//   - atual = BLOQUEADA e incoming != BLOQUEADA -> mantém o atual
//   - rank(atual) > rank(incoming)              -> mantém o atual (PENDENTE<ENVIADO<ENTREGUE<LIDO)
//   - atual em (ENTREGUE, LIDO) e incoming FALHOU -> mantém o atual
//   - caso contrário                            -> aplica o incoming
export async function updateInteractionDeliveryState({
	interactionId,
	organizationId,
	statusEnvio,
	erroEnvio,
	metadataPatch,
	occurredAt,
	preventStatusDowngrade = true,
}: TUpdateInteractionDeliveryStateInput): Promise<TUpdateInteractionDeliveryStateOutput> {
	const incoming = statusEnvio;
	const transitionDate = occurredAt ?? new Date();

	const result = await db.transaction(async (tx) => {
		const [currentInteraction] = await tx
			.select({
				statusEnvio: interactions.statusEnvio,
				organizacaoId: interactions.organizacaoId,
				campanhaId: interactions.campanhaId,
				tipo: interactions.tipo,
				dataExecucao: interactions.dataExecucao,
				dataEnvio: interactions.dataEnvio,
				metadados: interactions.metadados,
				erroEnvio: interactions.erroEnvio,
			})
			.from(interactions)
			.where(
				organizationId ? and(eq(interactions.id, interactionId), eq(interactions.organizacaoId, organizationId)) : eq(interactions.id, interactionId),
			)
			.for("update");

		if (!currentInteraction) return null;

		const previousStatus = currentInteraction.statusEnvio;
		const nextStatus = resolveNextDeliveryStatus({ current: previousStatus, incoming, preventStatusDowngrade });
		const statusChanged = previousStatus !== nextStatus;
		const previouslyConsumedQuota = previousStatus != null && QUOTA_CONSUMING_STATUSES.includes(previousStatus);
		const nextConsumesQuota = QUOTA_CONSUMING_STATUSES.includes(nextStatus);

		if (
			statusChanged &&
			previouslyConsumedQuota !== nextConsumesQuota &&
			currentInteraction.tipo === "ENVIO-MENSAGEM" &&
			currentInteraction.campanhaId != null &&
			currentInteraction.organizacaoId != null
		) {
			await adjustWeeklySendQuota({
				tx,
				organizationId: currentInteraction.organizacaoId,
				campaignId: currentInteraction.campanhaId,
				claimedAt: currentInteraction.dataExecucao ?? transitionDate,
				delta: nextConsumesQuota ? 1 : -1,
			});
		}

		const incomingWasApplied = nextStatus === incoming;
		const nextError = incomingWasApplied
			? erroEnvio !== undefined
				? erroEnvio
				: QUOTA_RELEASING_STATUSES.includes(nextStatus)
					? currentInteraction.erroEnvio
					: null
			: currentInteraction.erroEnvio;
		const writesDeliveryDates = nextStatus === "ENVIADO" || nextStatus === "ENTREGUE" || nextStatus === "LIDO";

		const [updatedInteraction] = await tx
			.update(interactions)
			.set({
				statusEnvio: nextStatus,
				erroEnvio: nextError,
				dataExecucao: writesDeliveryDates ? (currentInteraction.dataExecucao ?? transitionDate) : currentInteraction.dataExecucao,
				dataEnvio: writesDeliveryDates ? (currentInteraction.dataEnvio ?? transitionDate) : currentInteraction.dataEnvio,
				metadados: { ...asMetadataRecord(currentInteraction.metadados), ...metadataPatch },
			})
			.where(eq(interactions.id, interactionId))
			.returning({ statusEnvio: interactions.statusEnvio });

		if (!updatedInteraction) {
			throw new Error(`A interação ${interactionId} deixou de existir durante a atualização do estado de entrega.`);
		}
		if (updatedInteraction.statusEnvio !== nextStatus) {
			throw new Error(
				`Status persistido inesperado para a interação ${interactionId}: esperado ${nextStatus}, recebido ${updatedInteraction.statusEnvio}.`,
			);
		}

		return { previousStatus, nextStatus, statusChanged };
	});

	if (!result) {
		return {
			updated: false,
			interactionId,
			previousStatus: null,
			nextStatus: statusEnvio,
			statusChanged: false,
		};
	}

	return {
		updated: true,
		interactionId,
		...result,
	};
}

export function markInteractionFailed(params: Omit<TUpdateInteractionDeliveryStateInput, "statusEnvio">) {
	return updateInteractionDeliveryState({ ...params, statusEnvio: "FALHOU" });
}

export function markInteractionBlocked(params: Omit<TUpdateInteractionDeliveryStateInput, "statusEnvio">) {
	return updateInteractionDeliveryState({ ...params, statusEnvio: "BLOQUEADA" });
}
