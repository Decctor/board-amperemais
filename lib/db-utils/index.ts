import type { TMessageTemplateMetadata } from "@/schemas/message-templates";
import type { DBTransaction } from "@/services/drizzle";
import { messageTemplates } from "@/services/drizzle/schema/message-templates";
import { whatsappConnectionPhones, whatsappConnections } from "@/services/drizzle/schema/whatsapp-connections";
import { and, eq, or, sql, type SQL } from "drizzle-orm";

// Violacao de unique constraint/index do Postgres (codigo 23505), propagada pelo driver postgres.js.
export function isUniqueViolationError(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
}

export async function removeMessageTemplatePhoneMetadata({
	trx,
	organizationId,
	phoneIds,
}: {
	trx: DBTransaction;
	organizationId: string;
	phoneIds: string[];
}) {
	if (phoneIds.length === 0) return { templatesUpdated: 0 };

	const storedPhones = sql`COALESCE(${messageTemplates.metadados}->'porNumeroTelefone', '{}'::jsonb)`;
	const containsRemovedPhone = or(...phoneIds.map((phoneId) => sql`jsonb_exists(${storedPhones}, ${phoneId})`));
	const updatedTemplates = await trx
		.update(messageTemplates)
		.set({
			metadados: removeMessageTemplatePhoneMetadataSql(phoneIds),
			dataAtualizacao: new Date(),
		})
		.where(and(eq(messageTemplates.organizacaoId, organizationId), containsRemovedPhone))
		.returning({ id: messageTemplates.id });

	return { templatesUpdated: updatedTemplates.length };
}

type TMessageTemplatePhoneMetadataEntries = TMessageTemplateMetadata["porNumeroTelefone"];

/**
 * Como as entradas novas se combinam com as que já estão gravadas em `metadados.porNumeroTelefone`:
 *
 * - `replace`: as entradas novas vencem. Só é seguro quando o chamador garante, na cláusula WHERE,
 *   que o telefone ainda existe.
 * - `keep`: as entradas gravadas vencem. Usado na reconexão, que não pode sobrescrever um status
 *   já conhecido.
 * - `existing-only`: apenas as chaves que continuam gravadas são mescladas, de forma que um telefone
 *   removido em paralelo nunca é ressuscitado.
 */
type TMessageTemplatePhoneMetadataMergeMode = "replace" | "keep" | "existing-only";

/**
 * Monta a expressão que mescla entradas em `metadados.porNumeroTelefone` **a partir do valor atual da
 * linha**, e não de um snapshot lido antes.
 *
 * Todo escritor que regrava o objeto `metadados` inteiro a partir de uma leitura anterior reintroduz
 * as entradas de telefones desconectados nesse intervalo — a desconexão limpa, o escritor concorrente
 * desfaz a limpeza. Resolvendo a mescla dentro do próprio UPDATE, cada escritor toca apenas as chaves
 * que lhe dizem respeito e as demais permanecem como estão no banco.
 */
export function mergeMessageTemplatePhoneMetadataSql({
	entries,
	mode,
}: {
	entries: TMessageTemplatePhoneMetadataEntries;
	mode: TMessageTemplatePhoneMetadataMergeMode;
}): SQL {
	const storedPhones = sql`COALESCE(${messageTemplates.metadados}->'porNumeroTelefone', '{}'::jsonb)`;
	const incomingPhones = sql`${JSON.stringify(entries)}::jsonb`;

	let mergedPhones: SQL;
	if (mode === "replace") mergedPhones = sql`${storedPhones} || ${incomingPhones}`;
	else if (mode === "keep") mergedPhones = sql`${incomingPhones} || ${storedPhones}`;
	else {
		mergedPhones = sql`${storedPhones} || (
			SELECT COALESCE(jsonb_object_agg(entry.k, entry.v), '{}'::jsonb)
			FROM jsonb_each(${incomingPhones}) AS entry(k, v)
			WHERE jsonb_exists(${storedPhones}, entry.k)
		)`;
	}

	return sql`COALESCE(${messageTemplates.metadados}, '{}'::jsonb) || jsonb_build_object('porNumeroTelefone', ${mergedPhones})`;
}

// Remove uma ou mais chaves a partir do valor atual da linha, sem regravar as demais entradas.
export function removeMessageTemplatePhoneMetadataSql(phoneIds: string | readonly string[]): SQL {
	const ids = typeof phoneIds === "string" ? [phoneIds] : phoneIds;
	let remainingPhones: SQL = sql`COALESCE(${messageTemplates.metadados}->'porNumeroTelefone', '{}'::jsonb)`;
	for (const phoneId of ids) remainingPhones = sql`${remainingPhones} - ${phoneId}::text`;

	return sql`COALESCE(${messageTemplates.metadados}, '{}'::jsonb) || jsonb_build_object(
		'porNumeroTelefone',
		${remainingPhones}
	)`;
}

/**
 * Bloqueia a exclusão do telefone até o fim da transação e valida que ele pertence à organização.
 *
 * Writers que podem criar ou substituir uma chave em `porNumeroTelefone` devem chamar esta função
 * na mesma transação do UPDATE. A desconexão exclui o telefone antes de limpar os templates.
 */
export async function lockConnectedWhatsappPhone({ trx, organizationId, phoneId }: { trx: DBTransaction; organizationId: string; phoneId: string }) {
	const phones = await trx
		.select({ id: whatsappConnectionPhones.id })
		.from(whatsappConnectionPhones)
		.innerJoin(whatsappConnections, eq(whatsappConnections.id, whatsappConnectionPhones.conexaoId))
		.where(and(eq(whatsappConnectionPhones.id, phoneId), eq(whatsappConnections.organizacaoId, organizationId)))
		.limit(1)
		.for("key share", { of: whatsappConnectionPhones });

	return phones.length > 0;
}

// Restringe o UPDATE aos templates que ainda não possuem metadados para o telefone, evitando tocar
// `dataAtualizacao` de templates que não mudariam.
export function missingMessageTemplatePhoneMetadataCondition(phoneId: string): SQL {
	return sql`NOT jsonb_exists(COALESCE(${messageTemplates.metadados}->'porNumeroTelefone', '{}'::jsonb), ${phoneId})`;
}

type THandleSimpleChildRowsProcessing<T extends { id?: string | null; deletar?: boolean | null }> = {
	trx: DBTransaction;
	table: any;
	entities: T[];
	fatherEntityKey: string;
	fatherEntityId: string;
	organizacaoId: string;
};
export async function handleSimpleChildRowsProcessing<T extends { id?: string | null; deletar?: boolean | null }>({
	trx,
	table,
	entities,
	fatherEntityKey,
	fatherEntityId,
	organizacaoId,
}: THandleSimpleChildRowsProcessing<T>) {
	const toDelete = entities.filter((e) => !!e.id && e.deletar);
	const toUpdate = entities.filter((e) => !!e.id && !e.deletar);
	const toInsert = entities.filter((e) => !e.id);
	// Excluir
	if (toDelete.length > 0) {
		await trx.delete(table).where(sql`${table.id} IN ${toDelete.map((e) => e.id)} AND ${table.organizacaoId} = ${organizacaoId}`);
	}

	// Atualizar
	for (const entity of toUpdate) {
		const update = { ...entity };
		delete update.id;
		delete update.deletar;
		await trx
			.update(table)
			.set(update)
			.where(sql`${table.id} = ${entity.id} AND ${table.organizacaoId} = ${organizacaoId}`);
	}

	// Criar
	if (toInsert.length > 0) {
		await trx.insert(table).values(
			toInsert.map((entity) => {
				return {
					...entity,
					[fatherEntityKey]: fatherEntityId,
					organizacaoId: organizacaoId,
					id: undefined,
					deletar: undefined,
				};
			}),
		);
	}
}

type THandleAdminSimpleChildRowsProcessing<T extends { id?: string | null; deletar?: boolean | null }> = {
	trx: DBTransaction;
	table: any;
	entities: T[];
	fatherEntityKey: string;
	fatherEntityId: string;
};
export async function handleAdminSimpleChildRowsProcessing<T extends { id?: string | null; deletar?: boolean | null }>({
	trx,
	table,
	entities,
	fatherEntityKey,
	fatherEntityId,
}: THandleAdminSimpleChildRowsProcessing<T>) {
	const toDelete = entities.filter((e) => !!e.id && e.deletar);
	const toUpdate = entities.filter((e) => !!e.id && !e.deletar);
	const toInsert = entities.filter((e) => !e.id);
	// Excluir
	if (toDelete.length > 0) {
		await trx.delete(table).where(sql`${table.id} IN ${toDelete.map((e) => e.id)}`);
	}

	// Atualizar
	for (const entity of toUpdate) {
		const update = { ...entity };
		delete update.id;
		delete update.deletar;
		await trx
			.update(table)
			.set(update)
			.where(sql`${table.id} = ${entity.id}`);
	}

	// Criar
	if (toInsert.length > 0) {
		await trx.insert(table).values(
			toInsert.map((entity) => {
				return {
					...entity,
					[fatherEntityKey]: fatherEntityId,
					id: undefined,
					deletar: undefined,
				};
			}),
		);
	}
}
