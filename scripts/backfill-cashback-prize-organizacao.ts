import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { cashbackProgramPrizes, cashbackPrograms } from "@/services/drizzle/schema";
import { and, asc, eq, isNull, type SQL } from "drizzle-orm";

/**
 * Backfill de `cashback_program_prizes.organizacao_id`.
 *
 * A coluna é nullable e houve um caminho de escrita (POST /api/cashback-programs, criação de
 * programa com prêmios aninhados) que não a preenchia. Prêmios órfãos ficam invisíveis para as
 * leituras org-scoped — incluindo a validação de resgate — e inalcançáveis pelo editor de
 * programa, que restringe UPDATE/DELETE por organização.
 *
 * A organização é derivada do programa dono do prêmio (`programa_id` é NOT NULL), que é a única
 * fonte confiável. Prêmios cujo programa não existe mais são listados e ignorados.
 */

type BackfillArgs = {
	apply: boolean;
	orgId: string | null;
};

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const inlineArg = process.argv.find((arg) => arg.startsWith(prefix));
	if (inlineArg) return inlineArg.slice(prefix.length);

	const index = process.argv.indexOf(`--${name}`);
	if (index >= 0) return process.argv[index + 1] ?? null;

	return null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function parseArgs(): BackfillArgs {
	return {
		apply: hasFlag("apply"),
		orgId: getArgValue("orgId"),
	};
}

function printUsage() {
	console.log(`Uso:
  npm run backfill:cashback-prize-organizacao
  npm run backfill:cashback-prize-organizacao -- --apply
  npm run backfill:cashback-prize-organizacao -- --apply --orgId=<id>

Opcoes:
  --apply   Persiste o backfill. Sem esta flag, roda em modo dry-run.
  --orgId   Restringe o backfill aos premios cujo programa pertence a esta organizacao.`);
}

const LOG = "[CASHBACK_PRIZE_ORGANIZACAO_BACKFILL]";

async function main() {
	if (hasFlag("help") || process.argv.includes("-h")) {
		printUsage();
		return;
	}

	const args = parseArgs();

	// LEFT JOIN: prêmios órfãos cujo programa sumiu aparecem com `organizacaoDoPrograma` nulo e
	// não são corrigíveis automaticamente — precisam de decisão manual.
	const conditions: SQL[] = [isNull(cashbackProgramPrizes.organizacaoId)];
	if (args.orgId) conditions.push(eq(cashbackPrograms.organizacaoId, args.orgId));

	const pendingPrizes = await db
		.select({
			id: cashbackProgramPrizes.id,
			titulo: cashbackProgramPrizes.titulo,
			ativo: cashbackProgramPrizes.ativo,
			programaId: cashbackProgramPrizes.programaId,
			organizacaoDoPrograma: cashbackPrograms.organizacaoId,
		})
		.from(cashbackProgramPrizes)
		.leftJoin(cashbackPrograms, eq(cashbackProgramPrizes.programaId, cashbackPrograms.id))
		.where(and(...conditions))
		.orderBy(asc(cashbackProgramPrizes.programaId), asc(cashbackProgramPrizes.dataInsercao));

	console.log(`${LOG} Modo: ${args.apply ? "APPLY" : "DRY-RUN"}`);
	console.log(`${LOG} Premios sem organizacao: ${pendingPrizes.length}`);

	if (pendingPrizes.length === 0) {
		console.log(`${LOG} Nada a fazer.`);
		return;
	}

	const resolvable = pendingPrizes.filter((prize): prize is typeof prize & { organizacaoDoPrograma: string } => !!prize.organizacaoDoPrograma);
	const unresolvable = pendingPrizes.filter((prize) => !prize.organizacaoDoPrograma);

	console.table(
		pendingPrizes.slice(0, 20).map((prize) => ({
			id: prize.id,
			titulo: prize.titulo,
			ativo: prize.ativo,
			programaId: prize.programaId,
			orgResolvida: prize.organizacaoDoPrograma ?? "— (programa inexistente)",
		})),
	);
	if (pendingPrizes.length > 20) console.log(`${LOG} ... e mais ${pendingPrizes.length - 20} premio(s).`);

	if (unresolvable.length > 0) {
		console.warn(`${LOG} ATENCAO: ${unresolvable.length} premio(s) com programa inexistente — serao ignorados:`);
		console.warn(unresolvable.map((prize) => prize.id).join(", "));
	}

	if (resolvable.length === 0) {
		console.log(`${LOG} Nenhum premio resolvivel.`);
		return;
	}

	if (!args.apply) {
		console.log(`${LOG} Dry-run concluido: ${resolvable.length} premio(s) seriam atualizado(s). Execute com --apply para persistir.`);
		return;
	}

	// Um UPDATE por prêmio: o volume esperado é baixo (linhas legadas) e o log por linha vale mais
	// que a economia de round-trips.
	let updatedCount = 0;
	for (const prize of resolvable) {
		const updated = await db
			.update(cashbackProgramPrizes)
			.set({ organizacaoId: prize.organizacaoDoPrograma })
			.where(and(eq(cashbackProgramPrizes.id, prize.id), isNull(cashbackProgramPrizes.organizacaoId)))
			.returning({ id: cashbackProgramPrizes.id });
		if (updated.length > 0) {
			updatedCount += 1;
			console.log(`${LOG} ${prize.id} ("${prize.titulo}") -> org ${prize.organizacaoDoPrograma}`);
		}
	}

	console.log(`${LOG} ${updatedCount} premio(s) atualizado(s).`);
	if (unresolvable.length > 0) {
		console.log(`${LOG} ${unresolvable.length} premio(s) permanecem sem organizacao (programa inexistente).`);
	}
}

main()
	.catch((error) => {
		console.error(`${LOG} Falha no backfill:`, error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
