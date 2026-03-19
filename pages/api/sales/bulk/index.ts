import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { formatPhoneAsBase, formatStringAsOnlyDigits, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { linkPartnerToClient } from "@/lib/partners/link-partner-to-client";
import {
	BulkCreateSalesInputSchema,
	type TBulkCreateSalesInput,
	type TBulkCreateSalesOutput,
	type TBulkSaleImportRow,
} from "@/state-hooks/use-bulk-create-sales";
import { db, DBTransaction } from "@/services/drizzle";
import { cashbackProgramBalances, clients, partners, sales, sellers } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";

type PostResponse = TBulkCreateSalesOutput;
const LOG_PREFIX = "[SALES_BULK]";

function normalizeOptionalText(value?: string | null) {
	const normalized = value?.trim();
	return normalized && normalized.length > 0 ? normalized : null;
}

function getBulkDedupeKey({ clientRef, saleDate, totalValue }: { clientRef: string; saleDate: Date; totalValue: number }) {
	const dayRef = dayjs(saleDate).format("YYYY-MM-DD");
	return `BULK-SHEET:${clientRef}:${dayRef}:${totalValue.toFixed(2)}`;
}

async function resolveOrCreateClient({
	tx,
	orgId,
	row,
	cashbackProgramId,
}: {
	tx: DBTransaction;
	orgId: string;
	row: TBulkSaleImportRow;
	cashbackProgramId?: string;
}) {
	const phoneBase = formatPhoneAsBase(row.clienteTelefone ?? "");
	const docDigits = formatStringAsOnlyDigits(row.clienteCpfCnpj ?? "");
	const docFormatted = docDigits ? formatToCPForCNPJ(docDigits) : "";
	const clientName = row.clienteNome.trim();

	const clientByDoc =
		docDigits.length > 0
			? await tx.query.clients.findFirst({
					where: (fields, operators) =>
						operators.and(
							operators.eq(fields.organizacaoId, orgId),
							operators.or(operators.eq(fields.cpfCnpj, docFormatted), operators.eq(fields.cpfCnpj, docDigits)),
						),
					columns: { id: true },
				})
			: null;

	if (clientByDoc) {
		console.log("[INFO] [SALES_BULK] Client found by document:", {
			orgId,
			clientId: clientByDoc.id,
		});
		return { clientId: clientByDoc.id, wasCreated: false };
	}

	const clientByPhone =
		phoneBase.length > 0
			? await tx.query.clients.findFirst({
					where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, orgId), operators.eq(fields.telefoneBase, phoneBase)),
					columns: { id: true },
				})
			: null;

	if (clientByPhone) {
		console.log("[INFO] [SALES_BULK] Client found by phone:", {
			orgId,
			clientId: clientByPhone.id,
		});
		return { clientId: clientByPhone.id, wasCreated: false };
	}

	const clientByName = await tx.query.clients.findFirst({
		where: and(eq(clients.organizacaoId, orgId), sql`lower(${clients.nome}) = lower(${clientName})`),
		columns: { id: true },
	});

	if (clientByName) {
		console.log("[INFO] [SALES_BULK] Client found by name:", {
			orgId,
			clientId: clientByName.id,
		});
		return { clientId: clientByName.id, wasCreated: false };
	}

	const insertedClient = await tx
		.insert(clients)
		.values({
			organizacaoId: orgId,
			nome: clientName,
			telefone: normalizeOptionalText(row.clienteTelefone) ? formatToPhone(row.clienteTelefone as string) : "",
			telefoneBase: phoneBase,
			cpfCnpj: docFormatted || null,
			analiseRFMTitulo: "CLIENTES RECENTES",
			primeiraCompraData: new Date(row.dataVenda),
			ultimaCompraData: new Date(row.dataVenda),
		})
		.returning({ id: clients.id });

	const insertedClientId = insertedClient[0]?.id;
	if (!insertedClientId) {
		throw new createHttpError.InternalServerError("Erro ao criar cliente da importação.");
	}

	if (cashbackProgramId) {
		const existingBalance = await tx.query.cashbackProgramBalances.findFirst({
			where: (fields, operators) =>
				operators.and(
					operators.eq(fields.organizacaoId, orgId),
					operators.eq(fields.clienteId, insertedClientId),
					operators.eq(fields.programaId, cashbackProgramId),
				),
			columns: { id: true },
		});
		if (!existingBalance) {
			await tx.insert(cashbackProgramBalances).values({
				organizacaoId: orgId,
				clienteId: insertedClientId,
				programaId: cashbackProgramId,
				saldoValorDisponivel: 0,
				saldoValorAcumuladoTotal: 0,
			});
		}
	}

	return { clientId: insertedClientId, wasCreated: true };
}

async function resolveOrCreateSeller({ tx, orgId, sellerName }: { tx: DBTransaction; orgId: string; sellerName?: string | null }) {
	const normalized = normalizeOptionalText(sellerName);
	if (!normalized || normalized === "N/A" || normalized === "0") return null;

	const existingSeller = await tx.query.sellers.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, orgId), operators.eq(fields.nome, normalized)),
		columns: { id: true },
	});
	if (existingSeller) {
		console.log("[INFO] [SALES_BULK] Seller found by name:", {
			orgId,
			sellerId: existingSeller.id,
		});
		return { sellerId: existingSeller.id, wasCreated: false };
	}
	console.log("[INFO] [SALES_BULK] Seller not found, creating new one:", {
		orgId,
		sellerName: normalized,
	});
	const insertedSeller = await tx
		.insert(sellers)
		.values({
			organizacaoId: orgId,
			nome: normalized,
			identificador: normalized,
		})
		.returning({ id: sellers.id });
	const sellerId = insertedSeller[0]?.id;
	if (!sellerId) throw new createHttpError.InternalServerError("Erro ao criar vendedor da importação.");

	return { sellerId, wasCreated: true };
}

async function resolveOrCreatePartner({
	tx,
	orgId,
	partnerNameOrIdentifier,
}: {
	tx: DBTransaction;
	orgId: string;
	partnerNameOrIdentifier?: string | null;
}) {
	const normalized = normalizeOptionalText(partnerNameOrIdentifier);
	if (!normalized || normalized === "N/A" || normalized === "0") return null;

	const existingPartner = await tx.query.partners.findFirst({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.organizacaoId, orgId),
				operators.or(operators.eq(fields.identificador, normalized), operators.eq(fields.nome, normalized)),
			),
		columns: { id: true },
	});
	if (existingPartner) {
		console.log("[INFO] [SALES_BULK] Partner found by name or identifier:", {
			orgId,
			partnerId: existingPartner.id,
		});
		return { partnerId: existingPartner.id, wasCreated: false };
	}
	console.log("[INFO] [SALES_BULK] Partner not found, creating new one:", {
		orgId,
		partnerNameOrIdentifier: normalized,
	});
	const partnerDocument = formatToCPForCNPJ(normalized);
	const linkage = await linkPartnerToClient({
		tx,
		orgId,
		partner: {
			nome: normalized,
			cpfCnpj: partnerDocument || null,
		},
		createClientIfNotFound: true,
	});

	const insertedPartner = await tx
		.insert(partners)
		.values({
			organizacaoId: orgId,
			identificador: normalized,
			nome: normalized,
			cpfCnpj: partnerDocument || null,
			clienteId: linkage.clientId,
		})
		.returning({ id: partners.id });
	const partnerId = insertedPartner[0]?.id;
	if (!partnerId) throw new createHttpError.InternalServerError("Erro ao criar parceiro da importação.");

	return { partnerId, wasCreated: true };
}

async function bulkCreateSales({
	input,
	sessionUserId,
	orgId,
}: {
	input: TBulkCreateSalesInput;
	sessionUserId: string;
	orgId: string;
}): Promise<TBulkCreateSalesOutput> {
	const startedAt = Date.now();
	let createdClientsCount = 0;
	let createdSellersCount = 0;
	let createdPartnersCount = 0;
	let insertedCount = 0;
	let skippedCount = 0;
	const errors: Array<{ row: number; message: string }> = [];

	const existingCashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, operators) => operators.eq(fields.organizacaoId, orgId),
		columns: { id: true },
	});
	const cashbackProgramId = existingCashbackProgram?.id;
	console.log(`${LOG_PREFIX} Iniciando importação`, {
		orgId,
		sessionUserId,
		totalRows: input.sales.length,
		cashbackProgramId: cashbackProgramId ?? null,
	});

	for (let rowIndex = 0; rowIndex < input.sales.length; rowIndex++) {
		const row = input.sales[rowIndex];
		console.log(`${LOG_PREFIX} Processando linha`, {
			orgId,
			sessionUserId,
			progress: `${rowIndex + 1}/${input.sales.length}`,
			rowNumber: row.rowIndex,
			clienteNome: row.clienteNome,
			valorTotal: row.valorTotal,
			dataVenda: row.dataVenda,
		});

		try {
			await db.transaction(async (tx) => {
				const clientResolution = await resolveOrCreateClient({ tx, orgId, row, cashbackProgramId });
				const clientId = clientResolution.clientId;
				if (clientResolution.wasCreated) createdClientsCount += 1;

				const sellerResolution = await resolveOrCreateSeller({ tx, orgId, sellerName: row.vendedorNome });
				const partnerResolution = await resolveOrCreatePartner({ tx, orgId, partnerNameOrIdentifier: row.parceiroNomeOuIdentificador });
				if (sellerResolution?.wasCreated) createdSellersCount += 1;
				if (partnerResolution?.wasCreated) createdPartnersCount += 1;
				if (clientResolution.wasCreated || sellerResolution?.wasCreated || partnerResolution?.wasCreated) {
					console.log(`${LOG_PREFIX} Entidades criadas para linha`, {
						orgId,
						rowNumber: row.rowIndex,
						clientCreated: clientResolution.wasCreated,
						sellerCreated: !!sellerResolution?.wasCreated,
						partnerCreated: !!partnerResolution?.wasCreated,
					});
				}

				const saleDate = new Date(row.dataVenda);
				const dedupeClientRef = clientId || row.clienteNome.trim();
				const dedupeKey = getBulkDedupeKey({
					clientRef: dedupeClientRef,
					saleDate,
					totalValue: row.valorTotal,
				});

				const existingSale = await tx.query.sales.findFirst({
					where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, orgId), operators.eq(fields.chave, dedupeKey)),
					columns: { id: true },
				});
				if (existingSale) {
					skippedCount += 1;
					console.log(`${LOG_PREFIX} Linha ignorada por duplicidade`, {
						orgId,
						rowNumber: row.rowIndex,
						dedupeKey,
						existingSaleId: existingSale.id,
					});
					return;
				}

				const externalId = `BULK-SHEET-${Date.now()}-${row.rowIndex}-${Math.random().toString(36).slice(2, 8)}`;

				const insertedSale = await tx
					.insert(sales)
					.values({
						organizacaoId: orgId,
						clienteId: clientId,
						idExterno: externalId,
						valorTotal: row.valorTotal,
						custoTotal: 0,
						vendedorNome: normalizeOptionalText(row.vendedorNome) ?? "N/A",
						vendedorId: sellerResolution?.sellerId ?? null,
						parceiro: normalizeOptionalText(row.parceiroNomeOuIdentificador) ?? "N/A",
						parceiroId: partnerResolution?.partnerId ?? null,
						chave: dedupeKey,
						documento: "N/A",
						modelo: "DV",
						movimento: "RECEITAS",
						natureza: "SN01",
						serie: "0",
						situacao: "00",
						tipo: "Venda de produtos",
						canal: "Importação de planilha",
						entregaModalidade: "PRESENCIAL",
						dataVenda: saleDate,
						processamentoOrigem: "EXTERNO",
					})
					.returning({ id: sales.id });

				const saleId = insertedSale[0]?.id;
				if (!saleId) throw new createHttpError.InternalServerError("Erro ao inserir venda da importação.");

				await tx
					.update(clients)
					.set({
						ultimaCompraData: saleDate,
						ultimaCompraId: saleId,
						// primeiraCompraData: , TODO: FIX THIS
						// primeiraCompraId: sql`COALESCE(${clients.primeiraCompraId}, ${saleId})`,
					})
					.where(and(eq(clients.id, clientId), eq(clients.organizacaoId, orgId)));

				insertedCount += 1;
				console.log(`${LOG_PREFIX} Venda inserida`, {
					orgId,
					rowNumber: row.rowIndex,
					saleId,
					clientId,
					dedupeKey,
				});
			});
		} catch (error) {
			console.error(`${LOG_PREFIX} Erro ao processar linha`, {
				orgId,
				sessionUserId,
				rowNumber: row.rowIndex,
				error,
			});
			errors.push({
				row: row.rowIndex,
				message: error instanceof Error ? error.message : "Erro desconhecido ao importar linha.",
			});
			skippedCount += 1;
		}
	}

	console.log(`${LOG_PREFIX} Importação finalizada`, {
		orgId,
		sessionUserId,
		elapsedMs: Date.now() - startedAt,
		totalRows: input.sales.length,
		insertedCount,
		skippedCount,
		createdClientsCount,
		createdSellersCount,
		createdPartnersCount,
		errorsCount: errors.length,
	});

	return {
		data: {
			insertedCount,
			skippedCount,
			createdClientsCount,
			createdSellersCount,
			createdPartnersCount,
			errors,
		},
		message:
			insertedCount > 0
				? `${insertedCount} venda(s) importada(s) com sucesso.${skippedCount > 0 ? ` ${skippedCount} registro(s) ignorado(s).` : ""}`
				: "Nenhuma venda foi importada.",
	};
}

const bulkCreateSalesRoute: NextApiHandler<PostResponse> = async (req, res) => {
	const routeStartedAt = Date.now();
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = BulkCreateSalesInputSchema.parse(req.body);
	console.log(`${LOG_PREFIX} Requisição recebida`, {
		orgId: userOrgId,
		sessionUserId: sessionUser.user.id,
		totalRows: input.sales.length,
	});

	const result = await bulkCreateSales({
		input,
		sessionUserId: sessionUser.user.id,
		orgId: userOrgId,
	});

	console.log(`${LOG_PREFIX} Requisição concluída`, {
		orgId: userOrgId,
		sessionUserId: sessionUser.user.id,
		elapsedMs: Date.now() - routeStartedAt,
		insertedCount: result.data.insertedCount,
		skippedCount: result.data.skippedCount,
	});

	return res.status(201).json(result);
};

export default apiHandler({
	POST: bulkCreateSalesRoute,
});
