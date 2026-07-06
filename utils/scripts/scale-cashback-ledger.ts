import "./load-next-env";
import { connection, db } from "@/services/drizzle";
import {
	cashbackProgramBalances,
	cashbackProgramPrizes,
	cashbackPrograms,
	cashbackProgramTransactions,
	campaigns,
	interactions,
	organizations,
} from "@/services/drizzle/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";

const EPSILON = 1e-6;
const CASHBACK_INTERACTION_METADATA_KEYS = [
	"compraCashbackAcumulado",
	"compraCashbackNovoSaldo",
	"cashbackAcumuladoValor",
	"cashbackSaldoDisponivel",
	"cashbackTotalAcumuladoVida",
	"cashbackTotalResgatadoVida",
	"cashbackExpirandoValor",
] as const;

type ScriptArgs = {
	orgId: string | null;
	programId: string | null;
	multiplier: number | null;
	expectedAccumulationValue: number | null;
	apply: boolean;
	confirmOrgId: string | null;
};

function getArgValue(name: string) {
	const prefix = `${name}=`;
	const arg = process.argv.find((item) => item.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

function parseNumberArg(name: string) {
	const rawValue = getArgValue(name);
	if (rawValue === null) return null;
	const value = Number(rawValue);
	if (!Number.isFinite(value)) throw new Error(`Argumento ${name} precisa ser numerico.`);
	return value;
}

function parseArgs(): ScriptArgs {
	return {
		orgId: getArgValue("--org-id"),
		programId: getArgValue("--program-id"),
		multiplier: parseNumberArg("--multiplier"),
		expectedAccumulationValue: parseNumberArg("--expected-acumulo-valor"),
		apply: process.argv.includes("--apply"),
		confirmOrgId: getArgValue("--confirm-org-id"),
	};
}

function validateArgs(args: ScriptArgs): asserts args is ScriptArgs & { orgId: string; multiplier: number } {
	if (!args.orgId) throw new Error("Informe --org-id=<id-da-organizacao>.");
	if (args.multiplier === null) throw new Error("Informe --multiplier=<multiplicador>.");
	if (args.multiplier <= 0) throw new Error("O multiplicador precisa ser maior que zero.");
	if (Math.abs(args.multiplier - 1) <= EPSILON) throw new Error("Multiplicador 1 nao altera nada.");
	if (args.apply && args.confirmOrgId !== args.orgId) {
		throw new Error("Para aplicar, confirme a organizacao com --confirm-org-id=<mesmo-org-id>.");
	}
	if (args.apply && args.expectedAccumulationValue === null) {
		throw new Error("Para aplicar, informe --expected-acumulo-valor=<valor-atual> como trava contra reaplicacao.");
	}
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

function printScalePlan(label: string, value: number, multiplier: number) {
	console.log(`  ${label}: ${formatNumber(value)} -> ${formatNumber(value * multiplier)}`);
}

function buildScaledInteractionMetadataExpression(multiplier: number) {
	const entries = CASHBACK_INTERACTION_METADATA_KEYS.flatMap((key) => [
		sql.raw(`'${key}'`),
		sql`case
			when ${interactions.metadados} ? ${key}
				and jsonb_typeof(${interactions.metadados}->${key}) = 'number'
			then to_jsonb(((${interactions.metadados}->>${key})::double precision * ${multiplier}))
			else ${interactions.metadados}->${key}
		end`,
	]);

	return sql`jsonb_strip_nulls(${interactions.metadados} || jsonb_build_object(${sql.join(entries, sql`, `)}))`;
}

function buildScaledTransactionMetadataExpression(multiplier: number) {
	return sql`case
		when ${cashbackProgramTransactions.metadados} is null then null
		when not (${cashbackProgramTransactions.metadados} ? 'consumoFifo') then ${cashbackProgramTransactions.metadados}
		when jsonb_typeof(${cashbackProgramTransactions.metadados}->'consumoFifo') <> 'array' then ${cashbackProgramTransactions.metadados}
		else jsonb_set(
			${cashbackProgramTransactions.metadados},
			'{consumoFifo}',
			coalesce(
				(
					select jsonb_agg(
						case
							when item ? 'consumedValue' and jsonb_typeof(item->'consumedValue') = 'number'
							then jsonb_set(item, '{consumedValue}', to_jsonb(((item->>'consumedValue')::double precision * ${multiplier})), false)
							else item
						end
					)
					from jsonb_array_elements(${cashbackProgramTransactions.metadados}->'consumoFifo') as item
				),
				'[]'::jsonb
			),
			false
		)
	end`;
}

async function findTargetOrganization(orgId: string) {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, orgId),
		columns: {
			id: true,
			nome: true,
		},
	});

	if (!organization) throw new Error(`Organizacao ${orgId} nao encontrada.`);
	return organization;
}

async function findTargetProgram(orgId: string, programId: string | null) {
	const programs = await db.query.cashbackPrograms.findMany({
		where: (fields, { and, eq }) =>
			programId ? and(eq(fields.organizacaoId, orgId), eq(fields.id, programId)) : and(eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
	});

	if (programs.length === 0) {
		throw new Error(programId ? `Programa ${programId} nao encontrado para a organizacao.` : "Nenhum programa ativo encontrado para a organizacao.");
	}

	if (programs.length > 1) {
		throw new Error(`Foram encontrados ${programs.length} programas ativos. Rode novamente com --program-id=<id-do-programa>.`);
	}

	const program = programs[0]!;
	if (!program.ativo) throw new Error("Programa encontrado, mas esta inativo.");
	if (program.modalidadeDescontosPermitida) throw new Error("Programa permite modalidade de descontos. Migracao abortada.");
	if (!program.modalidadeRecompensasPermitida) throw new Error("Programa nao permite modalidade de recompensas. Migracao abortada.");
	return program;
}

async function getProgramConfigurationSummary(programId: string, orgId: string) {
	const [program] = await db
		.select({
			acumuloValor: cashbackPrograms.acumuloValor,
			acumuloValorParceiro: cashbackPrograms.acumuloValorParceiro,
		})
		.from(cashbackPrograms)
		.where(and(eq(cashbackPrograms.id, programId), eq(cashbackPrograms.organizacaoId, orgId)));

	return {
		acumuloValor: toNumber(program?.acumuloValor),
		acumuloValorParceiro: toNumber(program?.acumuloValorParceiro),
	};
}

async function getPrizesSummary(programId: string, orgId: string) {
	const [summary] = await db
		.select({
			count: sql<number>`count(*)::int`,
			activeCount: sql<number>`count(*) filter (where ${cashbackProgramPrizes.ativo} = true)::int`,
			valor: sql<number>`coalesce(sum(${cashbackProgramPrizes.valor}), 0)`,
		})
		.from(cashbackProgramPrizes)
		.where(
			and(
				eq(cashbackProgramPrizes.programaId, programId),
				or(eq(cashbackProgramPrizes.organizacaoId, orgId), isNull(cashbackProgramPrizes.organizacaoId)),
			),
		);

	return {
		count: toNumber(summary?.count),
		activeCount: toNumber(summary?.activeCount),
		valor: toNumber(summary?.valor),
	};
}

async function getTransactionsSummary(programId: string, orgId: string) {
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
			discountRedemptionsCount: sql<number>`count(*) filter (
				where ${cashbackProgramTransactions.tipo} = 'RESGATE'
					and ${cashbackProgramTransactions.resgateRecompensaId} is null
			)::int`,
			fifoMetadataCount: sql<number>`count(*) filter (
				where ${cashbackProgramTransactions.metadados} ? 'consumoFifo'
			)::int`,
		})
		.from(cashbackProgramTransactions)
		.where(and(eq(cashbackProgramTransactions.organizacaoId, orgId), eq(cashbackProgramTransactions.programaId, programId)));

	return {
		count: toNumber(summary?.count),
		valor: toNumber(summary?.valor),
		valorRestante: toNumber(summary?.valorRestante),
		saldoValorAnterior: toNumber(summary?.saldoValorAnterior),
		saldoValorPosterior: toNumber(summary?.saldoValorPosterior),
		resgateRecompensaValor: toNumber(summary?.resgateRecompensaValor),
		resgateRecompensaValorCount: toNumber(summary?.resgateRecompensaValorCount),
		vendaValor: toNumber(summary?.vendaValor),
		discountRedemptionsCount: toNumber(summary?.discountRedemptionsCount),
		fifoMetadataCount: toNumber(summary?.fifoMetadataCount),
	};
}

async function getBalancesSummary(programId: string, orgId: string) {
	const [summary] = await db
		.select({
			count: sql<number>`count(*)::int`,
			saldoValorDisponivel: sql<number>`coalesce(sum(${cashbackProgramBalances.saldoValorDisponivel}), 0)`,
			saldoValorAcumuladoTotal: sql<number>`coalesce(sum(${cashbackProgramBalances.saldoValorAcumuladoTotal}), 0)`,
			saldoValorResgatadoTotal: sql<number>`coalesce(sum(${cashbackProgramBalances.saldoValorResgatadoTotal}), 0)`,
		})
		.from(cashbackProgramBalances)
		.where(and(eq(cashbackProgramBalances.organizacaoId, orgId), eq(cashbackProgramBalances.programaId, programId)));

	return {
		count: toNumber(summary?.count),
		saldoValorDisponivel: toNumber(summary?.saldoValorDisponivel),
		saldoValorAcumuladoTotal: toNumber(summary?.saldoValorAcumuladoTotal),
		saldoValorResgatadoTotal: toNumber(summary?.saldoValorResgatadoTotal),
	};
}

async function getCampaignsSummary(orgId: string) {
	const [summary] = await db
		.select({
			count: sql<number>`count(*)::int`,
			cashbackGenerationCount: sql<number>`count(*) filter (
				where ${campaigns.cashbackGeracaoAtivo} = true
					and ${campaigns.cashbackGeracaoValor} is not null
			)::int`,
			cashbackGeracaoValor: sql<number>`coalesce(sum(${campaigns.cashbackGeracaoValor}) filter (
				where ${campaigns.cashbackGeracaoAtivo} = true
					and ${campaigns.cashbackGeracaoValor} is not null
			), 0)`,
			gatilhoNovoCashbackAcumuladoValorMinimo: sql<number>`coalesce(sum(${campaigns.gatilhoNovoCashbackAcumuladoValorMinimo}), 0)`,
			gatilhoTotalCashbackAcumuladoValorMinimo: sql<number>`coalesce(sum(${campaigns.gatilhoTotalCashbackAcumuladoValorMinimo}), 0)`,
			gatilhoCashbackExpirandoValorMinimo: sql<number>`coalesce(sum(${campaigns.gatilhoCashbackExpirandoValorMinimo}), 0)`,
		})
		.from(campaigns)
		.where(eq(campaigns.organizacaoId, orgId));

	return {
		count: toNumber(summary?.count),
		cashbackGenerationCount: toNumber(summary?.cashbackGenerationCount),
		cashbackGeracaoValor: toNumber(summary?.cashbackGeracaoValor),
		gatilhoNovoCashbackAcumuladoValorMinimo: toNumber(summary?.gatilhoNovoCashbackAcumuladoValorMinimo),
		gatilhoTotalCashbackAcumuladoValorMinimo: toNumber(summary?.gatilhoTotalCashbackAcumuladoValorMinimo),
		gatilhoCashbackExpirandoValorMinimo: toNumber(summary?.gatilhoCashbackExpirandoValorMinimo),
	};
}

async function getPendingInteractionsMetadataSummary(orgId: string) {
	const metadataCondition = or(...CASHBACK_INTERACTION_METADATA_KEYS.map((key) => sql`${interactions.metadados} ? ${key}`));
	const [summary] = await db
		.select({
			count: sql<number>`count(*)::int`,
		})
		.from(interactions)
		.where(
			and(eq(interactions.organizacaoId, orgId), isNull(interactions.dataExecucao), sql`${interactions.metadados} is not null`, metadataCondition),
		);

	return {
		count: toNumber(summary?.count),
	};
}

async function getFullSummary(programId: string, orgId: string) {
	const [programConfiguration, prizes, transactions, balances, campaignSummary, pendingInteractionMetadata] = await Promise.all([
		getProgramConfigurationSummary(programId, orgId),
		getPrizesSummary(programId, orgId),
		getTransactionsSummary(programId, orgId),
		getBalancesSummary(programId, orgId),
		getCampaignsSummary(orgId),
		getPendingInteractionsMetadataSummary(orgId),
	]);

	return {
		programConfiguration,
		prizes,
		transactions,
		balances,
		campaignSummary,
		pendingInteractionMetadata,
	};
}

async function printSummary(programId: string, orgId: string, multiplier: number, title: string) {
	const summary = await getFullSummary(programId, orgId);

	console.log(`\n${title}`);
	console.log("Configuracoes do programa:");
	printScalePlan("cashback_programs.acumulo_valor", summary.programConfiguration.acumuloValor, multiplier);
	printScalePlan("cashback_programs.acumulo_valor_parceiro", summary.programConfiguration.acumuloValorParceiro, multiplier);
	console.log("  cashback_programs.acumulo_regra_valor_minimo nao sera alterado (valor minimo de venda).");
	console.log("  cashback_programs.resgate_limite_valor nao sera alterado (modalidade descontos bloqueada).");

	console.log(`\nRecompensas: ${summary.prizes.count} (${summary.prizes.activeCount} ativas)`);
	printScalePlan("cashback_program_prizes.valor", summary.prizes.valor, multiplier);

	console.log(`\nTransacoes: ${summary.transactions.count}`);
	printScalePlan("cashback_program_transactions.valor", summary.transactions.valor, multiplier);
	printScalePlan("cashback_program_transactions.valor_restante", summary.transactions.valorRestante, multiplier);
	printScalePlan("cashback_program_transactions.saldo_valor_anterior", summary.transactions.saldoValorAnterior, multiplier);
	printScalePlan("cashback_program_transactions.saldo_valor_posterior", summary.transactions.saldoValorPosterior, multiplier);
	printScalePlan("cashback_program_transactions.resgate_recompensa_valor", summary.transactions.resgateRecompensaValor, multiplier);
	console.log(`  resgate_recompensa_valor preenchido em ${summary.transactions.resgateRecompensaValorCount} transacao(oes).`);
	console.log(`  metadados.consumoFifo atualizados em ate ${summary.transactions.fifoMetadataCount} transacao(oes).`);
	console.log(`  resgates sem recompensa encontrados: ${summary.transactions.discountRedemptionsCount}.`);
	console.log(`  venda_valor nao sera alterado: ${formatNumber(summary.transactions.vendaValor)}`);

	console.log(`\nSaldos: ${summary.balances.count}`);
	printScalePlan("cashback_program_balances.saldo_valor_disponivel", summary.balances.saldoValorDisponivel, multiplier);
	printScalePlan("cashback_program_balances.saldo_valor_acumulado_total", summary.balances.saldoValorAcumuladoTotal, multiplier);
	printScalePlan("cashback_program_balances.saldo_valor_resgatado_total", summary.balances.saldoValorResgatadoTotal, multiplier);

	console.log(`\nCampanhas da organizacao: ${summary.campaignSummary.count}`);
	console.log(`  campanhas com geracao de cashback: ${summary.campaignSummary.cashbackGenerationCount}`);
	printScalePlan("campaigns.cashback_geracao_valor", summary.campaignSummary.cashbackGeracaoValor, multiplier);
	printScalePlan("campaigns.gatilho_cashback_acumulado_valor_minimo", summary.campaignSummary.gatilhoNovoCashbackAcumuladoValorMinimo, multiplier);
	printScalePlan(
		"campaigns.gatilho_total_cashback_acumulado_valor_minimo",
		summary.campaignSummary.gatilhoTotalCashbackAcumuladoValorMinimo,
		multiplier,
	);
	printScalePlan("campaigns.gatilho_cashback_expirando_valor_minimo", summary.campaignSummary.gatilhoCashbackExpirandoValorMinimo, multiplier);

	console.log(`\nInteracoes pendentes com metadados de cashback: ${summary.pendingInteractionMetadata.count}`);

	return summary;
}

async function applyScale({
	orgId,
	programId,
	multiplier,
	expectedAccumulationValue,
}: {
	orgId: string;
	programId: string;
	multiplier: number;
	expectedAccumulationValue: number;
}) {
	const now = new Date();

	return db.transaction(async (tx) => {
		const updatedPrograms = await tx
			.update(cashbackPrograms)
			.set({
				acumuloValor: sql`${cashbackPrograms.acumuloValor} * ${multiplier}`,
				acumuloValorParceiro: sql`${cashbackPrograms.acumuloValorParceiro} * ${multiplier}`,
				dataAtualizacao: now,
			})
			.where(
				and(
					eq(cashbackPrograms.id, programId),
					eq(cashbackPrograms.organizacaoId, orgId),
					eq(cashbackPrograms.ativo, true),
					eq(cashbackPrograms.modalidadeDescontosPermitida, false),
					eq(cashbackPrograms.modalidadeRecompensasPermitida, true),
					sql`abs(${cashbackPrograms.acumuloValor} - ${expectedAccumulationValue}) <= ${EPSILON}`,
				),
			)
			.returning({ id: cashbackPrograms.id });

		if (updatedPrograms.length !== 1) {
			throw new Error("Programa nao passou na trava de modalidade/valor esperado. Migracao abortada para evitar reaplicacao.");
		}

		const updatedPrizes = await tx
			.update(cashbackProgramPrizes)
			.set({
				valor: sql`${cashbackProgramPrizes.valor} * ${multiplier}`,
				dataAtualizacao: now,
			})
			.where(
				and(
					eq(cashbackProgramPrizes.programaId, programId),
					or(eq(cashbackProgramPrizes.organizacaoId, orgId), isNull(cashbackProgramPrizes.organizacaoId)),
				),
			)
			.returning({ id: cashbackProgramPrizes.id });

		const updatedTransactions = await tx
			.update(cashbackProgramTransactions)
			.set({
				valor: sql`${cashbackProgramTransactions.valor} * ${multiplier}`,
				valorRestante: sql`${cashbackProgramTransactions.valorRestante} * ${multiplier}`,
				saldoValorAnterior: sql`${cashbackProgramTransactions.saldoValorAnterior} * ${multiplier}`,
				saldoValorPosterior: sql`${cashbackProgramTransactions.saldoValorPosterior} * ${multiplier}`,
				resgateRecompensaValor: sql`case
					when ${cashbackProgramTransactions.resgateRecompensaValor} is null then null
					else ${cashbackProgramTransactions.resgateRecompensaValor} * ${multiplier}
				end`,
				metadados: buildScaledTransactionMetadataExpression(multiplier),
				dataAtualizacao: now,
			})
			.where(and(eq(cashbackProgramTransactions.organizacaoId, orgId), eq(cashbackProgramTransactions.programaId, programId)))
			.returning({ id: cashbackProgramTransactions.id });

		const updatedBalances = await tx
			.update(cashbackProgramBalances)
			.set({
				saldoValorDisponivel: sql`${cashbackProgramBalances.saldoValorDisponivel} * ${multiplier}`,
				saldoValorAcumuladoTotal: sql`${cashbackProgramBalances.saldoValorAcumuladoTotal} * ${multiplier}`,
				saldoValorResgatadoTotal: sql`${cashbackProgramBalances.saldoValorResgatadoTotal} * ${multiplier}`,
				dataAtualizacao: now,
			})
			.where(and(eq(cashbackProgramBalances.organizacaoId, orgId), eq(cashbackProgramBalances.programaId, programId)))
			.returning({ id: cashbackProgramBalances.id });

		const updatedCampaigns = await tx
			.update(campaigns)
			.set({
				cashbackGeracaoValor: sql`case
					when ${campaigns.cashbackGeracaoValor} is null then null
					else ${campaigns.cashbackGeracaoValor} * ${multiplier}
				end`,
				gatilhoNovoCashbackAcumuladoValorMinimo: sql`case
					when ${campaigns.gatilhoNovoCashbackAcumuladoValorMinimo} is null then null
					else round(${campaigns.gatilhoNovoCashbackAcumuladoValorMinimo} * ${multiplier})::integer
				end`,
				gatilhoTotalCashbackAcumuladoValorMinimo: sql`case
					when ${campaigns.gatilhoTotalCashbackAcumuladoValorMinimo} is null then null
					else round(${campaigns.gatilhoTotalCashbackAcumuladoValorMinimo} * ${multiplier})::integer
				end`,
				gatilhoCashbackExpirandoValorMinimo: sql`case
					when ${campaigns.gatilhoCashbackExpirandoValorMinimo} is null then null
					else ${campaigns.gatilhoCashbackExpirandoValorMinimo} * ${multiplier}
				end`,
			})
			.where(eq(campaigns.organizacaoId, orgId))
			.returning({ id: campaigns.id });

		const metadataCondition = or(...CASHBACK_INTERACTION_METADATA_KEYS.map((key) => sql`${interactions.metadados} ? ${key}`));
		const updatedInteractions = await tx
			.update(interactions)
			.set({
				metadados: buildScaledInteractionMetadataExpression(multiplier),
			})
			.where(
				and(eq(interactions.organizacaoId, orgId), isNull(interactions.dataExecucao), sql`${interactions.metadados} is not null`, metadataCondition),
			)
			.returning({ id: interactions.id });

		return {
			programs: updatedPrograms.length,
			prizes: updatedPrizes.length,
			transactions: updatedTransactions.length,
			balances: updatedBalances.length,
			campaigns: updatedCampaigns.length,
			pendingInteractions: updatedInteractions.length,
		};
	});
}

async function main() {
	const args = parseArgs();
	validateArgs(args);

	const organization = await findTargetOrganization(args.orgId);
	const program = await findTargetProgram(args.orgId, args.programId);

	console.log("Migracao de escala do ledger de cashback");
	console.log(`Organizacao: ${organization.id} - ${organization.nome}`);
	console.log(`Programa: ${program.id} - ${program.titulo}`);
	console.log(`Modo: ${args.apply ? "APLICAR" : "DRY RUN"}`);
	console.log(`Multiplicador: ${formatNumber(args.multiplier)}x`);
	console.log(`Acumulo atual: ${program.acumuloTipo} ${formatNumber(program.acumuloValor)}`);
	console.log(`Acumulo alvo: ${program.acumuloTipo} ${formatNumber(program.acumuloValor * args.multiplier)}`);
	console.log(`Modalidade descontos permitida: ${program.modalidadeDescontosPermitida ? "sim" : "nao"}`);
	console.log(`Modalidade recompensas permitida: ${program.modalidadeRecompensasPermitida ? "sim" : "nao"}`);

	if (args.expectedAccumulationValue !== null && Math.abs(program.acumuloValor - args.expectedAccumulationValue) > EPSILON) {
		throw new Error(
			`Programa esta com acumulo_valor=${formatNumber(program.acumuloValor)}. Esperado: ${formatNumber(args.expectedAccumulationValue)}.`,
		);
	}

	const plannedSummary = await printSummary(program.id, args.orgId, args.multiplier, "Impacto planejado");
	if (plannedSummary.transactions.discountRedemptionsCount > 0) {
		throw new Error("Foram encontrados resgates sem recompensa vinculada. Isso indica uso historico de descontos; migracao abortada.");
	}
	if (plannedSummary.prizes.activeCount === 0) {
		throw new Error("Programa reward-only sem recompensas ativas. Migracao abortada para revisao manual.");
	}

	if (!args.apply) {
		console.log("\nDry-run concluido. Nenhuma alteracao foi aplicada.");
		console.log(
			`Para aplicar: tsx ./utils/scripts/scale-cashback-ledger.ts --org-id=${args.orgId} --multiplier=${args.multiplier} --expected-acumulo-valor=${program.acumuloValor} --confirm-org-id=${args.orgId} --apply`,
		);
		return;
	}

	const expectedAccumulationValue = args.expectedAccumulationValue;
	if (expectedAccumulationValue === null) {
		throw new Error("Valor esperado de acumulo nao informado.");
	}

	const result = await applyScale({
		orgId: args.orgId,
		programId: program.id,
		multiplier: args.multiplier,
		expectedAccumulationValue,
	});

	console.log("\nAlteracoes aplicadas:");
	console.log(`  Programas atualizados: ${result.programs}`);
	console.log(`  Recompensas atualizadas: ${result.prizes}`);
	console.log(`  Transacoes atualizadas: ${result.transactions}`);
	console.log(`  Saldos atualizados: ${result.balances}`);
	console.log(`  Campanhas atualizadas: ${result.campaigns}`);
	console.log(`  Interacoes pendentes atualizadas: ${result.pendingInteractions}`);

	await printSummary(program.id, args.orgId, args.multiplier, "Resumo apos aplicacao");
}

main()
	.catch((error) => {
		console.error("Falha na migracao de escala do cashback:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
