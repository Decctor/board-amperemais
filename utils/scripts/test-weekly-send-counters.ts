import "@/utils/scripts/load-next-env";
import { reserveOrganizationWeeklyQuotaBatch } from "@/lib/interactions/campaign-weekly-limits";
import { updateInteractionDeliveryState } from "@/lib/interactions/delivery-state";
import { getCurrentWeekWindow, getWeeklySendUsage } from "@/lib/interactions/weekly-send-counters";
import { connection, db } from "@/services/drizzle";
import { campaigns, clients, interactions, organizations, weeklySendCounters } from "@/services/drizzle/schema";
import { and, count, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

const SCRIPT_NAME = "TEST-WEEKLY-SEND-COUNTERS";
const DEFAULT_ORGANIZATION_ID = "59c2b238-bc21-4710-b47b-db6e2a380079";
const QUOTA_CONSUMING_STATUSES = new Set(["PENDENTE", "ENVIADO", "ENTREGUE", "LIDO"]);

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function log(event: string, data: Record<string, unknown> = {}) {
	console.log(
		`[${SCRIPT_NAME}] ${event}`,
		JSON.stringify(
			data,
			(_key, value) => {
				if (value instanceof Map) return Object.fromEntries(value);
				if (value instanceof Set) return [...value];
				return value;
			},
			2,
		),
	);
}

function assert(condition: unknown, message: string, details: Record<string, unknown> = {}): asserts condition {
	if (!condition) {
		log("ASSERTION_FAILED", { message, ...details });
		throw new Error(message);
	}
	log("ASSERTION_PASSED", { message, ...details });
}

async function readInteractionStatusWithProbe(interactionId: string) {
	const observations: { elapsedMs: number; status: string | null }[] = [];
	const startedAt = Date.now();
	for (const delayMs of [0, 10, 50, 200, 500]) {
		if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
		const row = await db.query.interactions.findFirst({
			where: eq(interactions.id, interactionId),
			columns: { statusEnvio: true },
		});
		observations.push({ elapsedMs: Date.now() - startedAt, status: row?.statusEnvio ?? null });
	}
	return observations;
}

async function readCounterSnapshot(organizationId: string, campaignIds: string[]) {
	const { weekKey } = getCurrentWeekWindow();
	const rows = await db
		.select({ campaignId: weeklySendCounters.campanhaId, used: weeklySendCounters.usados })
		.from(weeklySendCounters)
		.where(
			and(
				eq(weeklySendCounters.organizacaoId, organizationId),
				eq(weeklySendCounters.semanaChave, weekKey),
				campaignIds.length > 0
					? or(isNull(weeklySendCounters.campanhaId), inArray(weeklySendCounters.campanhaId, campaignIds))
					: isNull(weeklySendCounters.campanhaId),
			),
		);

	return {
		weekKey,
		organizationUsed: rows.find((row) => row.campaignId == null)?.used ?? 0,
		campaignUsed: Object.fromEntries(rows.filter((row) => row.campaignId != null).map((row) => [row.campaignId as string, row.used])),
	};
}

async function run() {
	const organizationId = getArgValue("organization-id") ?? DEFAULT_ORGANIZATION_ID;
	if (process.argv.includes("--reconcile-only")) {
		await reconcileOrganizationCounter(organizationId);
		return;
	}
	const runId = crypto.randomUUID();
	const testTitle = `[QUOTA-TEST:${runId}]`;
	const temporaryCampaignIds: string[] = [];
	const testInteractionIds: string[] = [];
	let originalConfiguration: Awaited<ReturnType<typeof loadOrganizationContext>>["configuration"] | null = null;
	let originallyActiveCampaignIds: string[] = [];
	let organizationUsageBefore = 0;

	log("SAFETY", {
		organizationId,
		runId,
		providersCalled: false,
		description: "Este script importa apenas reserva de quota e atualização de estado; não importa nem chama funções de envio.",
	});

	try {
		const tableCheck = (await db.execute(sql`SELECT to_regclass('public.ampmais_weekly_send_counters') AS table_name`)) as unknown as {
			table_name: string | null;
		}[];
		assert(tableCheck[0]?.table_name != null, "A tabela ampmais_weekly_send_counters existe. Execute npm run db:push antes do teste.");

		const context = await loadOrganizationContext(organizationId);
		originalConfiguration = context.configuration;
		originallyActiveCampaignIds = context.activeCampaignIds;
		assert(context.clientId != null, "A organização possui ao menos um cliente para as interações temporárias.");
		assert(context.sourceCampaign != null, "A organização possui uma campanha que pode fornecer autor e template para campanhas temporárias.");
		log("PREFLIGHT", {
			organizationName: context.organizationName,
			originalWeeklyLimit: context.configuration.preferencias.limiteMensagensSemanaisViaCampanhas ?? null,
			activeCampaignIds: context.activeCampaignIds,
			sourceCampaignId: context.sourceCampaign.id,
			clientId: context.clientId,
		});

		if (originallyActiveCampaignIds.length > 0) {
			await db.update(campaigns).set({ ativo: false }).where(inArray(campaigns.id, originallyActiveCampaignIds));
			log("ACTIVE_CAMPAIGNS_PAUSED", { campaignIds: originallyActiveCampaignIds });
		}

		const [campaignA, campaignB] = await db
			.insert(campaigns)
			.values([
				{
					organizacaoId: organizationId,
					ativo: false,
					titulo: `${testTitle} CAMPANHA A`,
					gatilhoTipo: "NOVA-COMPRA",
					execucaoAgendadaBloco: "00:00",
					limiteEnviosSemanais: 2,
					whatsappTemplateId: context.sourceCampaign.whatsappTemplateId,
					autorId: context.sourceCampaign.autorId,
				},
				{
					organizacaoId: organizationId,
					ativo: false,
					titulo: `${testTitle} CAMPANHA B`,
					gatilhoTipo: "NOVA-COMPRA",
					execucaoAgendadaBloco: "00:00",
					limiteEnviosSemanais: 10,
					whatsappTemplateId: context.sourceCampaign.whatsappTemplateId,
					autorId: context.sourceCampaign.autorId,
				},
			])
			.returning({ id: campaigns.id, limit: campaigns.limiteEnviosSemanais });
		assert(campaignA != null && campaignB != null, "As duas campanhas temporárias foram criadas.");
		temporaryCampaignIds.push(campaignA.id, campaignB.id);
		log("TEMP_CAMPAIGNS_CREATED", { campaignA, campaignB });

		await getWeeklySendUsage({ organizationId, campaignId: campaignA.id, weekKey: getCurrentWeekWindow().weekKey });
		const initialCounters = await readCounterSnapshot(organizationId, temporaryCampaignIds);
		organizationUsageBefore = initialCounters.organizationUsed;
		log("COUNTERS_INITIALIZED", initialCounters);

		const testConfiguration = structuredClone(context.configuration);
		testConfiguration.preferencias.limiteMensagensSemanaisViaCampanhas = organizationUsageBefore + 3;
		await db.update(organizations).set({ configuracao: testConfiguration }).where(eq(organizations.id, organizationId));
		log("ORG_LIMIT_TEMPORARILY_SET", {
			previousLimit: context.configuration.preferencias.limiteMensagensSemanaisViaCampanhas ?? null,
			testLimit: organizationUsageBefore + 3,
			organizationUsageBefore,
		});

		const interactionPlan = [campaignA.id, campaignA.id, campaignA.id, campaignB.id, campaignB.id];
		for (const [index, campaignId] of interactionPlan.entries()) {
			const [interaction] = await db
				.insert(interactions)
				.values({
					organizacaoId: organizationId,
					clienteId: context.clientId,
					campanhaId: campaignId,
					titulo: `${testTitle} INTERACAO ${index + 1}`,
					descricao: "Interação sintética; nunca deve ser enviada.",
					tipo: "ENVIO-MENSAGEM",
					dataInsercao: new Date(Date.now() + index),
					metadados: { quotaModelTestRunId: runId, neverSend: true },
				})
				.returning({ id: interactions.id });
			assert(interaction != null, `A interação temporária ${index + 1} foi criada.`);
			testInteractionIds.push(interaction.id);
		}
		log("INTERACTIONS_CREATED", { interactionIds: testInteractionIds, interactionPlan });

		const reservation = await reserveOrganizationWeeklyQuotaBatch({ organizationId, interactionIds: testInteractionIds });
		log("RESERVATION_RESULT", {
			weekKey: reservation.weekKey,
			claimedInteractionIds: reservation.claimedInteractionIds,
			blockedInteractionIds: reservation.blockedInteractionIds,
			blockedReasonsByInteractionId: reservation.blockedReasonsByInteractionId,
			organizationUsedThisWeek: reservation.organizationUsedThisWeek,
			campaignUsedThisWeekByCampaignId: reservation.campaignUsedThisWeekByCampaignId,
		});

		assert(reservation.claimedInteractionIds.length === 3, "Três interações receberam quota.", { actual: reservation.claimedInteractionIds.length });
		assert(reservation.blockedInteractionIds.length === 2, "Duas interações foram bloqueadas.", { actual: reservation.blockedInteractionIds.length });
		assert(
			reservation.blockedReasonsByInteractionId.get(testInteractionIds[2] as string) === "CAMPAIGN_LIMIT_REACHED",
			"A terceira interação da campanha A foi bloqueada pelo limite da campanha.",
		);
		assert(
			reservation.blockedReasonsByInteractionId.get(testInteractionIds[4] as string) === "ORG_LIMIT_REACHED",
			"A segunda interação da campanha B foi bloqueada pelo limite da organização.",
		);

		const countersAfterReservation = await readCounterSnapshot(organizationId, temporaryCampaignIds);
		log("COUNTERS_AFTER_RESERVATION", countersAfterReservation);
		assert(countersAfterReservation.organizationUsed === organizationUsageBefore + 3, "O contador da organização aumentou em três.");
		assert(countersAfterReservation.campaignUsed[campaignA.id] === 2, "O contador da campanha A é dois.");
		assert(countersAfterReservation.campaignUsed[campaignB.id] === 1, "O contador da campanha B é um.");

		const interactionForConcurrency = reservation.claimedInteractionIds[0] as string;
		const duplicateFailures = await Promise.all([
			updateInteractionDeliveryState({ interactionId: interactionForConcurrency, organizationId, statusEnvio: "FALHOU", erroEnvio: "Falha simulada A" }),
			updateInteractionDeliveryState({ interactionId: interactionForConcurrency, organizationId, statusEnvio: "FALHOU", erroEnvio: "Falha simulada B" }),
		]);
		log("DUPLICATE_FAILURE_RESULTS", { duplicateFailures });
		const countersAfterDuplicateFailure = await readCounterSnapshot(organizationId, temporaryCampaignIds);
		log("COUNTERS_AFTER_DUPLICATE_FAILURE", countersAfterDuplicateFailure);
		assert(countersAfterDuplicateFailure.organizationUsed === organizationUsageBefore + 2, "Falhas concorrentes liberaram quota apenas uma vez.");
		assert(countersAfterDuplicateFailure.campaignUsed[campaignA.id] === 1, "A campanha A liberou quota apenas uma vez.");

		const delayedSuccess = await updateInteractionDeliveryState({
			interactionId: interactionForConcurrency,
			organizationId,
			statusEnvio: "ENTREGUE",
		});
		const visibilityProbeAfterDelayedSuccess = await readInteractionStatusWithProbe(interactionForConcurrency);
		const duplicateSuccess = await updateInteractionDeliveryState({
			interactionId: interactionForConcurrency,
			organizationId,
			statusEnvio: "ENTREGUE",
		});
		const statusAfterDuplicateSuccess = await db.query.interactions.findFirst({
			where: eq(interactions.id, interactionForConcurrency),
			columns: { statusEnvio: true },
		});
		log("DELAYED_AND_DUPLICATE_SUCCESS_RESULTS", {
			delayedSuccess,
			visibilityProbeAfterDelayedSuccess,
			duplicateSuccess,
			statusAfterDuplicateSuccess,
		});
		assert(delayedSuccess.previousStatus === "FALHOU" && delayedSuccess.statusChanged, "O sucesso atrasado aplicou FALHOU → ENTREGUE.");
		assert(
			visibilityProbeAfterDelayedSuccess.every((observation) => observation.status === "ENTREGUE"),
			"Todas as leituras pós-commit observaram ENTREGUE.",
			{ visibilityProbeAfterDelayedSuccess },
		);
		assert(duplicateSuccess.previousStatus === "ENTREGUE" && !duplicateSuccess.statusChanged, "O sucesso duplicado foi idempotente.");
		assert(statusAfterDuplicateSuccess?.statusEnvio === "ENTREGUE", "O status permaneceu ENTREGUE após o evento duplicado.");
		const countersAfterDelayedSuccess = await readCounterSnapshot(organizationId, temporaryCampaignIds);
		log("COUNTERS_AFTER_DELAYED_SUCCESS", countersAfterDelayedSuccess);
		assert(countersAfterDelayedSuccess.organizationUsed === organizationUsageBefore + 3, "O sucesso atrasado recompôs a quota uma única vez.");
		assert(countersAfterDelayedSuccess.campaignUsed[campaignA.id] === 2, "O sucesso atrasado recompôs o contador da campanha A.");

		log("TEST_SUCCEEDED", {
			runId,
			organizationId,
			verified: ["CAMPAIGN_LIMIT", "ORGANIZATION_LIMIT", "CONCURRENT_FAILURE_IDEMPOTENCY", "DELAYED_SUCCESS_REACQUISITION"],
		});
	} finally {
		log("CLEANUP_STARTED", { runId, testInteractionIds, temporaryCampaignIds });
		if (testInteractionIds.length > 0) {
			const existingTestInteractions = await db.query.interactions.findMany({
				where: inArray(interactions.id, testInteractionIds),
				columns: { id: true, statusEnvio: true },
			});
			for (const interaction of existingTestInteractions) {
				if (interaction.statusEnvio && QUOTA_CONSUMING_STATUSES.has(interaction.statusEnvio)) {
					await updateInteractionDeliveryState({
						interactionId: interaction.id,
						organizationId,
						statusEnvio: "FALHOU",
						erroEnvio: "Limpeza do teste de quota.",
						preventStatusDowngrade: false,
					});
				}
			}
			await db.delete(interactions).where(inArray(interactions.id, testInteractionIds));
			await reconcileOrganizationCounter(organizationId);
		}
		if (temporaryCampaignIds.length > 0) {
			await db.delete(campaigns).where(inArray(campaigns.id, temporaryCampaignIds));
		}
		if (originalConfiguration) {
			await db.update(organizations).set({ configuracao: originalConfiguration }).where(eq(organizations.id, organizationId));
		}
		if (originallyActiveCampaignIds.length > 0) {
			await db.update(campaigns).set({ ativo: true }).where(inArray(campaigns.id, originallyActiveCampaignIds));
		}

		const finalCounter = await db.query.weeklySendCounters.findFirst({
			where: and(
				eq(weeklySendCounters.organizacaoId, organizationId),
				eq(weeklySendCounters.semanaChave, getCurrentWeekWindow().weekKey),
				sql`${weeklySendCounters.campanhaId} IS NULL`,
			),
			columns: { usados: true },
		});
		log("CLEANUP_FINISHED", {
			organizationUsageBefore,
			organizationUsageAfterCleanup: finalCounter?.usados ?? 0,
			configurationRestored: originalConfiguration != null,
			reactivatedCampaignIds: originallyActiveCampaignIds,
		});
	}
}

async function reconcileOrganizationCounter(organizationId: string) {
	const { weekKey, startOfWeekDate } = getCurrentWeekWindow();
	const [actualUsage] = await db
		.select({ used: count() })
		.from(interactions)
		.where(
			and(
				eq(interactions.organizacaoId, organizationId),
				isNotNull(interactions.campanhaId),
				eq(interactions.tipo, "ENVIO-MENSAGEM"),
				inArray(interactions.statusEnvio, ["PENDENTE", "ENVIADO", "ENTREGUE", "LIDO"]),
				gte(interactions.dataExecucao, startOfWeekDate),
			),
		);
	const [counterBefore] = await db
		.select({ used: weeklySendCounters.usados })
		.from(weeklySendCounters)
		.where(
			and(eq(weeklySendCounters.organizacaoId, organizationId), isNull(weeklySendCounters.campanhaId), eq(weeklySendCounters.semanaChave, weekKey)),
		);
	await db
		.update(weeklySendCounters)
		.set({ usados: actualUsage?.used ?? 0 })
		.where(
			and(eq(weeklySendCounters.organizacaoId, organizationId), isNull(weeklySendCounters.campanhaId), eq(weeklySendCounters.semanaChave, weekKey)),
		);
	log("ORGANIZATION_COUNTER_RECONCILED", {
		organizationId,
		weekKey,
		counterBefore: counterBefore?.used ?? null,
		actualUsage: actualUsage?.used ?? 0,
	});
}

async function loadOrganizationContext(organizationId: string) {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizationId),
		columns: { nome: true, configuracao: true },
	});
	if (!organization) throw new Error(`Organização ${organizationId} não encontrada.`);

	const [sourceCampaign, client, activeCampaigns] = await Promise.all([
		db.query.campaigns.findFirst({
			where: eq(campaigns.organizacaoId, organizationId),
			columns: { id: true, autorId: true, whatsappTemplateId: true },
		}),
		db.query.clients.findFirst({
			where: eq(clients.organizacaoId, organizationId),
			columns: { id: true },
		}),
		db.query.campaigns.findMany({
			where: and(eq(campaigns.organizacaoId, organizationId), eq(campaigns.ativo, true)),
			columns: { id: true },
		}),
	]);

	return {
		organizationName: organization.nome,
		configuration: organization.configuracao,
		sourceCampaign,
		clientId: client?.id ?? null,
		activeCampaignIds: activeCampaigns.map((campaign) => campaign.id),
	};
}

void run()
	.catch((error) => {
		console.error(`[${SCRIPT_NAME}] TEST_FAILED`, error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
