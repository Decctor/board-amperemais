import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { TAuthUserSession } from "@/lib/authentication/types";
import { canCreateFinances, canEditFinances, canViewFinances } from "@/lib/permissions/finances";
import { getCreditCardForecastDate } from "@/lib/finances/credit-card";
import { normalizeFinancialTransactionValue } from "@/lib/finances/financial-transaction-value";
import { getNextRecurringOccurrence } from "@/lib/finances/recurrence";
import { db, type DBTransaction } from "@/services/drizzle";
import { accountingEntries, accountsCharts, financialAccounts, financialRecurringRules, financialTransactions } from "@/services/drizzle/schema";
import { AccountingEntrySchema, FinancialTransactionSchema } from "@/schemas/financial";
import { FinancialRecurringRuleConfigSchema } from "@/schemas/financial-recurring";
import { AccountingEntryOriginTypeEnum, TAccountingEntryOriginTypeEnum } from "@/schemas/enums";
import type { TFinancialAccountConfiguration } from "@/schemas/financial";
import { and, count, eq, gte, ilike, inArray, lte } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import dayjs from "dayjs";

const GetAccountingEntriesInputSchema = z.object({
	id: z
		.string({
			invalid_type_error: "Tipo inválido para ID do lançamento.",
		})
		.optional()
		.nullable(),
	page: z
		.string({ invalid_type_error: "Tipo inválido para página." })
		.optional()
		.nullable()
		.transform((v) => (v ? Number(v) : 1)),
	search: z.string({ invalid_type_error: "Tipo inválido para busca." }).optional().nullable(),
	periodAfter: z
		.string({ invalid_type_error: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	periodBefore: z
		.string({ invalid_type_error: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	originTypes: z
		.string({
			invalid_type_error: "Tipo inválido para os tipos de origem.",
		})
		.optional()
		.nullable()
		.transform((val) =>
			val ? (val.split(",").filter((v) => AccountingEntryOriginTypeEnum.safeParse(v).success) as TAccountingEntryOriginTypeEnum[]) : [],
		),
});
export type TGetAccountingEntriesInput = z.infer<typeof GetAccountingEntriesInputSchema>;

async function getAccountingEntries({ input, session }: { input: TGetAccountingEntriesInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { id, page, search, periodAfter, periodBefore, originTypes } = input;

	if (id) {
		const entry = await db.query.accountingEntries.findFirst({
			where: and(eq(accountingEntries.id, id), eq(accountingEntries.organizacaoId, userOrgId)),
			with: {
				contaDebito: { columns: { id: true, nome: true, codigo: true, natureza: true } },
				contaCredito: { columns: { id: true, nome: true, codigo: true, natureza: true } },
				autor: { columns: { id: true, nome: true, avatarUrl: true } },
				transacoesFinanceiras: {
					with: {
						contaFinanceira: { columns: { id: true, nome: true, tipo: true } },
					},
					orderBy: (fields, { asc }) => asc(fields.dataPrevisao),
				},
			},
		});
		if (!entry) throw new createHttpError.NotFound("Lançamento contábil não encontrado.");

		const recorrenciaRegra = entry.recorrenciaRegraId
			? await db.query.financialRecurringRules.findFirst({
					where: and(eq(financialRecurringRules.id, entry.recorrenciaRegraId), eq(financialRecurringRules.organizacaoId, userOrgId)),
				})
			: null;

		return {
			data: {
				byId: { ...entry, recorrenciaRegra },
				default: null,
			},
			message: "Lançamento contábil recuperado com sucesso.",
		};
	}

	const conditions = [eq(accountingEntries.organizacaoId, userOrgId)];
	if (search && search.trim().length > 0) conditions.push(ilike(accountingEntries.titulo, `%${search.trim()}%`));
	if (periodAfter) conditions.push(gte(accountingEntries.dataCompetencia, periodAfter));
	if (periodBefore) conditions.push(lte(accountingEntries.dataCompetencia, periodBefore));
	if (originTypes.length > 0) conditions.push(inArray(accountingEntries.origemTipo, originTypes));

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (page - 1);

	const [countResult, entriesResult] = await Promise.all([
		db
			.select({ count: count() })
			.from(accountingEntries)
			.where(and(...conditions)),
		db.query.accountingEntries.findMany({
			where: and(...conditions),
			with: {
				contaDebito: { columns: { id: true, nome: true } },
				contaCredito: { columns: { id: true, nome: true } },
				autor: { columns: { id: true, nome: true, avatarUrl: true } },
			},
			orderBy: (fields, { desc }) => desc(fields.dataInsercao),
			limit: PAGE_SIZE,
			offset: skip,
		}),
	]);

	const entriesMatched = countResult[0]?.count ?? 0;
	const totalPages = Math.ceil(entriesMatched / PAGE_SIZE);

	return {
		data: {
			byId: null,
			default: {
				entries: entriesResult,
				entriesMatched,
				totalPages,
			},
		},
		message: "Lançamentos contábeis recuperados com sucesso.",
	};
}
export type TGetAccountingEntriesOutput = Awaited<ReturnType<typeof getAccountingEntries>>;
export type TGetAccountingEntriesOutputDefault = Exclude<TGetAccountingEntriesOutput["data"]["default"], null>;
export type TGetAccountingEntriesOutputById = Exclude<TGetAccountingEntriesOutput["data"]["byId"], null>;

async function getAccountingEntriesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	if (!canViewFinances(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetAccountingEntriesInputSchema.parse({
		id: searchParams.get("id") ?? undefined,
		page: searchParams.get("page") ?? undefined,
		search: searchParams.get("search") ?? undefined,
		periodAfter: searchParams.get("periodAfter") ?? undefined,
		periodBefore: searchParams.get("periodBefore") ?? undefined,
		originTypes: searchParams.get("originTypes") ?? undefined,
	});
	const result = await getAccountingEntries({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAccountingEntriesRoute });

const AccountingEntryMutationSchema = AccountingEntrySchema.pick({
	titulo: true,
	anotacoes: true,
	idContaDebito: true,
	idContaCredito: true,
	valor: true,
	valorPrevisto: true,
	dataCompetencia: true,
});

const FinancialTransactionMutationSchema = FinancialTransactionSchema.pick({
	contaFinanceiraId: true,
	titulo: true,
	tipo: true,
	valor: true,
	valorBase: true,
	valorJuros: true,
	valorMulta: true,
	valorTaxas: true,
	valorDesconto: true,
	modificadoresMetadata: true,
	metodo: true,
	dataPrevisao: true,
	dataEfetivacao: true,
	parcela: true,
	totalParcelas: true,
});

const CreateAccountingEntryInputSchema = z.object({
	entry: AccountingEntryMutationSchema,
	entryFinancialTransactions: z.array(FinancialTransactionMutationSchema).default([]),
	recurrenceRule: FinancialRecurringRuleConfigSchema.optional().nullable(),
});
export type TCreateAccountingEntryInput = z.infer<typeof CreateAccountingEntryInputSchema>;

const UpdateAccountingEntryInputSchema = z.object({
	entryId: z.string({
		required_error: "ID do lançamento contábil não informado.",
		invalid_type_error: "Tipo inválido para ID do lançamento contábil.",
	}),
	entry: AccountingEntryMutationSchema,
	entryFinancialTransactions: z
		.array(
			FinancialTransactionMutationSchema.extend({
				id: z
					.string({
						required_error: "ID da transação financeira não informado.",
						invalid_type_error: "Tipo inválido para ID da transação financeira.",
					})
					.optional()
					.nullable(),
				deletar: z
					.boolean({
						required_error: "Deletar transação financeira não informado.",
						invalid_type_error: "Tipo inválido para deletar transação financeira.",
					})
					.optional()
					.nullable(),
			}),
		)
		.default([]),
});
export type TUpdateAccountingEntryInput = z.infer<typeof UpdateAccountingEntryInputSchema>;

type TAccountingEntryTransactionInput = TUpdateAccountingEntryInput["entryFinancialTransactions"][number];
type TExistingAccountingEntryForUpdate = NonNullable<Awaited<ReturnType<typeof getExistingAccountingEntryForUpdate>>>;

async function getExistingAccountingEntryForUpdate({ entryId, orgId }: { entryId: string; orgId: string }) {
	return db.query.accountingEntries.findFirst({
		where: and(eq(accountingEntries.id, entryId), eq(accountingEntries.organizacaoId, orgId)),
		columns: {
			id: true,
			origemTipo: true,
			titulo: true,
			anotacoes: true,
			idContaDebito: true,
			idContaCredito: true,
			valor: true,
			valorPrevisto: true,
			dataCompetencia: true,
		},
	});
}

function validateTransactionTotal({ entryValue, transactions }: { entryValue: number; transactions: { valor: number; deletar?: boolean | null }[] }) {
	const activeTransactions = transactions.filter((transaction) => !transaction.deletar);
	if (activeTransactions.length === 0) return;

	const total = activeTransactions.reduce((acc, transaction) => acc + (transaction.valor || 0), 0);
	if (Math.abs(total - entryValue) > 0.02) {
		throw new createHttpError.BadRequest("A soma das transações financeiras precisa bater o valor do lançamento.");
	}
}

function datesMatch(a: Date | string | null | undefined, b: Date | string | null | undefined) {
	if (!a && !b) return true;
	if (!a || !b) return false;
	return new Date(a).getTime() === new Date(b).getTime();
}

function nullableNumbersMatch(a: number | null | undefined, b: number | null | undefined) {
	return (a ?? null) === (b ?? null);
}

function assertLockedEntryFieldsUnchanged({
	inputEntry,
	existingEntry,
}: {
	inputEntry: TUpdateAccountingEntryInput["entry"];
	existingEntry: TExistingAccountingEntryForUpdate;
}) {
	const lockedFieldChanged =
		inputEntry.titulo !== existingEntry.titulo ||
		inputEntry.idContaDebito !== existingEntry.idContaDebito ||
		inputEntry.idContaCredito !== existingEntry.idContaCredito ||
		inputEntry.valor !== existingEntry.valor ||
		!nullableNumbersMatch(inputEntry.valorPrevisto, existingEntry.valorPrevisto) ||
		!datesMatch(inputEntry.dataCompetencia, existingEntry.dataCompetencia);

	if (lockedFieldChanged) {
		throw new createHttpError.BadRequest(
			"Lançamentos originados por venda ou estorno não permitem alterar título, valor, competência ou contas contábeis.",
		);
	}
}

async function validateAccountingEntryRelations({
	tx,
	orgId,
	entry,
	transactions,
}: {
	tx: DBTransaction;
	orgId: string;
	entry: TCreateAccountingEntryInput["entry"];
	transactions: TAccountingEntryTransactionInput[];
}) {
	if (entry.idContaDebito === entry.idContaCredito) {
		throw new createHttpError.BadRequest("A conta de débito e a conta de crédito precisam ser diferentes.");
	}

	const [debitAccount, creditAccount] = await Promise.all([
		tx.query.accountsCharts.findFirst({
			where: and(eq(accountsCharts.id, entry.idContaDebito), eq(accountsCharts.organizacaoId, orgId)),
			columns: { id: true },
		}),
		tx.query.accountsCharts.findFirst({
			where: and(eq(accountsCharts.id, entry.idContaCredito), eq(accountsCharts.organizacaoId, orgId)),
			columns: { id: true },
		}),
	]);

	if (!debitAccount) throw new createHttpError.NotFound("Conta de débito não encontrada.");
	if (!creditAccount) throw new createHttpError.NotFound("Conta de crédito não encontrada.");

	const financialAccountIds = Array.from(new Set(transactions.map((transaction) => transaction.contaFinanceiraId).filter(Boolean))) as string[];
	const accountById = new Map<string, { id: string; tipo: string; configuracao: TFinancialAccountConfiguration }>();
	if (financialAccountIds.length === 0) return accountById;

	const accounts = await tx.query.financialAccounts.findMany({
		where: and(eq(financialAccounts.organizacaoId, orgId), inArray(financialAccounts.id, financialAccountIds)),
		columns: { id: true, tipo: true, configuracao: true },
	});
	for (const account of accounts) accountById.set(account.id, account);
	for (const accountId of financialAccountIds) {
		if (!accountById.has(accountId)) throw new createHttpError.NotFound("Conta financeira não encontrada.");
	}
	return accountById;
}

function getTransactionValues(
	transaction: TAccountingEntryTransactionInput,
	{
		account,
		referenceDate,
	}: {
		account?: { tipo: string; configuracao: TFinancialAccountConfiguration };
		referenceDate: Date;
	},
) {
	const dataPrevisao =
		account?.tipo === "CARTAO_CREDITO" && account.configuracao.categoria === "CARTAO_CREDITO"
			? getCreditCardForecastDate(referenceDate, account.configuracao)
			: transaction.dataPrevisao;
	let monetaryValues;
	try {
		monetaryValues = normalizeFinancialTransactionValue(transaction);
	} catch (error) {
		throw new createHttpError.BadRequest(error instanceof Error ? error.message : "Modificadores monetários inválidos.");
	}
	return {
		contaFinanceiraId: transaction.contaFinanceiraId ?? null,
		titulo: transaction.titulo,
		tipo: transaction.tipo,
		...monetaryValues,
		metodo: transaction.metodo,
		dataPrevisao,
		dataEfetivacao: transaction.dataEfetivacao ?? null,
		parcela: transaction.parcela ?? null,
		totalParcelas: transaction.totalParcelas ?? null,
	};
}

async function createAccountingEntry({ input, session }: { input: TCreateAccountingEntryInput; session: TAuthUserSession }) {
	const userMembership = session.membership;
	if (!userMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const orgId = userMembership.organizacao.id;
	validateTransactionTotal({ entryValue: input.entry.valor, transactions: input.entryFinancialTransactions });

	const transactionReturn = await db.transaction(async (tx) => {
		const accountById = await validateAccountingEntryRelations({
			tx,
			orgId,
			entry: input.entry,
			transactions: input.entryFinancialTransactions,
		});

		const [createdEntry] = await tx
			.insert(accountingEntries)
			.values({
				organizacaoId: orgId,
				origemTipo: "MANUAL",
				titulo: input.entry.titulo,
				anotacoes: input.entry.anotacoes ?? null,
				idContaDebito: input.entry.idContaDebito,
				idContaCredito: input.entry.idContaCredito,
				valor: input.entry.valor,
				valorPrevisto: input.entry.valorPrevisto ?? null,
				dataCompetencia: input.entry.dataCompetencia,
				autorId: session.user.id,
			})
			.returning({ id: accountingEntries.id });

		if (!createdEntry?.id) {
			throw new createHttpError.InternalServerError("Erro ao criar lançamento contábil.");
		}

		if (input.entryFinancialTransactions.length > 0) {
			await tx.insert(financialTransactions).values(
				input.entryFinancialTransactions.map((transaction) => ({
					organizacaoId: orgId,
					lancamentoContabilId: createdEntry.id,
					autorId: session.user.id,
					...getTransactionValues(transaction, {
						account: accountById.get(transaction.contaFinanceiraId ?? ""),
						referenceDate: input.entry.dataCompetencia,
					}),
				})),
			);
		}

		if (input.recurrenceRule) {
			const config = input.recurrenceRule;
			const templateTransacoes = input.entryFinancialTransactions.map((transaction) => {
				const account = transaction.contaFinanceiraId ? accountById.get(transaction.contaFinanceiraId) : undefined;
				return {
					...normalizeFinancialTransactionValue(transaction),
					contaFinanceiraId: transaction.contaFinanceiraId ?? null,
					titulo: transaction.titulo,
					tipo: transaction.tipo,
					metodo: transaction.metodo,
					diaPrevisao: account?.tipo === "CARTAO_CREDITO" ? null : dayjs(transaction.dataPrevisao).date(),
					previsaoModo: account?.tipo === "CARTAO_CREDITO" ? ("INFERIR_PELA_CONTA" as const) : ("DIA_FIXO" as const),
				};
			});
			const [createdRule] = await tx
				.insert(financialRecurringRules)
				.values({
					organizacaoId: orgId,
					autorId: session.user.id,
					lancamentoContabilOrigemId: createdEntry.id,
					status: "ATIVA",
					config,
					templateLancamento: {
						titulo: input.entry.titulo,
						anotacoes: input.entry.anotacoes ?? null,
						idContaDebito: input.entry.idContaDebito,
						idContaCredito: input.entry.idContaCredito,
						valor: input.entry.valor,
						valorPrevisto: input.entry.valorPrevisto ?? null,
						dataCompetencia: input.entry.dataCompetencia,
					},
					templateTransacoes,
					proximaGeracaoEm: getNextRecurringOccurrence(input.entry.dataCompetencia, config),
					gerarAte: config.fim ?? null,
				})
				.returning({ id: financialRecurringRules.id });
			if (!createdRule) throw new createHttpError.InternalServerError("Não foi possível criar a regra de recorrência.");
			await tx
				.update(accountingEntries)
				.set({ recorrenciaRegraId: createdRule.id, recorrenciaInstanciaData: input.entry.dataCompetencia })
				.where(eq(accountingEntries.id, createdEntry.id));
		}

		return createdEntry.id;
	});

	return {
		data: {
			entryId: transactionReturn,
		},
		message: "Lançamento contábil criado com sucesso.",
	};
}
export type TCreateAccountingEntryOutput = Awaited<ReturnType<typeof createAccountingEntry>>;

async function createAccountingEntryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	if (!canCreateFinances(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para criar lançamentos financeiros.");
	const input = CreateAccountingEntryInputSchema.parse(await request.json());
	const result = await createAccountingEntry({ input, session });
	return NextResponse.json(result, { status: 201 });
}

export const POST = appApiHandler({ POST: createAccountingEntryRoute });

async function updateAccountingEntry({ input, session }: { input: TUpdateAccountingEntryInput; session: TAuthUserSession }) {
	const userMembership = session.membership;
	if (!userMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const orgId = userMembership.organizacao.id;
	const existingEntry = await getExistingAccountingEntryForUpdate({ entryId: input.entryId, orgId });
	if (!existingEntry) throw new createHttpError.NotFound("Lançamento contábil não encontrado.");

	const canUpdateAccountingFields = existingEntry.origemTipo === "MANUAL";
	// Lançamentos de venda e de compra têm os dados contábeis controlados pela origem, mas a programação
	// de pagamento pode ser ajustada aqui — é onde o time financeiro trabalha.
	const canUpdateTransactions = existingEntry.origemTipo === "MANUAL" || existingEntry.origemTipo === "VENDA" || existingEntry.origemTipo === "COMPRA";

	if (canUpdateAccountingFields) {
		validateTransactionTotal({ entryValue: input.entry.valor, transactions: input.entryFinancialTransactions });
	} else {
		assertLockedEntryFieldsUnchanged({ inputEntry: input.entry, existingEntry });
		if (canUpdateTransactions) {
			validateTransactionTotal({ entryValue: existingEntry.valor, transactions: input.entryFinancialTransactions });
		}
	}

	const transactionReturn = await db.transaction(async (tx) => {
		if (canUpdateAccountingFields) {
			await validateAccountingEntryRelations({
				tx,
				orgId,
				entry: input.entry,
				transactions: input.entryFinancialTransactions,
			});
		}

		const [updatedEntry] = await tx
			.update(accountingEntries)
			.set({
				anotacoes: input.entry.anotacoes ?? null,
				...(canUpdateAccountingFields
					? {
							titulo: input.entry.titulo,
							idContaDebito: input.entry.idContaDebito,
							idContaCredito: input.entry.idContaCredito,
							valor: input.entry.valor,
							valorPrevisto: input.entry.valorPrevisto ?? null,
							dataCompetencia: input.entry.dataCompetencia,
						}
					: {}),
			})
			.where(and(eq(accountingEntries.id, input.entryId), eq(accountingEntries.organizacaoId, orgId)))
			.returning({ id: accountingEntries.id });

		if (!updatedEntry?.id) {
			throw new createHttpError.InternalServerError("Erro ao atualizar lançamento contábil.");
		}

		if (!canUpdateTransactions) return updatedEntry.id;

		const accountById = await validateAccountingEntryRelations({
			tx,
			orgId,
			entry: existingEntry,
			transactions: input.entryFinancialTransactions,
		});

		for (const transaction of input.entryFinancialTransactions) {
			if (transaction.id && transaction.deletar) {
				await tx
					.delete(financialTransactions)
					.where(
						and(
							eq(financialTransactions.id, transaction.id),
							eq(financialTransactions.lancamentoContabilId, input.entryId),
							eq(financialTransactions.organizacaoId, orgId),
						),
					);
				continue;
			}

			if (transaction.id) {
				await tx
					.update(financialTransactions)
					.set(
						getTransactionValues(transaction, {
							account: accountById.get(transaction.contaFinanceiraId ?? ""),
							referenceDate: input.entry.dataCompetencia,
						}),
					)
					.where(
						and(
							eq(financialTransactions.id, transaction.id),
							eq(financialTransactions.lancamentoContabilId, input.entryId),
							eq(financialTransactions.organizacaoId, orgId),
						),
					);
				continue;
			}

			await tx.insert(financialTransactions).values({
				organizacaoId: orgId,
				lancamentoContabilId: input.entryId,
				autorId: session.user.id,
				...getTransactionValues(transaction, {
					account: accountById.get(transaction.contaFinanceiraId ?? ""),
					referenceDate: input.entry.dataCompetencia,
				}),
			});
		}

		return updatedEntry.id;
	});

	return {
		data: {
			entryId: transactionReturn,
		},
		message: "Lançamento contábil atualizado com sucesso.",
	};
}
export type TUpdateAccountingEntryOutput = Awaited<ReturnType<typeof updateAccountingEntry>>;

async function updateAccountingEntryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");
	if (!canEditFinances(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para editar lançamentos financeiros.");
	const input = UpdateAccountingEntryInputSchema.parse(await request.json());
	const result = await updateAccountingEntry({ input, session });
	return NextResponse.json(result);
}

export const PUT = appApiHandler({ PUT: updateAccountingEntryRoute });
