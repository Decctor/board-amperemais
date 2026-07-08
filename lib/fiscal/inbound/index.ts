import { getErrorMessage } from "@/lib/errors";
import type { TFiscalInboundManifestEventEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { fiscalInboundCursors, fiscalInboundDocuments, suppliers } from "@/services/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { loadFiscalOrganization } from "../settings";
import { downloadStoredFiscalAsset, getFiscalAssetContentType, storeFiscalAsset } from "../storage";
import type { TFiscalOrganization } from "../types";
import { resolveInboundProvider } from "./providers";
import type { IFiscalInboundProvider, TInboundDistribuicaoDocumento } from "./types";

const MAX_PAGES = 10;

async function getOrCreateCursor(organizacaoId: string) {
	const existing = await db.query.fiscalInboundCursors.findFirst({ where: (fields, operators) => operators.eq(fields.organizacaoId, organizacaoId) });
	if (existing) return existing;
	const [created] = await db.insert(fiscalInboundCursors).values({ organizacaoId }).returning();
	return created;
}

async function resolveOrCreateSupplier(organizacaoId: string, cpfCnpj?: string | null, nome?: string | null): Promise<string | null> {
	const digits = (cpfCnpj ?? "").replace(/\D/g, "");
	if (!digits) return null;
	const existing = await db.query.suppliers.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, organizacaoId), operators.eq(fields.cpfCnpj, digits)),
	});
	if (existing) return existing.id;
	const [created] = await db.insert(suppliers).values({ organizacaoId, nome: nome?.trim() || "Fornecedor sem nome", cpfCnpj: digits }).returning({ id: suppliers.id });
	return created?.id ?? null;
}

// Insere uma nota recebida se ainda nao existir (dedupe por chave). Retorna true se criou.
async function upsertInboundDocument(organizacaoId: string, doc: TInboundDistribuicaoDocumento): Promise<boolean> {
	if (!doc.chaveAcesso) return false;
	const existing = await db.query.fiscalInboundDocuments.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, organizacaoId), operators.eq(fields.chaveAcesso, doc.chaveAcesso)),
		columns: { id: true },
	});
	if (existing) return false;

	const fornecedorId = await resolveOrCreateSupplier(organizacaoId, doc.emitenteCnpj, doc.emitenteNome);
	let xmlStoragePath: string | null = null;
	if (doc.completo && doc.xml) {
		xmlStoragePath = await storeFiscalAsset({ documentoId: `inbound-${doc.chaveAcesso}`, tipo: "entrada", asset: "xml", buffer: doc.xml });
	}

	const [inserted] = await db
		.insert(fiscalInboundDocuments)
		.values({
			organizacaoId,
			fornecedorId,
			chaveAcesso: doc.chaveAcesso,
			nsu: doc.nsu,
			completo: doc.completo,
			emitenteCnpj: doc.emitenteCnpj ? doc.emitenteCnpj.replace(/\D/g, "") : null,
			emitenteNome: doc.emitenteNome ?? null,
			valorTotal: doc.valorTotal ?? null,
			dataEmissao: doc.dataEmissao ?? null,
			situacao: doc.situacao ?? null,
			xmlStoragePath,
			resumoPayload: doc.resumoPayload ? JSON.stringify(doc.resumoPayload) : null,
		})
		// Corrida entre execucoes do cron: a chave ja inserida por outro processo nao conta como nova.
		.onConflictDoNothing({ target: [fiscalInboundDocuments.organizacaoId, fiscalInboundDocuments.chaveAcesso] })
		.returning({ id: fiscalInboundDocuments.id });
	return !!inserted;
}

async function autoManifestCiencia(organizacaoId: string, organizacao: TFiscalOrganization, provider: IFiscalInboundProvider) {
	const pendentes = await db.query.fiscalInboundDocuments.findMany({
		where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, organizacaoId), operators.isNull(fields.manifestacaoAtual)),
		limit: 50,
	});
	for (const doc of pendentes) {
		try {
			await provider.manifestarDocumento({ chaveAcesso: doc.chaveAcesso, evento: "CIENCIA" }, organizacao);
			await db.update(fiscalInboundDocuments).set({ manifestacaoAtual: "CIENCIA" }).where(eq(fiscalInboundDocuments.id, doc.id));
		} catch (error) {
			// Tenta de novo na proxima rodada, mas registra o motivo (ex.: evento ja manifestado
			// por outro sistema) para a falha nao ficar invisivel.
			console.warn(`[FISCAL_INBOUND] Falha ao manifestar ciencia da nota ${doc.chaveAcesso} (org ${organizacaoId}): ${getErrorMessage(error)}`);
		}
	}
}

// Varre a Distribuicao DF-e incrementalmente (por NSU) e armazena novas notas. Auto-ciencia se habilitada.
export async function pollInboundDocuments({ organizationId }: { organizationId: string }) {
	const organizacao = await loadFiscalOrganization(organizationId);
	if (!organizacao?.fiscalConfiguracao?.cpfCnpj) return { novos: 0 };

	const provider = resolveInboundProvider();
	const cursor = await getOrCreateCursor(organizationId);
	let ultNSU = cursor.ultNSU;
	let novos = 0;

	for (let i = 0; i < MAX_PAGES; i++) {
		const result = await provider.consultarDistribuicao({ ultNSU }, organizacao);
		for (const doc of result.documentos) {
			if (await upsertInboundDocument(organizationId, doc)) novos++;
		}
		ultNSU = result.ultNSU;
		await db.update(fiscalInboundCursors).set({ ultNSU: result.ultNSU, maxNSU: result.maxNSU, dataAtualizacao: new Date() }).where(eq(fiscalInboundCursors.id, cursor.id));
		if (result.documentos.length === 0) break;
		try {
			if (BigInt(result.ultNSU) >= BigInt(result.maxNSU)) break;
		} catch {
			break;
		}
	}

	if (organizacao.fiscalConfiguracao.dfeAutoCiencia) await autoManifestCiencia(organizationId, organizacao, provider);
	return { novos };
}

export async function pollInboundForAllOrganizations({ limit = 50 }: { limit?: number } = {}) {
	const orgs = await db.query.organizations.findMany({
		where: (fields, operators) => operators.isNotNull(fields.fiscalConfiguracao),
		columns: { id: true },
		limit,
	});
	let totalNovos = 0;
	for (const org of orgs) {
		try {
			const { novos } = await pollInboundDocuments({ organizationId: org.id });
			totalNovos += novos;
		} catch (error) {
			// Segue para a proxima organizacao, mas registra: uma organizacao quebrada nao pode
			// falhar silenciosamente para sempre.
			console.error(`[FISCAL_INBOUND] Falha ao consultar distribuicao DF-e da organizacao ${org.id}: ${getErrorMessage(error)}`);
		}
	}
	return { organizacoes: orgs.length, novos: totalNovos };
}

export async function manifestInboundDocument({
	organizationId,
	inboundId,
	evento,
	justificativa,
}: {
	organizationId: string;
	inboundId: string;
	evento: TFiscalInboundManifestEventEnum;
	justificativa?: string | null;
}) {
	const doc = await db.query.fiscalInboundDocuments.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, organizationId), operators.eq(fields.id, inboundId)),
	});
	if (!doc) throw new createHttpError.NotFound("Nota recebida nao encontrada.");

	const organizacao = await loadFiscalOrganization(organizationId);
	if (!organizacao) throw new createHttpError.NotFound("Organizacao nao encontrada.");

	const provider = resolveInboundProvider();
	const result = await provider.manifestarDocumento({ chaveAcesso: doc.chaveAcesso, evento, justificativa }, organizacao);
	await db.update(fiscalInboundDocuments).set({ manifestacaoAtual: evento }).where(eq(fiscalInboundDocuments.id, doc.id));

	return { inboundId: doc.id, evento, protocolo: result.protocolo ?? null };
}

export async function listInboundDocuments({ organizationId, page = 1 }: { organizationId: string; page?: number }) {
	const PAGE_SIZE = 25;
	const offset = (page - 1) * PAGE_SIZE;
	const whereClause = eq(fiscalInboundDocuments.organizacaoId, organizationId);

	const [documents, [{ count }]] = await Promise.all([
		db.query.fiscalInboundDocuments.findMany({
			where: whereClause,
			with: { fornecedor: { columns: { id: true, nome: true, cpfCnpj: true } } },
			orderBy: (fields, operators) => operators.desc(fields.dataInsercao),
			offset,
			limit: PAGE_SIZE,
		}),
		db.select({ count: sql<number>`count(*)::int` }).from(fiscalInboundDocuments).where(whereClause),
	]);

	return { documents, documentsMatched: count ?? 0, totalPages: Math.ceil((count ?? 0) / PAGE_SIZE) };
}

export async function getInboundDocumentXml({ organizationId, inboundId }: { organizationId: string; inboundId: string }) {
	const doc = await db.query.fiscalInboundDocuments.findFirst({
		where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, organizationId), operators.eq(fields.id, inboundId)),
	});
	if (!doc?.xmlStoragePath) throw new createHttpError.NotFound("XML da nota recebida nao disponivel.");
	return { buffer: await downloadStoredFiscalAsset(doc.xmlStoragePath), contentType: getFiscalAssetContentType("xml") };
}
