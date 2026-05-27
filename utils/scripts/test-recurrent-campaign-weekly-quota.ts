import "@/utils/scripts/load-next-env";
import { createCampaignWeeklyLimitCache, checkCampaignWeeklyInteractionLimit } from "@/lib/interactions/campaign-weekly-limits";
import { type ImmediateProcessingData, delay, processSingleInteractionImmediately } from "@/lib/interactions";
import { DASTJS_TIME_DURATION_UNITS_MAP } from "@/lib/dates";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { connection, type DBTransaction, db } from "@/services/drizzle";
import { clients, interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, inArray } from "drizzle-orm";

const SCRIPT_NAME = "TEST-RECURRENT-CAMPAIGN-WEEKLY-QUOTA";
const DEFAULT_ORGANIZATION_ID = "27817d9a-cb04-4704-a1f4-15b81a3610d3";
const DEFAULT_CAMPAIGN_ID = "e587f9c5-0c46-4956-ac50-c0058cc37846";
const DEFAULT_TEST_PHONE = "34996626855";
const TIME_BLOCKS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

type TScriptOptions = {
	mode: "preview" | "run";
	organizationId: string;
	campaignId: string;
	testPhoneNumber: string;
	maxClients: number | null;
	respectSchedule: boolean;
	ignoreFrequencyCap: boolean;
};

type TCampaignContext = NonNullable<
	Awaited<
		ReturnType<
			typeof db.query.campaigns.findFirst<{
				with: {
					segmentacoes: true;
					whatsappTemplate: true;
					whatsappConexaoTelefone: {
						with: {
							conexao: {
								columns: {
									token: true;
									gatewaySessaoId: true;
								};
							};
						};
					};
				};
			}>
		>
	>
>;

function getCurrentTimeBlock(currentTime = dayjs()): (typeof TIME_BLOCKS)[number] {
	const currentTotalMinutes = currentTime.hour() * 60 + currentTime.minute();
	let closestBlock = TIME_BLOCKS[0];

	for (const block of TIME_BLOCKS) {
		const [hour, minute] = block.split(":").map(Number);
		const blockTotalMinutes = hour * 60 + minute;
		if (blockTotalMinutes <= currentTotalMinutes) {
			closestBlock = block;
			continue;
		}
		break;
	}

	return closestBlock;
}

function shouldCampaignRunToday(campaign: {
	recorrenciaTipo: string | null;
	recorrenciaIntervalo: number | null;
	recorrenciaDiasSemana: string | null;
	recorrenciaDiasMes: string | null;
	dataInsercao: Date;
}): boolean {
	const today = dayjs();
	const campaignStart = dayjs(campaign.dataInsercao);
	const interval = campaign.recorrenciaIntervalo || 1;

	switch (campaign.recorrenciaTipo) {
		case "DIARIO": {
			const daysDiff = today.startOf("day").diff(campaignStart.startOf("day"), "day");
			return daysDiff >= 0 && daysDiff % interval === 0;
		}
		case "SEMANAL": {
			const diasSemana: number[] = JSON.parse(campaign.recorrenciaDiasSemana || "[]");
			if (!diasSemana.includes(today.day())) return false;
			const weeksDiff = today.startOf("week").diff(campaignStart.startOf("week"), "week");
			return weeksDiff >= 0 && weeksDiff % interval === 0;
		}
		case "MENSAL": {
			const diasMes: number[] = JSON.parse(campaign.recorrenciaDiasMes || "[]");
			if (!diasMes.includes(today.date())) return false;
			const monthsDiff = today.startOf("month").diff(campaignStart.startOf("month"), "month");
			return monthsDiff >= 0 && monthsDiff % interval === 0;
		}
		default:
			return false;
	}
}

async function canScheduleCampaignForClient(
	tx: DBTransaction,
	clienteId: string,
	campanhaId: string,
	frequenciaIntervaloValor: number | null,
	frequenciaIntervaloMedida: string | null,
): Promise<boolean> {
	if (frequenciaIntervaloValor && frequenciaIntervaloValor > 0 && frequenciaIntervaloMedida) {
		const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[frequenciaIntervaloMedida as TTimeDurationUnitsEnum] || "day";
		const cutoffDate = dayjs().subtract(frequenciaIntervaloValor, dayjsUnit).toDate();

		const recentInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq, gt }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId), gt(fields.dataInsercao, cutoffDate)),
		});

		if (recentInteraction) return false;
	}

	return true;
}

function getArgValue(name: string): string | undefined {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

function readScriptOptions(): TScriptOptions {
	const modeValue = getArgValue("mode");
	const maxClientsValue = getArgValue("max-clients");

	return {
		mode: modeValue === "run" ? "run" : "preview",
		organizationId: getArgValue("organization-id") ?? DEFAULT_ORGANIZATION_ID,
		campaignId: getArgValue("campaign-id") ?? DEFAULT_CAMPAIGN_ID,
		testPhoneNumber: getArgValue("phone") ?? DEFAULT_TEST_PHONE,
		maxClients: maxClientsValue ? Number(maxClientsValue) : null,
		respectSchedule: hasFlag("respect-schedule"),
		ignoreFrequencyCap: hasFlag("ignore-frequency-cap"),
	};
}

async function getCampaignContext(options: TScriptOptions): Promise<TCampaignContext> {
	const campaign = await db.query.campaigns.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, options.campaignId), eq(fields.organizacaoId, options.organizationId)),
		with: {
			segmentacoes: true,
			whatsappTemplate: true,
			whatsappConexaoTelefone: {
				with: {
					conexao: {
						columns: {
							token: true,
							gatewaySessaoId: true,
						},
					},
				},
			},
		},
	});

	if (!campaign) {
		throw new Error(`Campanha ${options.campaignId} não encontrada para a organização ${options.organizationId}.`);
	}

	if (!campaign.whatsappTemplate) {
		throw new Error(`Campanha ${options.campaignId} está sem template do WhatsApp.`);
	}

	return campaign as TCampaignContext;
}

async function getTargetClients(options: TScriptOptions, campaign: TCampaignContext) {
	const segmentationValues = campaign.segmentacoes.map((segmentacao) => segmentacao.segmentacao);

	let selectedClients: {
		id: string;
		nome: string | null;
		telefone: string | null;
		email: string | null;
		analiseRFMTitulo: string | null;
		metadataProdutoMaisCompradoId: string | null;
		metadataGrupoProdutoMaisComprado: string | null;
	}[] = [];

	if (segmentationValues.length > 0) {
		selectedClients = await db
			.select({
				id: clients.id,
				nome: clients.nome,
				telefone: clients.telefone,
				email: clients.email,
				analiseRFMTitulo: clients.analiseRFMTitulo,
				metadataProdutoMaisCompradoId: clients.metadataProdutoMaisCompradoId,
				metadataGrupoProdutoMaisComprado: clients.metadataGrupoProdutoMaisComprado,
			})
			.from(clients)
			.where(and(eq(clients.organizacaoId, options.organizationId), inArray(clients.analiseRFMTitulo, segmentationValues)));
	} else {
		selectedClients = await db
			.select({
				id: clients.id,
				nome: clients.nome,
				telefone: clients.telefone,
				email: clients.email,
				analiseRFMTitulo: clients.analiseRFMTitulo,
				metadataProdutoMaisCompradoId: clients.metadataProdutoMaisCompradoId,
				metadataGrupoProdutoMaisComprado: clients.metadataGrupoProdutoMaisComprado,
			})
			.from(clients)
			.where(eq(clients.organizacaoId, options.organizationId));
	}

	if (options.maxClients == null || Number.isNaN(options.maxClients)) {
		return selectedClients;
	}

	return selectedClients.slice(0, options.maxClients);
}

async function previewWeeklyLimitState(options: TScriptOptions, campaign: TCampaignContext) {
	const limitCheck = await checkCampaignWeeklyInteractionLimit({
		organizationId: options.organizationId,
		campaignId: campaign.id,
	});

	console.log(`[${SCRIPT_NAME}] Weekly limit state:`, {
		organizationWeeklyLimit: limitCheck.organizationWeeklyLimit,
		campaignWeeklyLimit: limitCheck.campaignWeeklyLimit,
		campaignEffectiveWeeklyLimit: limitCheck.campaignEffectiveWeeklyLimit,
		organizationUsedThisWeek: limitCheck.organizationUsedThisWeek,
		campaignUsedThisWeek: limitCheck.campaignUsedThisWeek,
		weekKey: limitCheck.weekKey,
	});
}

async function createTestInteractions(
	options: TScriptOptions,
	campaign: TCampaignContext,
	targetClients: Awaited<ReturnType<typeof getTargetClients>>,
) {
	const currentDateFormatted = dayjs().format("YYYY-MM-DD");
	const currentTimeBlock = getCurrentTimeBlock();
	const processingDataList: ImmediateProcessingData[] = [];
	let skippedByFrequencyCap = 0;

	await db.transaction(async (tx) => {
		for (const client of targetClients) {
			const canSchedule = options.ignoreFrequencyCap
				? true
				: await canScheduleCampaignForClient(tx, client.id, campaign.id, campaign.frequenciaIntervaloValor, campaign.frequenciaIntervaloMedida);

			if (!canSchedule) {
				skippedByFrequencyCap += 1;
				continue;
			}

			const [insertedInteraction] = await tx
				.insert(interactions)
				.values({
					clienteId: client.id,
					campanhaId: campaign.id,
					organizacaoId: options.organizationId,
					titulo: `Recorrente: ${campaign.titulo}`,
					tipo: "ENVIO-MENSAGEM",
					descricao: campaign.descricao ?? `Campanha recorrente: ${campaign.titulo}`,
					agendamentoDataReferencia: currentDateFormatted,
					agendamentoBlocoReferencia: currentTimeBlock,
				})
				.returning({ id: interactions.id });

			processingDataList.push({
				interactionId: insertedInteraction.id,
				organizationId: options.organizationId,
				client: {
					id: client.id,
					nome: client.nome ?? "Cliente teste",
					telefone: client.telefone ?? options.testPhoneNumber,
					email: client.email,
					analiseRFMTitulo: client.analiseRFMTitulo,
					metadataProdutoMaisCompradoId: client.metadataProdutoMaisCompradoId,
					metadataGrupoProdutoMaisComprado: client.metadataGrupoProdutoMaisComprado,
				},
				campaign: {
					autorId: campaign.autorId,
					whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId ?? "",
					whatsappTemplate: campaign.whatsappTemplate,
				},
				whatsappToken: campaign.whatsappConexaoTelefone?.conexao?.token ?? undefined,
				whatsappSessionId: campaign.whatsappConexaoTelefone?.conexao?.gatewaySessaoId ?? undefined,
				testing: {
					overridePhoneNumber: options.testPhoneNumber,
					disableWhatsappCloudApi: true,
					disableInternalGateway: true,
				},
			});
		}
	});

	return {
		processingDataList,
		skippedByFrequencyCap,
		currentTimeBlock,
		currentDateFormatted,
	};
}

async function runTestCampaign(options: TScriptOptions) {
	const startedAt = Date.now();
	const campaign = await getCampaignContext(options);
	const targetClients = await getTargetClients(options, campaign);
	const shouldRun = shouldCampaignRunToday(campaign);

	console.log(`[${SCRIPT_NAME}] Starting with options:`, options);
	console.log(`[${SCRIPT_NAME}] Campaign summary:`, {
		campaignId: campaign.id,
		title: campaign.titulo,
		recorrenciaTipo: campaign.recorrenciaTipo,
		recorrenciaIntervalo: campaign.recorrenciaIntervalo,
		shouldRunToday: shouldRun,
		targetClients: targetClients.length,
		hasWhatsappToken: Boolean(campaign.whatsappConexaoTelefone?.conexao?.token),
		hasGatewaySession: Boolean(campaign.whatsappConexaoTelefone?.conexao?.gatewaySessaoId),
		testPhoneNumber: options.testPhoneNumber,
	});

	await previewWeeklyLimitState(options, campaign);

	if (options.respectSchedule && !shouldRun) {
		console.log(`[${SCRIPT_NAME}] Campaign is not scheduled to run today. Exiting because --respect-schedule was provided.`);
		return;
	}

	if (options.mode === "preview") {
		console.log(`[${SCRIPT_NAME}] Preview mode: no interactions were created and no sends were attempted.`);
		return;
	}

	if (!campaign.whatsappConexaoTelefoneId) {
		throw new Error(`Campanha ${campaign.id} não possui whatsappConexaoTelefoneId configurado.`);
	}

	const { processingDataList, skippedByFrequencyCap, currentTimeBlock, currentDateFormatted } = await createTestInteractions(
		options,
		campaign,
		targetClients,
	);

	console.log(`[${SCRIPT_NAME}] Created interactions for test run:`, {
		created: processingDataList.length,
		skippedByFrequencyCap,
		currentDateFormatted,
		currentTimeBlock,
	});

	const weeklyLimitCache = createCampaignWeeklyLimitCache();
	const resultSummary = {
		success: 0,
		failed: 0,
	};

	for (const processingData of processingDataList) {
		const result = await processSingleInteractionImmediately({
			...processingData,
			weeklyLimitCache,
		});

		if (result.success) {
			resultSummary.success += 1;
		} else {
			resultSummary.failed += 1;
			console.error(`[${SCRIPT_NAME}] Interaction failed:`, {
				interactionId: processingData.interactionId,
				error: result.error,
			});
		}

		await delay(50);
	}

	await previewWeeklyLimitState(options, campaign);

	const elapsedMs = Date.now() - startedAt;
	console.log(`[${SCRIPT_NAME}] Finished in ${elapsedMs}ms.`, resultSummary);
}

void runTestCampaign(readScriptOptions())
	.then(() => {
		process.exitCode = 0;
	})
	.catch((error) => {
		console.error(`[${SCRIPT_NAME}] Error:`, error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end().catch((error) => {
			console.error(`[${SCRIPT_NAME}] Error while closing database connection:`, error);
		});
		process.exit(process.exitCode ?? 0);
	});
