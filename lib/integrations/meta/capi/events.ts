import { hashEmail, hashNormalized, hashPhone } from "./hashing";

/**
 * action_source suportados pela Meta. Para o RecompraCRM (varejo first-party):
 * - vendas de PDV/ERP (offline) -> "physical_store"
 * - vendas da loja digital -> "website"
 */
export type TCapiActionSource = "physical_store" | "website" | "system_generated" | "other";

export type TCapiEvent = {
	event_name: string;
	event_time: number;
	event_id: string;
	action_source: TCapiActionSource;
	event_source_url?: string;
	user_data: Record<string, unknown>;
	custom_data?: Record<string, unknown>;
};

export type TCapiPurchasePii = {
	email?: string | null;
	phone?: string | null;
	nome?: string | null;
	cidade?: string | null;
	estado?: string | null;
	dataNascimento?: Date | string | null;
};

/** Só letras minúsculas (para fn/ln/ct, conforme normalização recomendada pela Meta). */
function onlyLetters(value: string | null | undefined) {
	return (
		value
			?.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/[^a-z]/g, "") ?? ""
	);
}

function splitName(nome: string | null | undefined): { first: string; last: string } {
	const parts = (nome ?? "").trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return { first: "", last: "" };
	if (parts.length === 1) return { first: parts[0], last: "" };
	return { first: parts[0], last: parts[parts.length - 1] };
}

function formatBirthdate(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}${month}${day}`;
}

/** Monta o `user_data` hasheado (advanced matching) a partir da PII do cliente. */
export async function buildHashedUserData(pii: TCapiPurchasePii): Promise<Record<string, unknown>> {
	const { first, last } = splitName(pii.nome);
	const [em, ph, fn, ln, ct, st, db, country] = await Promise.all([
		hashEmail(pii.email),
		hashPhone(pii.phone),
		hashNormalized(onlyLetters(first) || null),
		hashNormalized(onlyLetters(last) || null),
		hashNormalized(onlyLetters(pii.cidade) || null),
		hashNormalized(
			pii.estado
				? pii.estado
						.trim()
						.toLowerCase()
						.replace(/[^a-z]/g, "")
						.slice(0, 2)
				: null,
		),
		hashNormalized(formatBirthdate(pii.dataNascimento)),
		hashNormalized("br"),
	]);

	const userData: Record<string, unknown> = {};
	if (em) userData.em = [em];
	if (ph) userData.ph = [ph];
	if (fn) userData.fn = [fn];
	if (ln) userData.ln = [ln];
	if (ct) userData.ct = [ct];
	if (st) userData.st = [st];
	if (db) userData.db = [db];
	if (country) userData.country = [country];
	return userData;
}

/**
 * Monta um evento `Purchase` (offline/CRM) para uma venda. `event_id` = id da venda garante
 * idempotência e deduplicação com o Pixel do navegador (caso a loja digital também dispare).
 * Moeda fixa BRL (produto atende público brasileiro).
 */
export async function buildSalePurchaseEvent({
	saleId,
	value,
	eventTime,
	actionSource,
	pii,
	eventSourceUrl,
}: {
	saleId: string;
	value: number;
	eventTime: Date;
	actionSource: TCapiActionSource;
	pii: TCapiPurchasePii;
	eventSourceUrl?: string;
}): Promise<TCapiEvent> {
	const userData = await buildHashedUserData(pii);
	return {
		event_name: "Purchase",
		event_time: Math.floor(eventTime.getTime() / 1000),
		event_id: saleId,
		action_source: actionSource,
		...(actionSource === "website" && eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
		user_data: userData,
		custom_data: { value, currency: "BRL", order_id: saleId },
	};
}
