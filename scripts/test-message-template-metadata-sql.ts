/**
 * Valida as expressões jsonb de `lib/db-utils` avaliando o SQL realmente gerado contra linhas
 * literais de um VALUES. Nenhuma tabela é lida ou escrita.
 */
import "dotenv/config";
import {
	lockConnectedWhatsappPhone,
	mergeMessageTemplatePhoneMetadataSql,
	missingMessageTemplatePhoneMetadataCondition,
	removeMessageTemplatePhoneMetadataSql,
} from "@/lib/db-utils";
import { connection, db } from "@/services/drizzle";
import { whatsappConnectionPhones, whatsappConnections } from "@/services/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const dialect = new PgDialect();
const COLUMN_REF = '"ampmais_message_templates"."metadados"';

async function evaluate(statement: SQL, metadados: string) {
	const query = dialect.sqlToQuery(statement);
	// Substitui a referência da coluna pela linha literal, mantendo o restante do SQL gerado intacto.
	const expression = query.sql.replaceAll(COLUMN_REF, "linha.metadados");
	const sqlText = `SELECT (${expression}) AS resultado FROM (VALUES ($${query.params.length + 1}::jsonb)) AS linha(metadados)`;
	const rows = await connection.unsafe(sqlText, [...(query.params as string[]), metadados]);
	return rows[0].resultado;
}

// O jsonb normaliza a ordem das chaves, então a comparação precisa ser estável quanto a isso.
function stable(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stable);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, stable(entry)]),
		);
	}
	return value;
}

function check(name: string, actual: unknown, expected: unknown) {
	const ok = JSON.stringify(stable(actual)) === JSON.stringify(stable(expected));
	console.log(`${ok ? "OK  " : "FALHA"} ${name}`);
	if (!ok) console.log(`      esperado: ${JSON.stringify(expected)}\n      obtido:   ${JSON.stringify(actual)}`);
	return ok;
}

function getPostgresErrorCode(error: unknown): string | null {
	if (typeof error !== "object" || error === null) return null;
	if ("code" in error && typeof error.code === "string") return error.code;
	return "cause" in error ? getPostgresErrorCode(error.cause) : null;
}

async function main() {
	const results: boolean[] = [];
	const armazenado = '{"porNumeroTelefone":{"a":{"idExterno":"1","status":"PENDENTE","qualidade":"ALTA"}},"outraChave":42}';
	const novaEntradaA = { a: { idExterno: "2", status: "APROVADO" as const, qualidade: "ALTA" as const } };
	const entradaFantasma = {
		a: { idExterno: "2", status: "APROVADO" as const, qualidade: "ALTA" as const },
		fantasma: { idExterno: "9", status: "APROVADO" as const, qualidade: "ALTA" as const },
	};

	results.push(
		check(
			"replace sobrescreve a chave e preserva o resto",
			await evaluate(mergeMessageTemplatePhoneMetadataSql({ entries: novaEntradaA, mode: "replace" }), armazenado),
			{
				porNumeroTelefone: { a: { idExterno: "2", status: "APROVADO", qualidade: "ALTA" } },
				outraChave: 42,
			},
		),
	);
	results.push(
		check("keep preserva a chave gravada", await evaluate(mergeMessageTemplatePhoneMetadataSql({ entries: novaEntradaA, mode: "keep" }), armazenado), {
			porNumeroTelefone: { a: { idExterno: "1", status: "PENDENTE", qualidade: "ALTA" } },
			outraChave: 42,
		}),
	);
	results.push(
		check(
			"existing-only atualiza a existente e NÃO ressuscita a removida",
			await evaluate(mergeMessageTemplatePhoneMetadataSql({ entries: entradaFantasma, mode: "existing-only" }), armazenado),
			{ porNumeroTelefone: { a: { idExterno: "2", status: "APROVADO", qualidade: "ALTA" } }, outraChave: 42 },
		),
	);
	results.push(
		check(
			"existing-only não ressuscita quando a chave sumiu",
			await evaluate(mergeMessageTemplatePhoneMetadataSql({ entries: novaEntradaA, mode: "existing-only" }), '{"porNumeroTelefone":{}}'),
			{ porNumeroTelefone: {} },
		),
	);
	results.push(
		check("remove apaga apenas a chave alvo", await evaluate(removeMessageTemplatePhoneMetadataSql("a"), armazenado), {
			porNumeroTelefone: {},
			outraChave: 42,
		}),
	);
	results.push(
		check(
			"remove múltiplas chaves sem alterar as demais",
			await evaluate(
				removeMessageTemplatePhoneMetadataSql(["a", "b"]),
				'{"porNumeroTelefone":{"a":{"idExterno":"1"},"b":{"idExterno":"2"},"c":{"idExterno":"3"}},"outraChave":42}',
			),
			{ porNumeroTelefone: { c: { idExterno: "3" } }, outraChave: 42 },
		),
	);
	results.push(
		check(
			"metadados legado sem porNumeroTelefone não quebra",
			await evaluate(mergeMessageTemplatePhoneMetadataSql({ entries: novaEntradaA, mode: "replace" }), "{}"),
			{
				porNumeroTelefone: { a: { idExterno: "2", status: "APROVADO", qualidade: "ALTA" } },
			},
		),
	);
	results.push(
		check(
			"condição de metadados ausentes: falso quando a chave existe",
			await evaluate(missingMessageTemplatePhoneMetadataCondition("a"), armazenado),
			false,
		),
	);
	results.push(
		check(
			"condição de metadados ausentes: verdadeiro quando a chave não existe",
			await evaluate(missingMessageTemplatePhoneMetadataCondition("z"), armazenado),
			true,
		),
	);

	const [connectedPhone] = await db
		.select({
			phoneId: whatsappConnectionPhones.id,
			organizationId: whatsappConnections.organizacaoId,
		})
		.from(whatsappConnectionPhones)
		.innerJoin(whatsappConnections, eq(whatsappConnections.id, whatsappConnectionPhones.conexaoId))
		.limit(1);
	if (!connectedPhone) throw new Error("Nenhum telefone conectado disponível para validar o lock.");

	results.push(
		check(
			"lock reconhece telefone conectado da organização",
			await db.transaction((trx) =>
				lockConnectedWhatsappPhone({
					trx,
					organizationId: connectedPhone.organizationId,
					phoneId: connectedPhone.phoneId,
				}),
			),
			true,
		),
	);
	results.push(
		check(
			"lock rejeita telefone de outra organização",
			await db.transaction((trx) =>
				lockConnectedWhatsappPhone({
					trx,
					organizationId: "organizacao-inexistente",
					phoneId: connectedPhone.phoneId,
				}),
			),
			false,
		),
	);

	let signalLockAcquired!: () => void;
	let releasePhoneLock!: () => void;
	const lockAcquired = new Promise<void>((resolve) => {
		signalLockAcquired = resolve;
	});
	const lockRelease = new Promise<void>((resolve) => {
		releasePhoneLock = resolve;
	});
	const lockHolder = db.transaction(async (trx) => {
		const connected = await lockConnectedWhatsappPhone({
			trx,
			organizationId: connectedPhone.organizationId,
			phoneId: connectedPhone.phoneId,
		});
		if (!connected) throw new Error("Telefone deixou de estar conectado durante o teste.");
		signalLockAcquired();
		await lockRelease;
	});

	await lockAcquired;
	let deleteLockWasBlocked = false;
	try {
		await db.transaction(async (trx) => {
			await trx.execute(sql`SET LOCAL lock_timeout = '250ms'`);
			await trx
				.select({ id: whatsappConnectionPhones.id })
				.from(whatsappConnectionPhones)
				.where(eq(whatsappConnectionPhones.id, connectedPhone.phoneId))
				.for("update");
		});
	} catch (error) {
		if (getPostgresErrorCode(error) === "55P03") deleteLockWasBlocked = true;
		else throw error;
	} finally {
		releasePhoneLock();
		await lockHolder;
	}
	results.push(check("FOR KEY SHARE bloqueia exclusão concorrente do telefone", deleteLockWasBlocked, true));

	console.log(`\n${results.filter(Boolean).length}/${results.length} verificações passaram.`);
	await connection.end();
	if (results.some((result) => !result)) process.exit(1);
}

main();
