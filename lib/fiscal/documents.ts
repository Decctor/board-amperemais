import { db } from "@/services/drizzle";
import { fiscalDocumentEvents, fiscalDocuments } from "@/services/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { getErrorMessage } from "../errors";
import { buildFiscalReference } from "./constants";
import { formatValidationMessages, hasBlockingErrors, type TFiscalTaxGroupWithRules } from "./engine";
import { FiscalReadinessError } from "./errors";
import { computeSaleTaxation } from "./taxation-context";
import { ManualFiscalProvider } from "./providers/manual";
import { NuvemFiscalProvider } from "./providers/nuvem-fiscal";
import { findActiveFiscalSeries, findDefaultOperationProfileForType, loadFiscalOrganization, reserveFiscalSeriesNumber } from "./settings";
import { downloadStoredFiscalAsset, getFiscalAssetContentType, storeFiscalAsset, type TFiscalAssetType } from "./storage";
import type {
	IFiscalProvider,
	TCancelDocumentInput,
	TEmitirDocumentoInput,
	TProviderDocumentDetails,
	TSaleForFiscal,
	TFiscalSaleContext,
	TSyncDocumentInput,
} from "./types";

function resolveFiscalProvider(fiscalProvedor: "MANUAL" | "NUVEM_FISCAL" | null | undefined): IFiscalProvider {
	return fiscalProvedor === "NUVEM_FISCAL" ? new NuvemFiscalProvider() : new ManualFiscalProvider();
}

function serializeJson(value: unknown) {
	return value === undefined || value === null ? null : JSON.stringify(value);
}

export async function findFiscalDocumentByReference({ organizacaoId, referencia }: { organizacaoId: string; referencia: string }) {
	return db.query.fiscalDocuments.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, organizacaoId), operators.eq(fields.referencia, referencia)),
	});
}

type GetFiscalDocumentByIdParams = {
	documentId: string;
	organizationId: string;
};
export async function getFiscalDocumentById({ documentId, organizationId }: GetFiscalDocumentByIdParams) {
	return db.query.fiscalDocuments.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.id, documentId), operators.eq(fields.organizacaoId, organizationId)),
	});
}
export async function listFiscalDocuments({ organizacaoId, page = 1, search }: { organizacaoId: string; page?: number; search?: string | null }) {
	const PAGE_SIZE = 25;
	const offset = (page - 1) * PAGE_SIZE;
	const searchLike = search?.trim() ? `%${search.trim()}%` : null;
	const whereClause = searchLike
		? and(
				eq(fiscalDocuments.organizacaoId, organizacaoId),
				sql`(${fiscalDocuments.referencia} ilike ${searchLike} or ${fiscalDocuments.chaveAcesso} ilike ${searchLike})`,
			)
		: eq(fiscalDocuments.organizacaoId, organizacaoId);

	const [documents, [{ count }]] = await Promise.all([
		db.query.fiscalDocuments.findMany({
			where: whereClause,
			with: {
				venda: { columns: { id: true, valorTotal: true, dataVenda: true, status: true } },
			},
			orderBy: (fields, operators) => operators.desc(fields.dataInsercao),
			offset,
			limit: PAGE_SIZE,
		}),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(fiscalDocuments)
			.where(whereClause),
	]);

	return {
		documents,
		documentsMatched: count ?? 0,
		totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
	};
}

type ListFiscalDocumentEventsParams = {
	documentId: string;
	organizationId: string;
};
export async function listFiscalDocumentEvents({ documentId, organizationId }: ListFiscalDocumentEventsParams) {
	const documentBelongsToOrganization = await db.query.fiscalDocuments.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.id, documentId), operators.eq(fields.organizacaoId, organizationId)),
		columns: { id: true },
	});
	if (!documentBelongsToOrganization) throw new createHttpError.NotFound("Documento fiscal nao encontrado.");
	return db.query.fiscalDocumentEvents.findMany({
		where: (fields, operators) => operators.eq(fields.documentoFiscalId, documentId),
		orderBy: (fields, operators) => operators.desc(fields.dataInsercao),
		with: {
			autor: {
				columns: { id: true, nome: true, avatarUrl: true },
			},
		},
	});
}

async function patchFiscalDocument(documentoId: string, patch: Partial<typeof fiscalDocuments.$inferInsert>) {
	const [updated] = await db.update(fiscalDocuments).set(patch).where(eq(fiscalDocuments.id, documentoId)).returning();
	return updated;
}

async function addFiscalDocumentEvent({
	documentoFiscalId,
	tipo,
	descricao,
	payload,
	autorId,
}: {
	documentoFiscalId: string;
	tipo: typeof fiscalDocumentEvents.$inferInsert.tipo;
	descricao?: string | null;
	payload?: unknown;
	autorId?: string | null;
}) {
	const [event] = await db
		.insert(fiscalDocumentEvents)
		.values({
			documentoFiscalId,
			tipo,
			descricao: descricao ?? null,
			payload: serializeJson(payload),
			autorId: autorId ?? null,
		})
		.returning();
	return event;
}

async function applyProviderDocumentDetails(documentoId: string, details: TProviderDocumentDetails) {
	return patchFiscalDocument(documentoId, {
		status: details.status,
		statusInterno: details.statusInterno,
		ambiente: details.ambiente,
		provedorDocumentoId: details.id,
		provedorStatus: details.status,
		chaveAcesso: details.chaveAcesso ?? null,
		numero: details.numero ?? null,
		serie: details.serie ?? null,
		protocolo: details.protocolo ?? null,
		mensagens: (details.mensagens as string[] | undefined) ?? [],
		provedorPayload: serializeJson(details.provedorPayload),
		provedorRetorno: serializeJson(details.provedorRetorno),
		dataEmissao: details.dataEmissao ?? null,
		dataAutorizacao: details.dataAutorizacao ?? null,
		dataCancelamento: details.dataCancelamento ?? null,
		dataUltimaSincronizacao: new Date(),
	});
}

async function createOrUpdateDraftDocument({
	input,
	referencia,
	statusInterno,
}: {
	input: TEmitirDocumentoInput;
	referencia: string;
	statusInterno: "RASCUNHO" | "PRONTO_PARA_ENVIO";
}) {
	const existing = await findFiscalDocumentByReference({ organizacaoId: input.organizacaoId, referencia });
	if (existing) return existing;

	const [inserted] = await db
		.insert(fiscalDocuments)
		.values({
			organizacaoId: input.organizacaoId,
			vendaId: input.vendaId,
			lancamentoContabilId: input.lancamentoContabilId ?? null,
			tipo: input.tipo,
			status: "PENDENTE",
			statusInterno,
			referencia,
		})
		.returning();

	return inserted;
}

type LoadSaleForFiscalParams = {
	saleId: string;
	organizationId: string;
};
async function loadSaleForFiscal({ saleId, organizationId }: LoadSaleForFiscalParams): Promise<TSaleForFiscal | null> {
	const sale = await db.query.sales.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.id, saleId), operators.eq(fields.organizacaoId, organizationId)),
		with: {
			itens: true,
			cliente: true,
			entregaLocalizacao: true,
		},
	});

	return sale ?? null;
}

async function loadProductFiscalProfilesForSale(venda: TSaleForFiscal) {
	if (venda.itens.length === 0) return [];
	const produtoIds = [...new Set(venda.itens.map((item) => item.produtoId))];
	return db.query.productFiscalProfiles.findMany({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.organizacaoId, venda.organizacaoId ?? ""),
				operators.inArray(fields.produtoId, produtoIds),
				operators.isNull(fields.produtoVarianteId),
			),
	});
}

async function loadTaxGroupsForProfiles(perfisProdutos: { grupoTributarioId: string | null }[]): Promise<TFiscalTaxGroupWithRules[]> {
	const grupoIds = [...new Set(perfisProdutos.map((perfil) => perfil.grupoTributarioId).filter((id): id is string => !!id))];
	if (grupoIds.length === 0) return [];
	return db.query.fiscalTaxGroups.findMany({
		where: (fields) => inArray(fields.id, grupoIds),
		with: { regras: true },
	});
}

function buildDestinatarioSnapshot(venda: TSaleForFiscal | null) {
	if (!venda?.cliente) return null;
	const address = venda.entregaLocalizacao ?? venda.cliente;
	return {
		nome: venda.cliente.nome,
		cpfCnpj: venda.cliente.cpfCnpj,
		inscricaoEstadual: venda.cliente.inscricaoEstadual,
		indicadorInscricaoEstadual: venda.cliente.indicadorInscricaoEstadual,
		email: venda.cliente.email,
		endereco: {
			cep: address?.localizacaoCep ?? null,
			estado: address?.localizacaoEstado ?? null,
			cidade: address?.localizacaoCidade ?? null,
			bairro: address?.localizacaoBairro ?? null,
			logradouro: address?.localizacaoLogradouro ?? null,
			numero: address?.localizacaoNumero ?? null,
			complemento: address?.localizacaoComplemento ?? null,
		},
	};
}

function assertFiscalReadiness(context: TFiscalSaleContext) {
	const fiscalConfig = context.organizacao.fiscalConfiguracao;
	if (!fiscalConfig) throw new FiscalReadinessError("Configuracao fiscal da organizacao nao encontrada.");
	if (!context.serie?.id) throw new FiscalReadinessError("Serie fiscal ativa nao encontrada para esta emissao.");
	if (!context.operacao?.id) throw new FiscalReadinessError("Perfil de operacao fiscal nao encontrado para esta emissao.");
	if (!fiscalConfig.cpfCnpj) throw new FiscalReadinessError("CPF/CNPJ fiscal da organizacao nao configurado.");
	if (!fiscalConfig.nomeRazaoSocial) throw new FiscalReadinessError("Razao social fiscal da organizacao nao configurada.");

	if (context.operacao.tipoDocumento === "NFCE") {
		if (!fiscalConfig.nuvemFiscal?.nfce?.csc) throw new FiscalReadinessError("CSC da NFC-e nao configurado.");
		if (!fiscalConfig.nuvemFiscal?.nfce?.idCsc) throw new FiscalReadinessError("ID CSC da NFC-e nao configurado.");
	}

	if (context.organizacao.fiscalProvedor === "NUVEM_FISCAL" && !fiscalConfig.nuvemFiscal?.api?.apiToken) {
		throw new FiscalReadinessError("Token da Nuvem Fiscal nao configurado para esta organizacao.");
	}

	if (context.perfisProdutos.length === 0) throw new FiscalReadinessError("Nenhum perfil fiscal de produto encontrado para a venda.");
}

async function buildSaleFiscalContext(input: TEmitirDocumentoInput): Promise<TFiscalSaleContext> {
	const venda = await loadSaleForFiscal({ saleId: input.vendaId, organizationId: input.organizacaoId });
	if (!venda) throw new createHttpError.NotFound("Venda nao encontrada para emissao fiscal.");

	const organizacao = await loadFiscalOrganization(input.organizacaoId);
	if (!organizacao) throw new createHttpError.NotFound("Organizacao nao encontrada para emissao fiscal.");

	const ambiente = organizacao.fiscalConfiguracao?.ambiente ?? "HOMOLOGACAO";
	const operacaoDefaultId = organizacao.fiscalConfiguracao?.operacaoPadraoPorTipo?.[input.tipo] ?? null;
	const operacao = await findDefaultOperationProfileForType({
		organizacaoId: input.organizacaoId,
		tipoDocumento: input.tipo,
		profileId: operacaoDefaultId,
	});
	if (!operacao) throw new createHttpError.BadRequest("Perfil de operacao fiscal nao configurado.");

	const serie = operacao.seriePadrao ?? (await findActiveFiscalSeries({ organizacaoId: input.organizacaoId, tipoDocumento: input.tipo, ambiente }));
	if (!serie) throw new createHttpError.BadRequest("Serie fiscal nao configurada.");

	const perfisProdutos = await loadProductFiscalProfilesForSale(venda);
	const gruposTributarios = await loadTaxGroupsForProfiles(perfisProdutos);

	return {
		venda,
		organizacao,
		serie,
		operacao,
		perfisProdutos,
		gruposTributarios,
		destinatarioSnapshot: buildDestinatarioSnapshot(venda),
	};
}

// Validacao tributaria local (motor fiscal) antes de enviar ao provedor.
// Bloqueia a emissao quando ha erros impeditivos detectaveis sem custo de rejeicao SEFAZ.
function assertFiscalTaxationValid(context: TFiscalSaleContext) {
	const taxation = computeSaleTaxation(context);
	if (hasBlockingErrors(taxation.erros)) {
		throw new FiscalReadinessError(`Validacao fiscal falhou: ${formatValidationMessages(taxation.erros).join("; ")}`);
	}
}

async function persistAuthorizedAssets(documento: typeof fiscalDocuments.$inferSelect, organizacaoId: string) {
	const organizacao = await loadFiscalOrganization(organizacaoId);
	if (!organizacao) return null;
	const provider = resolveFiscalProvider(organizacao.fiscalProvedor);
	const [xmlBuffer, pdfBuffer] = await Promise.all([provider.baixarXml(documento, organizacao), provider.baixarPdf(documento, organizacao)]);
	const xmlStoragePath = xmlBuffer
		? await storeFiscalAsset({ documentoId: documento.id, tipo: documento.tipo, asset: "xml", buffer: xmlBuffer })
		: null;
	const pdfStoragePath = pdfBuffer
		? await storeFiscalAsset({ documentoId: documento.id, tipo: documento.tipo, asset: "pdf", buffer: pdfBuffer })
		: null;
	return patchFiscalDocument(documento.id, {
		xmlStoragePath,
		pdfStoragePath,
	});
}

export async function emitFiscalDocument(input: TEmitirDocumentoInput) {
	const referencia = buildFiscalReference(input);
	const existing = await findFiscalDocumentByReference({ organizacaoId: input.organizacaoId, referencia });
	if (existing?.statusInterno === "AUTORIZADO" || existing?.statusInterno === "EM_PROCESSAMENTO") {
		return {
			documentoId: existing.id,
			status: existing.status,
			statusInterno: existing.statusInterno,
			chaveAcesso: existing.chaveAcesso,
			numero: existing.numero,
			serie: existing.serie,
			protocolo: existing.protocolo,
		};
	}

	const documento = await createOrUpdateDraftDocument({ input, referencia, statusInterno: "RASCUNHO" });
	try {
		const context = await buildSaleFiscalContext(input);
		assertFiscalReadiness(context);
		assertFiscalTaxationValid(context);
		const reservedNumber = documento.numero ? Number(documento.numero) : await reserveFiscalSeriesNumber(context.serie.id);

		await patchFiscalDocument(documento.id, {
			statusInterno: "PRONTO_PARA_ENVIO",
			ambiente: context.organizacao.fiscalConfiguracao?.ambiente ?? "HOMOLOGACAO",
			referencia,
			provedor: context.organizacao.fiscalProvedor ?? "MANUAL",
			serie: context.serie.serie,
			numero: String(reservedNumber),
			snapshotOrigemVenda: JSON.stringify({
				venda: context.venda,
				destinatario: context.destinatarioSnapshot,
			}),
			tentativasEnvio: (documento.tentativasEnvio ?? 0) + 1,
		});

		await addFiscalDocumentEvent({
			documentoFiscalId: documento.id,
			tipo: "CRIADO",
			descricao: `Documento fiscal preparado para emissao ${input.origem.toLowerCase()}.`,
			autorId: input.autorId ?? null,
		});
		await addFiscalDocumentEvent({
			documentoFiscalId: documento.id,
			tipo: "ENVIO_SOLICITADO",
			descricao: "Envio ao provedor fiscal solicitado.",
			autorId: input.autorId ?? null,
		});

		const provider = resolveFiscalProvider(context.organizacao.fiscalProvedor);
		const latestDocument = (await findFiscalDocumentByReference({ organizacaoId: input.organizacaoId, referencia })) ?? documento;
		const providerDetails = await provider.emitirDocumento(context, latestDocument);
		const updatedDocument = await applyProviderDocumentDetails(documento.id, providerDetails);

		await addFiscalDocumentEvent({
			documentoFiscalId: documento.id,
			tipo: providerDetails.statusInterno === "AUTORIZADO" ? "AUTORIZADO" : providerDetails.statusInterno === "REJEITADO" ? "REJEITADO" : "ERRO",
			descricao: `Documento retornou do provedor com status ${providerDetails.statusInterno}.`,
			payload: providerDetails.provedorRetorno,
			autorId: input.autorId ?? null,
		});

		if (providerDetails.statusInterno === "AUTORIZADO" && updatedDocument) {
			await persistAuthorizedAssets(updatedDocument, context.organizacao.id);
		}

		const finalDocument = updatedDocument ?? (await findFiscalDocumentByReference({ organizacaoId: input.organizacaoId, referencia })) ?? documento;
		return {
			documentoId: finalDocument.id,
			status: finalDocument.status,
			statusInterno: finalDocument.statusInterno,
			chaveAcesso: finalDocument.chaveAcesso,
			numero: finalDocument.numero,
			serie: finalDocument.serie,
			protocolo: finalDocument.protocolo,
		};
	} catch (error) {
		const message = getErrorMessage(error);
		await patchFiscalDocument(documento.id, {
			statusInterno: "ERRO",
			mensagens: [message],
		});
		await addFiscalDocumentEvent({
			documentoFiscalId: documento.id,
			tipo: "ERRO",
			descricao: message,
			autorId: input.autorId ?? null,
		});
		throw error;
	}
}

export async function syncFiscalDocument(input: TSyncDocumentInput) {
	const documento = await getFiscalDocumentById({ documentId: input.documentId, organizationId: input.organizationId });
	if (!documento) throw new createHttpError.NotFound("Documento fiscal nao encontrado.");

	const organizacao = await loadFiscalOrganization(documento.organizacaoId);
	if (!organizacao) throw new createHttpError.NotFound("Organizacao do documento fiscal nao encontrada.");

	const provider = resolveFiscalProvider(organizacao.fiscalProvedor);
	const providerDetails = await provider.sincronizarDocumento(documento, organizacao);
	const updated = await applyProviderDocumentDetails(documento.id, providerDetails);

	await addFiscalDocumentEvent({
		documentoFiscalId: documento.id,
		tipo: "SINCRONIZADO",
		descricao: "Documento fiscal sincronizado manualmente.",
		payload: providerDetails.provedorRetorno,
		autorId: input.authorId ?? null,
	});

	if (providerDetails.statusInterno === "AUTORIZADO" && updated) {
		await persistAuthorizedAssets(updated, organizacao.id);
	}

	return {
		documentoId: updated?.id ?? documento.id,
		status: updated?.status ?? providerDetails.status,
		statusInterno: updated?.statusInterno ?? providerDetails.statusInterno,
	};
}

export async function cancelFiscalDocument(input: TCancelDocumentInput) {
	const documento = await getFiscalDocumentById({ documentId: input.documentId, organizationId: input.organizationId });
	if (!documento) throw new createHttpError.NotFound("Documento fiscal nao encontrado.");

	const organizacao = await loadFiscalOrganization(documento.organizacaoId);
	if (!organizacao) throw new createHttpError.NotFound("Organizacao do documento fiscal nao encontrada.");

	await addFiscalDocumentEvent({
		documentoFiscalId: documento.id,
		tipo: "CANCELAMENTO_SOLICITADO",
		descricao: input.reason,
		autorId: input.authorId ?? null,
	});

	const provider = resolveFiscalProvider(organizacao.fiscalProvedor);
	const providerDetails = await provider.cancelarDocumento(input, documento, organizacao);
	const updated = await applyProviderDocumentDetails(documento.id, providerDetails);

	await addFiscalDocumentEvent({
		documentoFiscalId: documento.id,
		tipo: providerDetails.statusInterno === "CANCELADO" ? "CANCELADO" : "ERRO",
		descricao: providerDetails.statusInterno === "CANCELADO" ? "Documento cancelado com sucesso." : "Falha ao cancelar documento.",
		payload: providerDetails.provedorRetorno,
		autorId: input.authorId ?? null,
	});

	return {
		documentoId: updated?.id ?? documento.id,
		status: updated?.status ?? providerDetails.status,
		statusInterno: updated?.statusInterno ?? providerDetails.statusInterno,
	};
}

type GetFiscalDocumentAssetParams = {
	documentId: string;
	organizationId: string;
	asset: TFiscalAssetType;
};
export async function getFiscalDocumentAsset({ documentId, organizationId, asset }: GetFiscalDocumentAssetParams) {
	const document = await getFiscalDocumentById({ documentId, organizationId });
	if (!document) throw new createHttpError.NotFound("Documento fiscal nao encontrado.");

	const path = asset === "xml" ? document.xmlStoragePath : document.pdfStoragePath;
	if (path) {
		return {
			buffer: await downloadStoredFiscalAsset(path),
			contentType: getFiscalAssetContentType(asset),
		};
	}

	const organization = await loadFiscalOrganization(document.organizacaoId);
	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");

	const provider = resolveFiscalProvider(organization.fiscalProvedor);
	const buffer = asset === "xml" ? await provider.baixarXml(document, organization) : await provider.baixarPdf(document, organization);
	if (!buffer) throw new createHttpError.NotFound("Arquivo fiscal nao encontrado.");

	const storedPath = await storeFiscalAsset({ documentoId: document.id, tipo: document.tipo, asset, buffer });
	await patchFiscalDocument(document.id, asset === "xml" ? { xmlStoragePath: storedPath } : { pdfStoragePath: storedPath });

	return {
		buffer,
		contentType: getFiscalAssetContentType(asset),
	};
}

type SyncPendingFiscalDocumentsParams = {
	organizationId: string;
	limit?: number;
};
export async function syncPendingFiscalDocuments({ organizationId, limit = 20 }: SyncPendingFiscalDocumentsParams) {
	const pendingDocuments = await db.query.fiscalDocuments.findMany({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.organizacaoId, organizationId),
				operators.inArray(fields.statusInterno, ["EM_PROCESSAMENTO", "CANCELAMENTO_PENDENTE"]),
			),
		orderBy: (fields, operators) => operators.asc(fields.dataInsercao),
		limit,
	});

	const results = [];
	for (const document of pendingDocuments) {
		results.push(await syncFiscalDocument({ organizationId, documentId: document.id }));
	}
	return results;
}
