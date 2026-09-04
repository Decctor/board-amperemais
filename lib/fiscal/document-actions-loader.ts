import { db } from "@/services/drizzle";
import { fiscalDocumentEvents, fiscalOutboundDocuments } from "@/services/drizzle/schema";
import { and, count, eq, inArray } from "drizzle-orm";
import { resolveFiscalDocumentActions, type TFiscalDocumentAction, type TFiscalDocumentForActions } from "./document-actions";
import { resolveFiscalDocumentProblems, type TFiscalProblem } from "./problems";

/**
 * Carrega o contexto que a matriz de acoes nao consegue deduzir do documento sozinho (cartas de
 * correcao ja emitidas, devolucao existente, perfil de devolucao da organizacao) e devolve
 * `acoes` + `problemas` prontos para a API. Consultas em lote: uma pagina inteira custa tres queries.
 */

type DecoratableDocument = TFiscalDocumentForActions & {
	id: string;
	organizacaoId: string;
	problemas?: string | null;
	codigoRejeicao?: string | null;
	mensagens?: unknown[] | null;
};

export type TFiscalDocumentDecoration = {
	acoes: TFiscalDocumentAction[];
	problemas: TFiscalProblem[];
};

async function hasActiveReturnProfile(organizacaoId: string) {
	const profile = await db.query.fiscalOperationProfiles.findFirst({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.organizacaoId, organizacaoId),
				operators.eq(fields.tipoDocumento, "NFE"),
				operators.eq(fields.finalidade, "DEVOLUCAO"),
				operators.eq(fields.ativo, true),
			),
		columns: { id: true },
	});
	return !!profile;
}

export async function decorateFiscalDocuments<T extends DecoratableDocument>({
	documents,
	organizacaoId,
	provedor,
	agora = new Date(),
}: {
	documents: T[];
	organizacaoId: string;
	provedor: string | null | undefined;
	agora?: Date;
}): Promise<Array<T & TFiscalDocumentDecoration>> {
	if (documents.length === 0) return [];

	const authorizedNfeIds = documents.filter((doc) => doc.tipo === "NFE" && doc.statusInterno === "AUTORIZADO").map((doc) => doc.id);
	const authorizedIds = documents.filter((doc) => doc.statusInterno === "AUTORIZADO").map((doc) => doc.id);

	const [correctionRows, returnRows, possuiPerfilDevolucao] = await Promise.all([
		authorizedNfeIds.length > 0
			? db
					.select({ documentoFiscalId: fiscalDocumentEvents.documentoFiscalId, total: count() })
					.from(fiscalDocumentEvents)
					.where(and(inArray(fiscalDocumentEvents.documentoFiscalId, authorizedNfeIds), eq(fiscalDocumentEvents.tipo, "CARTA_CORRECAO")))
					.groupBy(fiscalDocumentEvents.documentoFiscalId)
			: Promise.resolve([]),
		authorizedIds.length > 0
			? db
					.select({ documentoOrigemId: fiscalOutboundDocuments.documentoOrigemId })
					.from(fiscalOutboundDocuments)
					.where(
						and(
							eq(fiscalOutboundDocuments.organizacaoId, organizacaoId),
							inArray(fiscalOutboundDocuments.documentoOrigemId, authorizedIds),
							eq(fiscalOutboundDocuments.statusInterno, "AUTORIZADO"),
						),
					)
			: Promise.resolve([]),
		authorizedIds.length > 0 ? hasActiveReturnProfile(organizacaoId) : Promise.resolve(null),
	]);

	const correctionsById = new Map(correctionRows.map((row) => [row.documentoFiscalId, row.total]));
	const returnedIds = new Set(returnRows.map((row) => row.documentoOrigemId).filter((id): id is string => !!id));

	return documents.map((documento) => ({
		...documento,
		acoes: resolveFiscalDocumentActions({
			documento,
			agora,
			contexto: {
				provedor,
				cartasCorrecaoEmitidas: correctionsById.get(documento.id) ?? 0,
				possuiDevolucaoAutorizada: returnedIds.has(documento.id),
				possuiPerfilDevolucao,
			},
		}),
		problemas: resolveFiscalDocumentProblems(documento),
	}));
}

export async function loadFiscalDocumentActions(documento: DecoratableDocument, provedor: string | null | undefined, agora = new Date()) {
	const [decorated] = await decorateFiscalDocuments({ documents: [documento], organizacaoId: documento.organizacaoId, provedor, agora });
	return decorated.acoes;
}
