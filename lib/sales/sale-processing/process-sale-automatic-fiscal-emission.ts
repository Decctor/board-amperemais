import { getErrorMessage } from "@/lib/errors";
import { enqueueFiscalDocument } from "@/lib/fiscal/documents";
import { resolveEmissionDocumentType } from "@/lib/fiscal/document-type";
import { notifyFiscalEmissionFailure } from "@/lib/fiscal/notifications";
import { db } from "@/services/drizzle";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import createHttpError from "http-errors";
import { getSaleFinancialState } from "./get-sale-financial-state";

export async function processSaleAutomaticFiscalEmissionIfEligible({
	organization,
	saleId,
	authorId,
}: {
	organization: TOrganizationEntity;
	saleId: string;
	authorId?: string | null;
}) {
	if (!organization.fiscalEmissaoAutomatica) return { status: "NAO_SOLICITADO" as const, reason: "EMISSAO_AUTOMATICA_DESATIVADA" as const };

	const [sale, financialState] = await Promise.all([
		db.query.sales.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, saleId), eq(fields.organizacaoId, organization.id)),
			with: {
				cliente: { columns: { cpfCnpj: true } },
				documentosFiscais: { columns: { id: true, statusInterno: true } },
				lancamentosContabeis: { columns: { id: true } },
			},
		}),
		getSaleFinancialState({ organizationId: organization.id, saleId }),
	]);

	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");
	if (sale.statusVenda !== "CONFIRMADA" || sale.statusAtendimento !== "ENTREGUE" || !financialState.isFullyPaid) {
		return { status: "NAO_SOLICITADO" as const, reason: "VENDA_NAO_ELEGIVEL" as const };
	}
	if (sale.documentosFiscais.some((document) => !["CANCELADO", "INUTILIZADO"].includes(document.statusInterno ?? ""))) {
		return { status: "NAO_SOLICITADO" as const, reason: "DOCUMENTO_EXISTENTE" as const };
	}

	const accountingEntryId = sale.lancamentosContabeis[0]?.id;
	if (!accountingEntryId) throw new createHttpError.BadRequest("Lançamento contábil da venda não encontrado.");

	try {
		const tipoDocumento = await resolveEmissionDocumentType({
			organizacaoId: organization.id,
			operacaoPadraoNfeId: organization.fiscalConfiguracao?.operacaoPadraoPorTipo?.NFE ?? null,
			signals: {
				canal: sale.canal,
				entregaModalidade: sale.entregaModalidade,
				destinatarioCpfCnpj: sale.cliente?.cpfCnpj,
			},
		});
		const enqueued = await enqueueFiscalDocument({
			vendaId: saleId,
			tipo: tipoDocumento,
			organizacaoId: organization.id,
			lancamentoContabilId: accountingEntryId,
			autorId: authorId ?? null,
			origem: "AUTOMATICA",
		});
		return { status: "SOLICITADO" as const, documentoId: enqueued.documentoId, statusInterno: enqueued.statusInterno };
	} catch (error) {
		console.error("[PROCESS_SALE_AUTOMATIC_FISCAL_EMISSION] Error emitting fiscal document", error);
		const errorMessage = getErrorMessage(error);
		await notifyFiscalEmissionFailure({ organization, sale, errorMessage });
		return { status: "ERRO" as const, error: errorMessage };
	}
}
