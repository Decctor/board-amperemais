import { formatPhoneAsBase, formatStringAsOnlyDigits, formatToPhone } from "@/lib/formatting";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema/clients";
import { whatsappConnectionPhones } from "@/services/drizzle/schema/whatsapp-connections";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";

const META_GRAPH_API_VERSION = "v25.0";

export type TSmbAppStateSyncContact = {
	fullName: string | null;
	firstName: string | null;
	phoneNumberRaw: string;
	action: "add" | "remove";
};

export type TSmbAppStateSyncEvent = {
	whatsappPhoneNumberId: string;
	contacts: TSmbAppStateSyncContact[];
};

type TNormalizedContact = {
	name: string | null;
	phone: string;
	phoneBase: string;
	identityKeys: string[];
};

function normalizeClientName(contact: TSmbAppStateSyncContact) {
	return contact.fullName?.trim() || contact.firstName?.trim() || null;
}

function getBrazilianNationalDigits(digits: string) {
	if (!digits.startsWith("55")) return null;
	const nationalDigits = digits.slice(2);
	return nationalDigits.length === 10 || nationalDigits.length === 11 ? nationalDigits : null;
}

function createPhoneIdentityKeys(phone: string, phoneBase?: string | null) {
	const digits = formatStringAsOnlyDigits(phone);
	if (!digits) return [];

	const keys = new Set<string>([`exact:${digits}`]);
	const brazilianNationalDigits = getBrazilianNationalDigits(digits);

	if (brazilianNationalDigits) {
		keys.add(`exact:${brazilianNationalDigits}`);
		keys.add(`base:${formatPhoneAsBase(brazilianNationalDigits)}`);
	} else if (digits.length === 10 || digits.length === 11) {
		keys.add(`exact:55${digits}`);
		keys.add(`base:${formatPhoneAsBase(digits)}`);
	} else {
		// For non-Brazilian E.164 numbers, only the complete number is safe for identity matching.
		keys.add(`base:${digits}`);
	}

	const normalizedPhoneBase = phoneBase?.trim();
	if (normalizedPhoneBase) keys.add(`base:${normalizedPhoneBase}`);

	return Array.from(keys).filter((key) => !key.endsWith(":"));
}

function normalizeContact(contact: TSmbAppStateSyncContact): TNormalizedContact | null {
	const digits = formatStringAsOnlyDigits(contact.phoneNumberRaw);
	if (!digits) return null;

	const brazilianNationalDigits = getBrazilianNationalDigits(digits);
	if (digits.startsWith("55") && !brazilianNationalDigits) return null;

	if (brazilianNationalDigits) {
		const phoneBase = formatPhoneAsBase(brazilianNationalDigits);
		if (!phoneBase) return null;
		return {
			name: normalizeClientName(contact),
			phone: formatToPhone(brazilianNationalDigits),
			phoneBase,
			identityKeys: createPhoneIdentityKeys(digits, phoneBase),
		};
	}

	if (digits.length === 10 || digits.length === 11) {
		const phoneBase = formatPhoneAsBase(digits);
		if (!phoneBase) return null;
		return {
			name: normalizeClientName(contact),
			phone: formatToPhone(digits),
			phoneBase,
			identityKeys: createPhoneIdentityKeys(digits, phoneBase),
		};
	}

	if (digits.length < 8 || digits.length > 15) return null;
	return {
		name: normalizeClientName(contact),
		phone: `+${digits}`,
		phoneBase: digits,
		identityKeys: createPhoneIdentityKeys(digits, digits),
	};
}

function isPhonePlaceholderName(name: string, phone: string) {
	const normalizedName = name.trim();
	if (!normalizedName) return true;

	if (normalizedName.replace(/[\d\s()+.-]/g, "")) return false;
	const nameDigits = formatStringAsOnlyDigits(normalizedName);
	if (!nameDigits) return false;

	const phoneKeys = new Set(createPhoneIdentityKeys(phone));
	return createPhoneIdentityKeys(nameDigits).some((key) => phoneKeys.has(key));
}

function getClientIdentityKeys(client: { telefone: string; telefoneBase: string }) {
	return createPhoneIdentityKeys(client.telefone, client.telefoneBase);
}

export async function fetchPhoneCoexistenceStatus(phoneNumberId: string, accessToken: string) {
	const url = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${phoneNumberId}`);
	url.searchParams.set("fields", "is_on_biz_app,platform_type");

	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	const result = (await response.json()) as {
		is_on_biz_app?: boolean;
		platform_type?: string;
		error?: { message?: string };
	};

	if (!response.ok) {
		throw new createHttpError.BadGateway(result.error?.message ?? "Não foi possível verificar a coexistência do número na Meta.");
	}

	return {
		isOnBizApp: result.is_on_biz_app === true,
		platformType: result.platform_type ?? null,
	};
}

export async function requestSmbAppContactsSync(phoneNumberId: string, accessToken: string) {
	const response = await fetch(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${phoneNumberId}/smb_app_data`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			messaging_product: "whatsapp",
			sync_type: "smb_app_state_sync",
		}),
	});
	const result = (await response.json()) as {
		request_id?: string;
		error?: { message?: string };
	};

	if (!response.ok) {
		throw new createHttpError.BadGateway(result.error?.message ?? "Não foi possível solicitar a sincronização de contatos na Meta.");
	}

	return { requestId: result.request_id ?? null };
}

export async function triggerSmbAppContactsSync({ phoneNumberId, accessToken }: { phoneNumberId: string; accessToken: string }) {
	const coexistenceStatus = await fetchPhoneCoexistenceStatus(phoneNumberId, accessToken);
	if (!coexistenceStatus.isOnBizApp) {
		return {
			requested: false,
			requestId: null,
			reason: "NOT_COEXISTENCE" as const,
			platformType: coexistenceStatus.platformType,
		};
	}

	const { requestId } = await requestSmbAppContactsSync(phoneNumberId, accessToken);
	return {
		requested: true,
		requestId,
		reason: null,
		platformType: coexistenceStatus.platformType,
	};
}

export function parseSmbAppStateSyncWebhook(webhookPayload: unknown): TSmbAppStateSyncEvent[] {
	const payload = webhookPayload as Record<string, unknown>;
	const entries = Array.isArray(payload.entry) ? payload.entry : [];
	const events: TSmbAppStateSyncEvent[] = [];

	for (const entryValue of entries) {
		const entry = entryValue as Record<string, unknown>;
		const changes = Array.isArray(entry.changes) ? entry.changes : [];

		for (const changeValue of changes) {
			const change = changeValue as Record<string, unknown>;
			if (change.field !== "smb_app_state_sync") continue;

			const value = change.value as Record<string, unknown> | undefined;
			const metadata = value?.metadata as Record<string, unknown> | undefined;
			const whatsappPhoneNumberId = metadata?.phone_number_id;
			if (typeof whatsappPhoneNumberId !== "string" || !whatsappPhoneNumberId) continue;

			const contacts: TSmbAppStateSyncContact[] = [];
			const stateSync = Array.isArray(value?.state_sync) ? value.state_sync : [];

			for (const syncValue of stateSync) {
				const syncItem = syncValue as Record<string, unknown>;
				if (syncItem.type !== "contact") continue;

				const contact = syncItem.contact as Record<string, unknown> | undefined;
				const phoneNumberRaw = contact?.phone_number;
				const action = syncItem.action;
				if (typeof phoneNumberRaw !== "string" || (action !== "add" && action !== "remove")) continue;

				contacts.push({
					fullName: typeof contact?.full_name === "string" ? contact.full_name : null,
					firstName: typeof contact?.first_name === "string" ? contact.first_name : null,
					phoneNumberRaw,
					action,
				});
			}

			events.push({ whatsappPhoneNumberId, contacts });
		}
	}

	return events;
}

export async function resolveOrganizationIdByWhatsappPhoneNumberId(whatsappPhoneNumberId: string) {
	const phone = await db.query.whatsappConnectionPhones.findFirst({
		where: eq(whatsappConnectionPhones.whatsappTelefoneId, whatsappPhoneNumberId),
		with: { conexao: { columns: { organizacaoId: true } } },
	});
	return phone?.conexao?.organizacaoId ?? null;
}

export async function upsertClientsFromSmbAppStateSync({
	organizationId,
	contacts,
}: {
	organizationId: string;
	contacts: TSmbAppStateSyncContact[];
}) {
	const addContacts = contacts.filter((contact) => contact.action === "add");
	const ignoredRemoveCount = contacts.length - addContacts.length;
	const normalizedContacts = addContacts.map(normalizeContact).filter((contact): contact is TNormalizedContact => contact !== null);
	const invalidCount = addContacts.length - normalizedContacts.length;

	const deduplicatedContacts: TNormalizedContact[] = [];
	const contactIndexByIdentity = new Map<string, number>();
	for (const contact of normalizedContacts) {
		const existingIndex = contact.identityKeys.map((key) => contactIndexByIdentity.get(key)).find((index) => index !== undefined);
		if (existingIndex !== undefined) {
			const existingContact = deduplicatedContacts[existingIndex];
			if (!existingContact.name && contact.name) existingContact.name = contact.name;
			continue;
		}

		const newIndex = deduplicatedContacts.push(contact) - 1;
		contact.identityKeys.forEach((key) => contactIndexByIdentity.set(key, newIndex));
	}
	const duplicatePayloadCount = normalizedContacts.length - deduplicatedContacts.length;

	if (deduplicatedContacts.length === 0) {
		return {
			insertedCount: 0,
			updatedCount: 0,
			unchangedCount: 0,
			ignoredRemoveCount,
			skippedCount: invalidCount + duplicatePayloadCount,
		};
	}

	return db.transaction(async (tx) => {
		// Serializes contact syncs for the same organization, preventing two webhook deliveries
		// from inserting the same phone concurrently in the absence of a database unique constraint.
		await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`smb-contacts-sync:${organizationId}`}))`);

		const phoneBaseCandidates = Array.from(
			new Set(
				deduplicatedContacts.flatMap((contact) => contact.identityKeys.filter((key) => key.startsWith("base:")).map((key) => key.slice("base:".length))),
			),
		);

		const exactPhoneCandidates = Array.from(
			new Set(
				deduplicatedContacts.flatMap((contact) =>
					contact.identityKeys.filter((key) => key.startsWith("exact:")).map((key) => key.slice("exact:".length)),
				),
			),
		);

		const existingClients =
			phoneBaseCandidates.length > 0 || exactPhoneCandidates.length > 0
				? await tx.query.clients.findMany({
						where: and(
							eq(clients.organizacaoId, organizationId),
							or(
								phoneBaseCandidates.length > 0 ? inArray(clients.telefoneBase, phoneBaseCandidates) : undefined,
								exactPhoneCandidates.length > 0
									? inArray(sql<string>`regexp_replace(${clients.telefone}, '[^0-9]', '', 'g')`, exactPhoneCandidates)
									: undefined,
							),
						),
						columns: {
							id: true,
							nome: true,
							telefone: true,
							telefoneBase: true,
							canalAquisicao: true,
						},
					})
				: [];

		const existingByIdentity = new Map<string, (typeof existingClients)[number]>();
		for (const client of existingClients) {
			for (const key of getClientIdentityKeys(client)) {
				if (!existingByIdentity.has(key)) existingByIdentity.set(key, client);
			}
		}

		let insertedCount = 0;
		let updatedCount = 0;
		let unchangedCount = 0;

		for (const contact of deduplicatedContacts) {
			const matchedClients = new Map(
				contact.identityKeys
					.map((key) => existingByIdentity.get(key))
					.filter((client): client is (typeof existingClients)[number] => client !== undefined)
					.map((client) => [client.id, client]),
			);

			if (matchedClients.size > 1) {
				console.warn("[SMB_CONTACTS_SYNC] Multiple existing clients match the same WhatsApp contact:", {
					organizationId,
					phone: contact.phone,
					clientIds: Array.from(matchedClients.keys()),
				});
			}

			const existingClient = matchedClients.values().next().value as (typeof existingClients)[number] | undefined;
			if (!existingClient) {
				const [insertedClient] = await tx
					.insert(clients)
					.values({
						organizacaoId: organizationId,
						nome: contact.name ?? contact.phone,
						telefone: contact.phone,
						telefoneBase: contact.phoneBase,
						canalAquisicao: "WHATSAPP",
						dataSincronizacaoExterna: new Date(),
					})
					.returning({
						id: clients.id,
						nome: clients.nome,
						telefone: clients.telefone,
						telefoneBase: clients.telefoneBase,
						canalAquisicao: clients.canalAquisicao,
					});

				if (insertedClient) {
					insertedCount++;
					for (const key of getClientIdentityKeys(insertedClient)) existingByIdentity.set(key, insertedClient);
				}
				continue;
			}

			const existingIdentityKeys = getClientIdentityKeys(existingClient);
			const hasExactPhoneMatch = contact.identityKeys.filter((key) => key.startsWith("exact:")).some((key) => existingIdentityKeys.includes(key));
			const shouldUpdateName = !!contact.name && isPhonePlaceholderName(existingClient.nome, existingClient.telefone || contact.phone);
			const shouldUpdatePhone = !existingClient.telefone.trim();
			const shouldUpdatePhoneBase = !existingClient.telefoneBase.trim() || (hasExactPhoneMatch && existingClient.telefoneBase !== contact.phoneBase);
			if (!shouldUpdateName && !shouldUpdatePhone && !shouldUpdatePhoneBase) {
				unchangedCount++;
				continue;
			}

			await tx
				.update(clients)
				.set({
					...(shouldUpdateName ? { nome: contact.name! } : {}),
					...(shouldUpdatePhone ? { telefone: contact.phone } : {}),
					...(shouldUpdatePhoneBase ? { telefoneBase: contact.phoneBase } : {}),
					dataSincronizacaoExterna: new Date(),
				})
				.where(and(eq(clients.id, existingClient.id), eq(clients.organizacaoId, organizationId)));
			updatedCount++;
		}

		return {
			insertedCount,
			updatedCount,
			unchangedCount,
			ignoredRemoveCount,
			skippedCount: invalidCount + duplicatePayloadCount,
		};
	});
}
