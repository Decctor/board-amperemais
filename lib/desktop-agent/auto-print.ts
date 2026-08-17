import { getErrorMessage } from "@/lib/errors";
import { createSignedFiscalAssetUrl } from "@/lib/fiscal/storage";
import { OrganizationPrintPreferencesSchema, type TOrganizationAutoPrintRule } from "@/schemas/organizations";
import { db } from "@/services/drizzle";
import { organizations, sales, type TFiscalDocument, type TOrganizationEntity } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { buildCupomVendaDados } from "./cupom-venda-data";
import { enqueuePrintJob, organizationHasActivePrinterForFinalidade } from "./print-jobs";

// Orquestradores de impressão automática (docs/dev-planning/auto-print-wiring-plan.md).
// Mesma filosofia de processSaleAutomaticFiscalEmissionIfEligible: avaliam elegibilidade,
// rodam PÓS-COMMIT e NUNCA lançam — falha de impressão jamais quebra confirmação de venda,
// ingestão ou autorização fiscal. A chave de idempotência da fila permite ligar os hooks com
// folga: chamadas repetidas para a mesma venda/documento devolvem o job original.

// Chave de política derivada da venda: canal interno cru ("POS", "SHOP", "COMANDA") ou
// "INTEGRACAO-<canal>" para vendas externas ("INTEGRACAO-IFOOD"). `sales.canal` continua cru —
// o prefixo existe só na camada de política, e cada conector futuro ganha sua chave de graça.
export function resolvePrintPolicyChannel({
	canal,
	processamentoOrigem,
}: {
	canal: string | null;
	processamentoOrigem: string | null;
}): string | null {
	if (!canal) return null;
	return processamentoOrigem === "EXTERNO" ? `INTEGRACAO-${canal}` : canal;
}

// Leitura defensiva: `configuracao` não é re-parseada em cada leitura e linhas antigas não têm a
// chave `impressoes` até o próximo save de settings — o parse preenche os defaults (tudo off).
export function parsePrintPreferences(configuracao: TOrganizationEntity["configuracao"] | null | undefined) {
	return OrganizationPrintPreferencesSchema.parse(configuracao?.preferencias?.impressoes ?? undefined);
}

async function resolveConfiguracao({
	organizacaoId,
	configuracao,
}: {
	organizacaoId: string;
	configuracao?: TOrganizationEntity["configuracao"] | null;
}) {
	if (configuracao) return configuracao;
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizacaoId),
		columns: { configuracao: true },
	});
	return organization?.configuracao ?? null;
}

function isChannelAllowed({ rule, canal, processamentoOrigem }: { rule: TOrganizationAutoPrintRule; canal: string | null; processamentoOrigem: string | null }) {
	const policyChannel = resolvePrintPolicyChannel({ canal, processamentoOrigem });
	return !!policyChannel && rule.canais.includes(policyChannel);
}

type TProcessSaleCupomAutoPrintParams = {
	organizacaoId: string;
	saleId: string;
	// Evita um fetch por venda quando o chamador já tem a config em mãos (hot paths de venda/sync).
	configuracao?: TOrganizationEntity["configuracao"] | null;
	solicitadoPorId?: string | null;
};
export async function processSaleCupomAutoPrintIfEligible({ organizacaoId, saleId, configuracao, solicitadoPorId }: TProcessSaleCupomAutoPrintParams) {
	try {
		const resolvedConfiguracao = await resolveConfiguracao({ organizacaoId, configuracao });
		const rule = parsePrintPreferences(resolvedConfiguracao).automatica.CUPOM_VENDA;
		if (!rule.habilitada) return { status: "NAO_SOLICITADO" as const, reason: "IMPRESSAO_AUTOMATICA_DESATIVADA" as const };

		const sale = await db.query.sales.findFirst({
			where: and(eq(sales.id, saleId), eq(sales.organizacaoId, organizacaoId)),
			columns: { id: true, canal: true, processamentoOrigem: true, statusVenda: true },
		});
		if (!sale) return { status: "NAO_SOLICITADO" as const, reason: "VENDA_NAO_ENCONTRADA" as const };
		if (sale.statusVenda === "CANCELADA") return { status: "NAO_SOLICITADO" as const, reason: "VENDA_CANCELADA" as const };
		if (!isChannelAllowed({ rule, canal: sale.canal, processamentoOrigem: sale.processamentoOrigem })) {
			return { status: "NAO_SOLICITADO" as const, reason: "CANAL_NAO_HABILITADO" as const };
		}

		if (!(await organizationHasActivePrinterForFinalidade({ organizacaoId, finalidade: "CUPOM_VENDA" }))) {
			return { status: "NAO_SOLICITADO" as const, reason: "SEM_IMPRESSORA" as const };
		}

		const dados = await buildCupomVendaDados({ organizacaoId, vendaId: saleId });
		const result = await enqueuePrintJob({
			organizacaoId,
			finalidade: "CUPOM_VENDA",
			dados: dados as unknown as Record<string, unknown>,
			origemTipo: "VENDA",
			origemId: saleId,
			copias: rule.copias,
			chaveIdempotencia: `CUPOM_VENDA:${saleId}`,
			solicitadoPorId: solicitadoPorId ?? null,
		});
		return { status: "SOLICITADO" as const, jobId: result.job.id, created: result.created };
	} catch (error) {
		console.error(`[AUTO_PRINT] [ORG: ${organizacaoId}] Falha no auto-print de cupom da venda ${saleId}.`, error);
		return { status: "ERRO" as const, error: getErrorMessage(error) };
	}
}
export type TProcessSaleCupomAutoPrintOutput = Awaited<ReturnType<typeof processSaleCupomAutoPrintIfEligible>>;

// Validade da URL assinada do PDF: TTL do job de DANFE é 24h — assinar por 48h dá margem para
// leases/reimpressões tardias sem deixar o link vivo indefinidamente.
const DANFE_SIGNED_URL_EXPIRES_SECONDS = 48 * 60 * 60;

// Chamado após persistAuthorizedAssets gravar o pdfStoragePath (cobre emissão e sync). Vale para
// emissão automática E manual: a política é sobre a impressão, não sobre quem emitiu.
export async function processFiscalDocumentDanfeAutoPrintIfEligible({ documento }: { documento: TFiscalDocument }) {
	const organizacaoId = documento.organizacaoId;
	try {
		const finalidade = documento.tipo === "NFCE" ? ("DANFE_NFCE" as const) : documento.tipo === "NFE" ? ("DANFE_NFE" as const) : null;
		if (!finalidade) return { status: "NAO_SOLICITADO" as const, reason: "TIPO_SEM_DANFE" as const };
		if (!documento.vendaId) return { status: "NAO_SOLICITADO" as const, reason: "DOCUMENTO_SEM_VENDA" as const };
		if (!documento.pdfStoragePath) return { status: "NAO_SOLICITADO" as const, reason: "PDF_INDISPONIVEL" as const };

		const configuracao = await resolveConfiguracao({ organizacaoId });
		const rule = parsePrintPreferences(configuracao).automatica[finalidade];
		if (!rule.habilitada) return { status: "NAO_SOLICITADO" as const, reason: "IMPRESSAO_AUTOMATICA_DESATIVADA" as const };

		const sale = await db.query.sales.findFirst({
			where: and(eq(sales.id, documento.vendaId), eq(sales.organizacaoId, organizacaoId)),
			columns: { id: true, canal: true, processamentoOrigem: true },
		});
		if (!sale) return { status: "NAO_SOLICITADO" as const, reason: "VENDA_NAO_ENCONTRADA" as const };
		if (!isChannelAllowed({ rule, canal: sale.canal, processamentoOrigem: sale.processamentoOrigem })) {
			return { status: "NAO_SOLICITADO" as const, reason: "CANAL_NAO_HABILITADO" as const };
		}

		if (!(await organizationHasActivePrinterForFinalidade({ organizacaoId, finalidade }))) {
			return { status: "NAO_SOLICITADO" as const, reason: "SEM_IMPRESSORA" as const };
		}

		const pdfUrl = await createSignedFiscalAssetUrl({ storagePath: documento.pdfStoragePath, expiresInSeconds: DANFE_SIGNED_URL_EXPIRES_SECONDS });
		const result = await enqueuePrintJob({
			organizacaoId,
			finalidade,
			dados: { pdfUrl },
			origemTipo: "NOTA_FISCAL",
			origemId: documento.id,
			copias: rule.copias,
			chaveIdempotencia: `DANFE:${documento.id}`,
		});
		return { status: "SOLICITADO" as const, jobId: result.job.id, created: result.created };
	} catch (error) {
		console.error(`[AUTO_PRINT] [ORG: ${organizacaoId}] Falha no auto-print de DANFE do documento ${documento.id}.`, error);
		return { status: "ERRO" as const, error: getErrorMessage(error) };
	}
}
export type TProcessFiscalDocumentDanfeAutoPrintOutput = Awaited<ReturnType<typeof processFiscalDocumentDanfeAutoPrintIfEligible>>;
