import "@/utils/scripts/load-next-env";

import { emitFiscalDocument } from "@/lib/fiscal/documents";
import { sanitizeNfeText } from "@/lib/fiscal/providers/spedy/mappers/utils";
import { isValidCpfCnpj } from "@/lib/validation";
import { connection, db } from "@/services/drizzle";

function arg(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

async function main() {
	const organizationId = arg("org");
	const documentId = arg("document-id");
	const apply = hasFlag("apply");
	if (!organizationId || !documentId) throw new Error("Informe --org=<organizacaoId> e --document-id=<documentoFiscalId>.");

	const document = await db.query.fiscalOutboundDocuments.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, documentId), eq(fields.organizacaoId, organizationId)),
		with: {
			venda: {
				columns: { id: true, canal: true, entregaModalidade: true },
				with: { cliente: { columns: { nome: true, cpfCnpj: true } } },
			},
		},
	});
	if (!document) throw new Error("Documento fiscal nao encontrado.");
	if (!document.vendaId || !document.venda) throw new Error("Documento sem venda vinculada.");
	if (!(["NFCE", "NFE"] as string[]).includes(document.tipo)) throw new Error(`Tipo ${document.tipo} nao suportado para reemissao.`);
	if (["AUTORIZADO", "EM_PROCESSAMENTO", "CANCELADO", "CANCELAMENTO_PENDENTE"].includes(document.statusInterno)) {
		throw new Error(`Documento em status ${document.statusInterno}; reemissao recusada.`);
	}
	if (document.protocolo || document.dataAutorizacao) throw new Error("Documento possui evidencia de autorizacao; reemissao recusada.");
	if (document.documentoOrigemId || document.chaveAcessoReferencia) throw new Error("Documento encadeado exige revisao especifica.");

	const originalName = document.venda.cliente?.nome ?? null;
	const sanitizedName = sanitizeNfeText(originalName, 60) ?? null;
	let sentReceiverName: string | null = null;
	try {
		const payload = document.provedorPayload ? (JSON.parse(document.provedorPayload) as { receiver?: { name?: unknown } }) : null;
		sentReceiverName = typeof payload?.receiver?.name === "string" ? payload.receiver.name : null;
	} catch {
		// O payload invalido ja aparece no diagnostico como nome enviado ausente.
	}
	console.log(`Documento: ${document.id} | numero=${document.numero ?? "-"}/${document.serie ?? "-"} | status=${document.statusInterno}`);
	console.log(`Venda: ${document.venda.id} | canal=${document.venda.canal ?? "-"} | modalidade=${document.venda.entregaModalidade ?? "-"}`);
	console.log(`Destinatario fiscal valido: ${isValidCpfCnpj(document.venda.cliente?.cpfCnpj ?? "") ? "SIM" : "NAO"}`);
	console.log(`Nome fiscal sanitizado: ${JSON.stringify(originalName)} -> ${JSON.stringify(sanitizedName)}`);
	console.log(`Nome no ultimo payload enviado: ${JSON.stringify(sentReceiverName)}`);
	if (originalName && !sanitizedName) throw new Error("Nome do destinatario ficou vazio apos a sanitizacao.");

	if (!apply) {
		console.log("DRY-RUN: nada foi alterado. Repita com --apply para reemitir este unico documento.");
		return;
	}
	if (document.presencaConsumidorDeclarada) {
		throw new Error("Documento possui declaracao excepcional de presenca; use o backfill fiscal especializado.");
	}

	const result = await emitFiscalDocument({
		vendaId: document.vendaId,
		tipo: document.tipo as "NFCE" | "NFE",
		organizacaoId: document.organizacaoId,
		lancamentoContabilId: document.lancamentoContabilId,
		origem: "MANUAL",
	});
	console.log(`Resultado: documento=${result.documentoId} status=${result.statusInterno} chave=${result.chaveAcesso ?? "-"}`);
	if (["REJEITADO", "ERRO"].includes(result.statusInterno)) throw new Error(`Reemissao terminou em ${result.statusInterno}.`);
}

main()
	.catch((error) => {
		console.error("[FISCAL_DOCUMENT_RETRY] Falha:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
