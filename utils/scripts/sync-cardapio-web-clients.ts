import "@/utils/scripts/load-next-env";
import { getScriptDataSourceIntegration } from "@/utils/scripts/get-data-source-integration";

import { fetchCardapioWebOrdersWithDetails } from "@/lib/data-connectors/cardapio-web";
import { type MappedCardapioWebClient, type MappedCardapioWebSale, mapCardapioWebSales } from "@/lib/data-connectors/cardapio-web/mappers";
import type { TCardapioWebConfig } from "@/lib/data-connectors/cardapio-web/types";
import { type TClientEntity, clients } from "@/services/drizzle/schema";
import { db } from "@/services/drizzle";
import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";

const TARGET_ORGANIZATION_ID = "94d515f6-4c61-46e3-a05f-3f9fc4ad6d22";
const START_DATE = "2025-12-01T00:00:00.000Z";
const END_DATE = dayjs().toISOString();

type ExistingClient = Pick<
	TClientEntity,
	| "id"
	| "idExterno"
	| "nome"
	| "telefone"
	| "telefoneBase"
	| "localizacaoCep"
	| "localizacaoEstado"
	| "localizacaoCidade"
	| "localizacaoBairro"
	| "localizacaoLogradouro"
	| "localizacaoNumero"
	| "localizacaoLatitude"
	| "localizacaoLongitude"
>;

type ClientUpdatePayload = Partial<
	Pick<
		TClientEntity,
		| "idExterno"
		| "nome"
		| "telefone"
		| "telefoneBase"
		| "localizacaoCep"
		| "localizacaoEstado"
		| "localizacaoCidade"
		| "localizacaoBairro"
		| "localizacaoLogradouro"
		| "localizacaoNumero"
		| "localizacaoLatitude"
		| "localizacaoLongitude"
	>
>;

type ClientSyncCandidate = {
	dbClient: ExistingClient;
	cardapioWebClient: MappedCardapioWebClient;
	saleDate: Date;
	matchedBy: "external-id" | "phone";
};

function getCliArgValue(argName: string) {
	const prefix = `--${argName}=`;
	const arg = process.argv.find((item) => item.startsWith(prefix));

	return arg?.slice(prefix.length);
}

function hasUsableValue(value: string | null | undefined): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function setIfChanged<K extends keyof ClientUpdatePayload>(
	payload: ClientUpdatePayload,
	existingValue: ExistingClient[K],
	field: K,
	nextValue: ClientUpdatePayload[K],
) {
	if (!hasUsableValue(nextValue)) return;
	if (existingValue === nextValue) return;

	payload[field] = nextValue;
}

function getClientUpdatePayload(existingClient: ExistingClient, cardapioWebClient: MappedCardapioWebClient): ClientUpdatePayload {
	const payload: ClientUpdatePayload = {};
	const isValidClientName = cardapioWebClient.nome !== "CLIENTE CARDAPIO WEB";

	if (isValidClientName) {
		setIfChanged(payload, existingClient.nome, "nome", cardapioWebClient.nome);
	}

	setIfChanged(payload, existingClient.telefone, "telefone", cardapioWebClient.telefone);
	setIfChanged(payload, existingClient.telefoneBase, "telefoneBase", cardapioWebClient.telefoneBase);
	setIfChanged(payload, existingClient.localizacaoCep, "localizacaoCep", cardapioWebClient.localizacaoCep);
	setIfChanged(payload, existingClient.localizacaoEstado, "localizacaoEstado", cardapioWebClient.localizacaoEstado);
	setIfChanged(payload, existingClient.localizacaoCidade, "localizacaoCidade", cardapioWebClient.localizacaoCidade);
	setIfChanged(payload, existingClient.localizacaoBairro, "localizacaoBairro", cardapioWebClient.localizacaoBairro);
	setIfChanged(payload, existingClient.localizacaoLogradouro, "localizacaoLogradouro", cardapioWebClient.localizacaoLogradouro);
	setIfChanged(payload, existingClient.localizacaoNumero, "localizacaoNumero", cardapioWebClient.localizacaoNumero);
	setIfChanged(payload, existingClient.localizacaoLatitude, "localizacaoLatitude", cardapioWebClient.localizacaoLatitude);
	setIfChanged(payload, existingClient.localizacaoLongitude, "localizacaoLongitude", cardapioWebClient.localizacaoLongitude);

	return payload;
}

function resolveExistingClient(
	sale: MappedCardapioWebSale,
	clientsByExternalId: Map<string, ExistingClient>,
	clientsByBasePhone: Map<string, ExistingClient>,
): { dbClient: ExistingClient; matchedBy: ClientSyncCandidate["matchedBy"] } | null {
	const externalId = sale.cliente?.idExterno;
	if (externalId) {
		const clientByExternalId = clientsByExternalId.get(externalId);
		if (clientByExternalId) return { dbClient: clientByExternalId, matchedBy: "external-id" };
	}

	const basePhone = sale.cliente?.telefoneBase;
	if (basePhone) {
		const clientByBasePhone = clientsByBasePhone.get(basePhone);
		if (clientByBasePhone) return { dbClient: clientByBasePhone, matchedBy: "phone" };
	}
	console.log("No match found for sale:", sale.cliente?.idExterno, sale.cliente?.telefoneBase);
	return null;
}

function getLatestClientSyncCandidates(mappedSales: MappedCardapioWebSale[], existingClients: ExistingClient[]) {
	const clientsByExternalId = new Map(
		existingClients.flatMap((client) => (hasUsableValue(client.idExterno) ? ([[client.idExterno, client]] as const) : [])),
	);
	const clientsByBasePhone = new Map(
		existingClients.flatMap((client) => (hasUsableValue(client.telefoneBase) ? ([[client.telefoneBase, client]] as const) : [])),
	);
	const candidatesByClientId = new Map<string, ClientSyncCandidate>();
	let skippedWithoutClient = 0;
	let skippedWithoutMatch = 0;
	let matchedByExternalId = 0;
	let matchedByPhone = 0;

	const sortedSales = [...mappedSales].sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());

	for (const sale of sortedSales) {
		if (!sale.cliente) {
			skippedWithoutClient++;
			continue;
		}

		const resolvedClient = resolveExistingClient(sale, clientsByExternalId, clientsByBasePhone);
		if (!resolvedClient) {
			skippedWithoutMatch++;
			continue;
		}

		if (resolvedClient.matchedBy === "external-id") {
			matchedByExternalId++;
		} else {
			matchedByPhone++;
		}

		candidatesByClientId.set(resolvedClient.dbClient.id, {
			dbClient: resolvedClient.dbClient,
			cardapioWebClient: sale.cliente,
			saleDate: sale.dataVenda,
			matchedBy: resolvedClient.matchedBy,
		});
	}

	return {
		candidates: Array.from(candidatesByClientId.values()),
		stats: {
			skippedWithoutClient,
			skippedWithoutMatch,
			matchedByExternalId,
			matchedByPhone,
		},
	};
}

export async function handleCardapioWebClientUpdates(organizationId: string, config: TCardapioWebConfig) {
	console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB-CLIENTS] Fetching orders from ${START_DATE} to ${END_DATE}`);

	const orderDetails = await fetchCardapioWebOrdersWithDetails(config, START_DATE, END_DATE);
	if (orderDetails.length === 0) {
		console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB-CLIENTS] No orders found.`);
		return {
			ordersLoaded: 0,
			candidates: 0,
			updatedCount: 0,
			skippedWithoutChanges: 0,
			skippedWithoutClient: 0,
			skippedWithoutMatch: 0,
			matchedByExternalId: 0,
			matchedByPhone: 0,
		};
	}

	const mappedSales = mapCardapioWebSales(orderDetails);

	return db.transaction(async (tx) => {
		const existingClients = await tx.query.clients.findMany({
			where: (fields, { eq: equals }) => equals(fields.organizacaoId, organizationId),
			columns: {
				id: true,
				idExterno: true,
				nome: true,
				telefone: true,
				telefoneBase: true,
				localizacaoCep: true,
				localizacaoEstado: true,
				localizacaoCidade: true,
				localizacaoBairro: true,
				localizacaoLogradouro: true,
				localizacaoNumero: true,
				localizacaoLatitude: true,
				localizacaoLongitude: true,
			},
		});
		const { candidates, stats } = getLatestClientSyncCandidates(mappedSales, existingClients);

		let updatedCount = 0;
		let skippedWithoutChanges = 0;

		for (const candidate of candidates) {
			const updatePayload = getClientUpdatePayload(candidate.dbClient, candidate.cardapioWebClient);
			if (Object.keys(updatePayload).length === 0) {
				skippedWithoutChanges++;
				continue;
			}

			console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB-CLIENTS] Updating client ${candidate.dbClient.id}`, {
				matchedBy: candidate.matchedBy,
				saleDate: candidate.saleDate.toISOString(),
				fields: Object.keys(updatePayload),
			});

			await tx
				.update(clients)
				.set(updatePayload)
				.where(and(eq(clients.id, candidate.dbClient.id), eq(clients.organizacaoId, organizationId)));

			updatedCount++;
		}

		const result = {
			ordersLoaded: orderDetails.length,
			candidates: candidates.length,
			updatedCount,
			skippedWithoutChanges,
			...stats,
		};

		console.log(`[ORG: ${organizationId}] [CARDAPIO-WEB-CLIENTS] Client update sync completed.`, result);
		return result;
	});
}

export async function syncCardapioWebClientUpdates() {
	const organizationId = getCliArgValue("organizationId") ?? TARGET_ORGANIZATION_ID;

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq: equals }) => equals(fields.id, organizationId),
		columns: {
			nome: true,
		},
	});

	if (!organization) {
		throw new Error("Organização não encontrada.");
	}

	const integration = await getScriptDataSourceIntegration({ organizationId, types: ["CARDAPIO-WEB"] });

	// Sem config no log — credenciais (apiKey) não vazam para stdout.
	console.log(`[SYNC-CARDAPIO-WEB-CLIENTS] Syncing clients for organization ${organizationId}`, {
		organizationId,
		organizationName: organization.nome,
		integrationId: integration.id,
	});

	const configData = integration.configuracao as TCardapioWebConfig;
	const stats = await handleCardapioWebClientUpdates(organizationId, configData);
	const result = {
		message: "Atualização de clientes concluída",
		organizationId,
		stats,
	};

	console.log("[SYNC-CARDAPIO-WEB-CLIENTS] Done:", result);
	return result;
}

void syncCardapioWebClientUpdates()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error("[SYNC-CARDAPIO-WEB-CLIENTS] Error:", error);
		process.exit(1);
	});
