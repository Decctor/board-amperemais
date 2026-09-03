import "@/utils/scripts/load-next-env";

import { isValidCpfCnpj } from "@/lib/validation";
import { emitFiscalDocument } from "@/lib/fiscal/documents";
import { EXCEPTIONAL_PRESENCE_JUSTIFICATION_MAX_LENGTH, EXCEPTIONAL_PRESENCE_JUSTIFICATION_MIN_LENGTH } from "@/lib/fiscal/exceptional-presence";
import { inspectFiscalFreightRemediation } from "@/lib/fiscal/freight-rejection-remediation";
import { resolveOperationProfileForSale } from "@/lib/fiscal/operation-profile";
import { loadFiscalOrganization } from "@/lib/fiscal/settings";
import { connection, db } from "@/services/drizzle";
import { fiscalDocumentEvents, fiscalOutboundDocuments } from "@/services/drizzle/schema";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

function arg(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function parseDocumentIds() {
	return (arg("document-ids") ?? "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

function printHelp() {
	console.log(`
Audita e reemite documentos rejeitados pelo defeito historico de frete nao distribuido nos itens.
Documentos com qualquer indicio de problema Online/Presencial ficam em REVIEW_PRESENCE e nunca sao
reenviados por este script.

Uso:
  npm run backfill:fiscal-freight-rejections -- --org=<organizacaoId>
  npm run backfill:fiscal-freight-rejections -- --org=<organizacaoId> --document-ids=<id1,id2>
  npm run backfill:fiscal-freight-rejections -- --org=<organizacaoId> --document-ids=<id1,id2> --apply

Opcoes:
  --org             Organizacao obrigatoria; impede varredura global acidental.
  --document-ids    IDs separados por virgula. Obrigatorio junto com --apply.
  --limit           Maximo de documentos na auditoria (padrao: 100, maximo: 500).
  --verbose         Exibe mensagens atuais e a linha do tempo de erros/rejeicoes/sincronizacoes.
  --preserve-presence-overrides
                    Permite aplicar somente documentos REVIEW_PRESENCE com declaracao armazenada
                    completa. Reutiliza presenca, justificativa, autor e data originais.
  --apply           Chama o fluxo normal de emissao para os IDs explicitamente informados.

Sem --apply o script e somente leitura. Um documento so fica READY_FREIGHT quando possui, ao mesmo
tempo, evidencia da rejeicao 866 e divergencia entre total.freightAmount e a soma do frete dos itens.
`);
}

async function main() {
	if (hasFlag("help") || process.argv.includes("-h")) {
		printHelp();
		return;
	}

	const organizationId = arg("org");
	if (!organizationId) throw new Error("Informe --org=<organizacaoId>.");
	const apply = hasFlag("apply");
	const verbose = hasFlag("verbose");
	const preservePresenceOverrides = hasFlag("preserve-presence-overrides");
	const documentIds = parseDocumentIds();
	const requestedLimit = Number(arg("limit") ?? "100");
	if (!Number.isInteger(requestedLimit) || requestedLimit < 1) throw new Error("--limit deve ser um inteiro positivo.");
	const limit = Math.min(requestedLimit, 500);
	if (apply && documentIds.length === 0) throw new Error("--apply exige --document-ids=<id1,id2>. Rode primeiro o dry-run.");

	const documents = await db.query.fiscalOutboundDocuments.findMany({
		where: and(
			eq(fiscalOutboundDocuments.organizacaoId, organizationId),
			inArray(fiscalOutboundDocuments.statusInterno, ["REJEITADO", "ERRO"]),
			inArray(fiscalOutboundDocuments.tipo, ["NFCE", "NFE"]),
			isNotNull(fiscalOutboundDocuments.vendaId),
			...(documentIds.length > 0 ? [inArray(fiscalOutboundDocuments.id, documentIds)] : []),
		),
		with: {
			venda: {
				columns: {
					id: true,
					idExterno: true,
					canal: true,
					entregaModalidade: true,
					dataVenda: true,
				},
				with: {
					cliente: { columns: { cpfCnpj: true } },
				},
			},
		},
		orderBy: [asc(fiscalOutboundDocuments.dataInsercao)],
		limit,
	});

	if (apply) {
		const foundIds = new Set(documents.map((document) => document.id));
		const missingIds = documentIds.filter((id) => !foundIds.has(id));
		if (missingIds.length > 0) throw new Error(`Documentos nao encontrados ou inelegiveis: ${missingIds.join(", ")}`);
	}

	const events =
		documents.length === 0
			? []
			: await db.query.fiscalDocumentEvents.findMany({
					where: and(
						inArray(
							fiscalDocumentEvents.documentoFiscalId,
							documents.map((document) => document.id),
						),
						inArray(fiscalDocumentEvents.tipo, ["REJEITADO", "ERRO", "SINCRONIZADO"]),
					),
					orderBy: [asc(fiscalDocumentEvents.dataInsercao)],
				});
	const eventsByDocument = new Map<string, string[]>();
	for (const event of events) {
		const history = eventsByDocument.get(event.documentoFiscalId) ?? [];
		// A descricao contem as mensagens de rejeicao. O payload de retorno pode ecoar o documento
		// inteiro (inclusive presenceType) e geraria falso positivo de conflito de presenca.
		history.push(event.descricao ?? "");
		eventsByDocument.set(event.documentoFiscalId, history);
	}

	const organization = await loadFiscalOrganization(organizationId);
	if (!organization) throw new Error("Organizacao nao encontrada.");
	const inspected = await Promise.all(
		documents.map(async (document) => {
			let resolvedPresence: string | null = null;
			let operationResolutionError: string | null = null;
			try {
				const documentType = document.tipo as "NFCE" | "NFE";
				const profile = await resolveOperationProfileForSale({
					organizacaoId: organizationId,
					tipoDocumento: documentType,
					signals: {
						canal: document.venda?.canal,
						entregaModalidade: document.venda?.entregaModalidade,
					},
					operacaoPadraoPorTipoId: organization.fiscalConfiguracao?.operacaoPadraoPorTipo?.[documentType] ?? null,
				});
				resolvedPresence = profile.presencaConsumidor;
			} catch (error) {
				operationResolutionError = error instanceof Error ? error.message : String(error);
			}
			return {
				document,
				inspection: inspectFiscalFreightRemediation({
					document,
					rejectionHistory: eventsByDocument.get(document.id) ?? [],
				}),
				resolvedPresence,
				operationResolutionError,
				hasValidRecipientTaxId: isValidCpfCnpj(document.venda?.cliente?.cpfCnpj ?? ""),
				exceptionalPresenceReady:
					document.presencaConsumidorDeclarada === "OPERACAO_PRESENCIAL" &&
					Boolean(document.autorPresencaConsumidorId && document.dataDeclaracaoPresencaConsumidor) &&
					(document.justificativaPresencaConsumidor?.trim().length ?? 0) >= EXCEPTIONAL_PRESENCE_JUSTIFICATION_MIN_LENGTH &&
					(document.justificativaPresencaConsumidor?.trim().length ?? 0) <= EXCEPTIONAL_PRESENCE_JUSTIFICATION_MAX_LENGTH &&
					Boolean(organization.fiscalConfiguracao?.emissaoManual?.classificacaoPresencialExcepcional?.habilitada),
			};
		}),
	);

	console.log(`=== ${apply ? "APLICACAO" : "DRY-RUN"}: REJEICOES FISCAIS DE FRETE ===`);
	console.log(`Organizacao: ${organizationId} | Documentos analisados: ${inspected.length}`);
	for (const { document, inspection, resolvedPresence, operationResolutionError, hasValidRecipientTaxId, exceptionalPresenceReady } of inspected) {
		const sale = document.venda;
		const metrics = inspection.metrics;
		console.log(`\n[${inspection.classification}] documento=${document.id} venda=${sale?.id ?? document.vendaId}`);
		console.log(
			`  tipo=${document.tipo} numero=${document.numero ?? "-"}/${document.serie ?? "-"} status=${document.statusInterno} codigo=${document.codigoRejeicao ?? "-"}`,
		);
		console.log(`  canal=${sale?.canal ?? "-"} modalidade=${sale?.entregaModalidade ?? "-"} presenceType=${metrics.presenceType ?? "-"}`);
		console.log(`  presencaAtualResolvida=${resolvedPresence ?? "ERRO"} destinatarioFiscalValido=${hasValidRecipientTaxId ? "SIM" : "NAO"}`);
		if (document.presencaConsumidorDeclarada) {
			console.log(`  declaracaoPresencialCompleta=${exceptionalPresenceReady ? "SIM" : "NAO"}`);
		}
		if (operationResolutionError) console.log(`  ! perfil atual: ${operationResolutionError}`);
		console.log(
			`  freteTotal=${metrics.freightTotal ?? "-"} freteItens=${metrics.itemFreightTotal ?? "-"} vNF=${metrics.invoiceTotal ?? "-"} pagamentos=${metrics.paymentTotal ?? "-"}`,
		);
		for (const reason of inspection.reasons) console.log(`  ! ${reason}`);
		if (verbose) {
			for (const message of document.mensagens ?? []) console.log(`  mensagem atual: ${message}`);
			for (const event of events.filter((candidate) => candidate.documentoFiscalId === document.id)) {
				console.log(`  evento ${event.dataInsercao.toISOString()} [${event.tipo}]: ${event.descricao ?? "-"}`);
			}
		}
	}

	const ready = inspected.filter(({ inspection }) => inspection.classification === "READY_FREIGHT");
	const reviewPresence = inspected.filter(({ inspection }) => inspection.classification === "REVIEW_PRESENCE");
	const approvedPresence = inspected.filter(
		({ inspection, exceptionalPresenceReady }) =>
			preservePresenceOverrides &&
			inspection.classification === "REVIEW_PRESENCE" &&
			exceptionalPresenceReady &&
			inspection.checks.freightMismatch &&
			!inspection.checks.authorizationEvidence,
	);
	console.log(
		`\nResumo: READY_FREIGHT=${ready.length} | REVIEW_PRESENCE=${reviewPresence.length} | SKIP_NOT_FREIGHT=${inspected.length - ready.length - reviewPresence.length}`,
	);

	if (!apply) {
		console.log(
			"Nada foi alterado. Para reemitir, informe IDs elegiveis explicitamente e use --apply; mantenha --preserve-presence-overrides para os casos presenciais revisados.",
		);
		return;
	}
	const applicable = [...ready, ...approvedPresence];
	if (applicable.length !== inspected.length) {
		throw new Error(
			"Aplicacao recusada: cada ID precisa ser READY_FREIGHT ou REVIEW_PRESENCE com defeito de frete, declaracao completa e --preserve-presence-overrides.",
		);
	}

	for (const { document, inspection } of applicable) {
		if (!document.vendaId) throw new Error(`Documento ${document.id} sem venda vinculada.`);
		if (document.documentoOrigemId || document.chaveAcessoReferencia) {
			throw new Error(`Documento ${document.id} e encadeado a outro documento e exige revisao manual.`);
		}
		console.log(`\n[EMITINDO] documento=${document.id} venda=${document.vendaId}`);
		const preservePresence = inspection.classification === "REVIEW_PRESENCE";
		if (
			preservePresence &&
			(!document.justificativaPresencaConsumidor || !document.autorPresencaConsumidorId || !document.dataDeclaracaoPresencaConsumidor)
		) {
			throw new Error(`Documento ${document.id} sem dados completos da declaracao presencial.`);
		}
		const result = await emitFiscalDocument({
			vendaId: document.vendaId,
			tipo: document.tipo as "NFCE" | "NFE",
			organizacaoId: document.organizacaoId,
			lancamentoContabilId: document.lancamentoContabilId,
			autorId: preservePresence ? document.autorPresencaConsumidorId : null,
			origem: "MANUAL",
			classificacaoPresencaExcepcional: preservePresence
				? {
						presencaConsumidor: "OPERACAO_PRESENCIAL",
						justificativa: document.justificativaPresencaConsumidor as string,
						autorId: document.autorPresencaConsumidorId as string,
						dataDeclaracao: document.dataDeclaracaoPresencaConsumidor as Date,
					}
				: null,
		});
		console.log(`[RESULTADO] documento=${result.documentoId} status=${result.statusInterno} chave=${result.chaveAcesso ?? "-"}`);
		if (["REJEITADO", "ERRO"].includes(result.statusInterno)) {
			throw new Error(`Reemissao de ${document.id} terminou em ${result.statusInterno}; lote interrompido para revisao.`);
		}
	}
}

main()
	.catch((error) => {
		console.error("[FISCAL_FREIGHT_BACKFILL] Falha:", error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
