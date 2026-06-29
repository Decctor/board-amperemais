import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramPrizes, cashbackPrograms, cashbackProgramTransactions } from "@/services/drizzle/schema/cashback-programs";
import { and, eq, sql } from "drizzle-orm";

const TARGET_ORGANIZATION_ID = "f58738c0-68f5-4fbd-9ee4-ba80d94f3008";
const MULTIPLIER = 20;
const EXPECTED_CURRENT_ACCUMULATION_VALUE = 5;
const TARGET_ACCUMULATION_VALUE = 100;
const EPSILON = 1e-6;

function getArgValue(name: string) {
	const prefix = `${name}=`;
	const arg = process.argv.find((item) => item.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

function toNumber(value: unknown) {
	if (value === null || value === undefined) return 0;
	return Number(value);
}

function formatNumber(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 6,
	}).format(value);
}

function printValuePlan(label: string, value: number) {
	console.log(`  ${label}: ${formatNumber(value)} -> ${formatNumber(value * MULTIPLIER)}`);
}

async function findTargetProgram(programId: string | null) {
	const programs = await db.query.cashbackPrograms.findMany({
		where: (fields, { and, eq }) =>
			programId
				? and(eq(fields.organizacaoId, TARGET_ORGANIZATION_ID), eq(fields.id, programId))
				: and(eq(fields.organizacaoId, TARGET_ORGANIZATION_ID), eq(fields.ativo, true)),
	});

	if (programs.length === 0) {
		throw new Error(programId ? `Programa ${programId} não encontrado para a organização alvo.` : "Nenhum programa ativo encontrado para a organização alvo.");
	}

	if (programs.length > 1) {
		throw new Error(`Foram encontrados ${programs.length} programas ativos. Rode novamente com --program-id=<id-do-programa>.`);
	}

	return programs[0]!;
}

async function getPrizesSummary(programId: string) {
	const [summary] = await db
		.select({
			count: sql<number>`count(*)::int`,
			valor: sql<number>`coalesce(sum(${cashbackProgramPrizes.valor}), 0)`,
		})
		.from(cashbackProgramPrizes)
		.where(eq(cashbackProgramPrizes.programaId, programId));

	return {
		count: toNumber(summary?.count),
		valor: toNumber(summary?.valor),
	};
}

async function getTransactionsSummary(programId: string) {
	const [summary] = await db
		.select({
			count: sql<number>`count(*)::int`,
			valor: sql<number>`coalesce(sum(${cashbackProgramTransactions.valor}), 0)`,
			valorRestante: sql<number>`coalesce(sum(${cashbackProgramTransactions.valorRestante}), 0)`,
			saldoValorAnterior: sql<number>`coalesce(sum(${cashbackProgramTransactions.saldoValorAnterior}), 0)`,
			saldoValorPosterior: sql<number>`coalesce(sum(${cashbackProgramTransactions.saldoValorPosterior}), 0)`,
			resgateRecompensaValor: sql<number>`coalesce(sum(${cashbackProgramTransactions.resgateRecompensaValor}), 0)`,
			resgateRecompensaValorCount: sql<number>`count(${cashbackProgramTransactions.resgateRecompensaValor})::int`,
			vendaValor: sql<number>`coalesce(sum(${cashbackProgramTransactions.vendaValor}), 0)`,
		})
		.from(cashbackProgramTransactions)
		.where(and(eq(cashbackProgramTransactions.organizacaoId, TARGET_ORGANIZATION_ID), eq(cashbackProgramTransactions.programaId, programId)));

	return {
		count: toNumber(summary?.count),
		valor: toNumber(summary?.valor),
		valorRestante: toNumber(summary?.valorRestante),
		saldoValorAnterior: toNumber(summary?.saldoValorAnterior),
		saldoValorPosterior: toNumber(summary?.saldoValorPosterior),
		resgateRecompensaValor: toNumber(summary?.resgateRecompensaValor),
		resgateRecompensaValorCount: toNumber(summary?.resgateRecompensaValorCount),
		vendaValor: toNumber(summary?.vendaValor),
	};
}

async function getBalancesSummary(programId: string) {
	const [summary] = await db
		.select({
			count: sql<number>`count(*)::int`,
			saldoValorDisponivel: sql<number>`coalesce(sum(${cashbackProgramBalances.saldoValorDisponivel}), 0)`,
			saldoValorAcumuladoTotal: sql<number>`coalesce(sum(${cashbackProgramBalances.saldoValorAcumuladoTotal}), 0)`,
			saldoValorResgatadoTotal: sql<number>`coalesce(sum(${cashbackProgramBalances.saldoValorResgatadoTotal}), 0)`,
		})
		.from(cashbackProgramBalances)
		.where(and(eq(cashbackProgramBalances.organizacaoId, TARGET_ORGANIZATION_ID), eq(cashbackProgramBalances.programaId, programId)));

	return {
		count: toNumber(summary?.count),
		saldoValorDisponivel: toNumber(summary?.saldoValorDisponivel),
		saldoValorAcumuladoTotal: toNumber(summary?.saldoValorAcumuladoTotal),
		saldoValorResgatadoTotal: toNumber(summary?.saldoValorResgatadoTotal),
	};
}

async function printSummary(programId: string, title: string) {
	const [prizes, transactions, balances] = await Promise.all([getPrizesSummary(programId), getTransactionsSummary(programId), getBalancesSummary(programId)]);

	console.log(`\n${title}`);
	console.log(`Recompensas: ${prizes.count}`);
	printValuePlan("cashback_program_prizes.valor", prizes.valor);

	console.log(`\nTransações: ${transactions.count}`);
	printValuePlan("cashback_program_transactions.valor", transactions.valor);
	printValuePlan("cashback_program_transactions.valor_restante", transactions.valorRestante);
	printValuePlan("cashback_program_transactions.saldo_valor_anterior", transactions.saldoValorAnterior);
	printValuePlan("cashback_program_transactions.saldo_valor_posterior", transactions.saldoValorPosterior);
	printValuePlan("cashback_program_transactions.resgate_recompensa_valor", transactions.resgateRecompensaValor);
	console.log(`  resgate_recompensa_valor preenchido em ${transactions.resgateRecompensaValorCount} transação(ões).`);
	console.log(`  venda_valor (não será alterado): ${formatNumber(transactions.vendaValor)}`);

	console.log(`\nSaldos: ${balances.count}`);
	printValuePlan("cashback_program_balances.saldo_valor_disponivel", balances.saldoValorDisponivel);
	printValuePlan("cashback_program_balances.saldo_valor_acumulado_total", balances.saldoValorAcumuladoTotal);
	printValuePlan("cashback_program_balances.saldo_valor_resgatado_total", balances.saldoValorResgatadoTotal);

	return { prizes, transactions, balances };
}

async function applyScale(programId: string) {
	const now = new Date();

	return db.transaction(async (tx) => {
		const updatedPrograms = await tx
			.update(cashbackPrograms)
			.set({
				acumuloValor: TARGET_ACCUMULATION_VALUE,
				dataAtualizacao: now,
			})
			.where(
				and(
					eq(cashbackPrograms.id, programId),
					eq(cashbackPrograms.organizacaoId, TARGET_ORGANIZATION_ID),
					eq(cashbackPrograms.acumuloTipo, "PERCENTUAL"),
					eq(cashbackPrograms.acumuloValor, EXPECTED_CURRENT_ACCUMULATION_VALUE),
				),
			)
			.returning({ id: cashbackPrograms.id });

		if (updatedPrograms.length !== 1) {
			throw new Error("O programa não estava mais em PERCENTUAL com acumulo_valor = 5. Migração abortada para evitar reaplicação.");
		}

		const updatedPrizes = await tx
			.update(cashbackProgramPrizes)
			.set({
				valor: sql`${cashbackProgramPrizes.valor} * ${MULTIPLIER}`,
				dataAtualizacao: now,
			})
			.where(eq(cashbackProgramPrizes.programaId, programId))
			.returning({ id: cashbackProgramPrizes.id });

		const updatedTransactions = await tx
			.update(cashbackProgramTransactions)
			.set({
				valor: sql`${cashbackProgramTransactions.valor} * ${MULTIPLIER}`,
				valorRestante: sql`${cashbackProgramTransactions.valorRestante} * ${MULTIPLIER}`,
				saldoValorAnterior: sql`${cashbackProgramTransactions.saldoValorAnterior} * ${MULTIPLIER}`,
				saldoValorPosterior: sql`${cashbackProgramTransactions.saldoValorPosterior} * ${MULTIPLIER}`,
				resgateRecompensaValor: sql`case when ${cashbackProgramTransactions.resgateRecompensaValor} is null then null else ${cashbackProgramTransactions.resgateRecompensaValor} * ${MULTIPLIER} end`,
				dataAtualizacao: now,
			})
			.where(and(eq(cashbackProgramTransactions.organizacaoId, TARGET_ORGANIZATION_ID), eq(cashbackProgramTransactions.programaId, programId)))
			.returning({ id: cashbackProgramTransactions.id });

		const updatedBalances = await tx
			.update(cashbackProgramBalances)
			.set({
				saldoValorDisponivel: sql`${cashbackProgramBalances.saldoValorDisponivel} * ${MULTIPLIER}`,
				saldoValorAcumuladoTotal: sql`${cashbackProgramBalances.saldoValorAcumuladoTotal} * ${MULTIPLIER}`,
				saldoValorResgatadoTotal: sql`${cashbackProgramBalances.saldoValorResgatadoTotal} * ${MULTIPLIER}`,
				dataAtualizacao: now,
			})
			.where(and(eq(cashbackProgramBalances.organizacaoId, TARGET_ORGANIZATION_ID), eq(cashbackProgramBalances.programaId, programId)))
			.returning({ id: cashbackProgramBalances.id });

		return {
			programs: updatedPrograms.length,
			prizes: updatedPrizes.length,
			transactions: updatedTransactions.length,
			balances: updatedBalances.length,
		};
	});
}

async function main() {
	const apply = process.argv.includes("--apply");
	const programIdArg = getArgValue("--program-id");

	const program = await findTargetProgram(programIdArg);

	console.log("Migração de escala do ledger de cashback");
	console.log(`Organização: ${TARGET_ORGANIZATION_ID}`);
	console.log(`Programa: ${program.id} - ${program.titulo}`);
	console.log(`Modo: ${apply ? "APLICAR" : "DRY RUN"}`);
	console.log(`Multiplicador: ${MULTIPLIER}x`);
	console.log(`Acúmulo: ${program.acumuloTipo} ${program.acumuloValor} -> ${TARGET_ACCUMULATION_VALUE}`);
	console.log(`Modalidade descontos permitida: ${program.modalidadeDescontosPermitida ? "sim" : "não"}`);
	console.log(`Modalidade recompensas permitida: ${program.modalidadeRecompensasPermitida ? "sim" : "não"}`);

	if (program.acumuloTipo !== "PERCENTUAL") {
		throw new Error(`Programa está com acumulo_tipo=${program.acumuloTipo}. Esperado: PERCENTUAL.`);
	}

	if (Math.abs(program.acumuloValor - EXPECTED_CURRENT_ACCUMULATION_VALUE) > EPSILON) {
		throw new Error(`Programa está com acumulo_valor=${program.acumuloValor}. Esperado: ${EXPECTED_CURRENT_ACCUMULATION_VALUE}.`);
	}

	await printSummary(program.id, "Impacto planejado");

	if (!apply) {
		console.log("\nDry-run concluído. Nenhuma alteração foi aplicada.");
		console.log("Para aplicar, rode: tsx ./utils/scripts/scale-cashback-ledger.ts --apply");
		return;
	}

	const result = await applyScale(program.id);
	console.log("\nAlterações aplicadas:");
	console.log(`  Programas atualizados: ${result.programs}`);
	console.log(`  Recompensas atualizadas: ${result.prizes}`);
	console.log(`  Transações atualizadas: ${result.transactions}`);
	console.log(`  Saldos atualizados: ${result.balances}`);

	await printSummary(program.id, "Resumo após aplicação");
}

main()
	.catch((error) => {
		console.error("Falha na migração de escala do cashback:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
