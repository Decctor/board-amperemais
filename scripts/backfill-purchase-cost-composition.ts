import "dotenv/config";
import { PRIVATE_FILES_BUCKET } from "@/lib/files-storage/buckets";
import { PurchaseImportedDocumentsSnapshotSchema } from "@/schemas/purchases";
import { connection, db } from "@/services/drizzle";
import {
	accountingEntries,
	accountingEntryLines,
	accountsCharts,
	fiscalOutboundDocuments,
	organizations,
	purchases,
} from "@/services/drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import { eq, isNotNull, sql } from "drizzle-orm";

/**
 * Backfill de 0072_purchase_cost_composition.sql. Rodar DEPOIS da migração e logo após o deploy: as
 * linhas contábeis passam a ser gravadas em toda compra, e sem esta execução os lançamentos
 * anteriores ficariam sendo os únicos sem linhas.
 *
 *   npx tsx ./scripts/backfill-purchase-cost-composition.ts --dry-run
 *   npx tsx ./scripts/backfill-purchase-cost-composition.ts
 *   npx tsx ./scripts/backfill-purchase-cost-composition.ts --only=fiscal-objects,fiscal-paths
 *   npx tsx ./scripts/backfill-purchase-cost-composition.ts --only=orphan-imports
 *
 * Todas as etapas são idempotentes e rodam sempre na ordem de ALL_STEPS, não na ordem digitada.
 * `orphan-imports` fica fora do conjunto padrão porque apaga objetos do Storage — rode com
 * `--dry-run` primeiro e confira a lista. Nenhuma etapa apaga o objeto fiscal de origem: a cópia
 * pública só sai depois que um download pela rota autenticada for validado.
 */

// A ordem aqui é a ordem de execução, independente de como `--only` for digitado: `fiscal-objects`
// precisa preceder `fiscal-paths`, e deixar isso a cargo de quem digita convida ao erro.
const DEFAULT_STEPS = ["lines", "accounts", "fiscal-secrets", "fiscal-objects", "fiscal-paths"] as const;
const ALL_STEPS = [...DEFAULT_STEPS, "orphan-imports"] as const;
type TStep = (typeof ALL_STEPS)[number];

const LEGACY_FISCAL_BUCKET = "files";
const LEGACY_FISCAL_PREFIX = "public/organizations/fiscal/";
const CURRENT_FISCAL_PREFIX = "fiscal/";
const TAX_CREDIT_ACCOUNT_NAME = "Tributos a Recuperar";
const PERIOD_EXPENSE_ACCOUNT_NAME = "Despesas Operacionais";

const dryRun = process.argv.includes("--dry-run");
const onlyArgument = process.argv.find((argument) => argument.startsWith("--only="));
const requestedSteps = onlyArgument
	? new Set(
			onlyArgument
				.slice("--only=".length)
				.split(",")
				.map((step) => step.trim()),
		)
	: new Set<string>(DEFAULT_STEPS);
const steps: TStep[] = ALL_STEPS.filter((step) => requestedSteps.has(step));

function log(message: string) {
	console.log(`${dryRun ? "[dry-run] " : ""}${message}`);
}

/**
 * Cliente próprio em vez de `services/supabase/admin.ts`: aquele módulo é marcado com `server-only`,
 * que só resolve dentro do build do Next. Só a varredura de órfãos precisa dele, então as demais
 * etapas rodam sem nenhuma credencial de Storage.
 */
function getStorage() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !secretKey) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY para as etapas que tocam o Storage.");
	return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }).storage;
}

/**
 * Toda partida dobrada histórica é de duas linhas: nenhum item antigo tem modificadores, então o
 * débito é integralmente custo de estoque. Reconstruir aqui é o que permite ligar a flag sem que os
 * lançamentos anteriores fiquem sem linhas.
 */
async function backfillAccountingEntryLines() {
	const pending = await db
		.select({
			id: accountingEntries.id,
			organizacaoId: accountingEntries.organizacaoId,
			idContaDebito: accountingEntries.idContaDebito,
			idContaCredito: accountingEntries.idContaCredito,
			valor: accountingEntries.valor,
			valorPrevisto: accountingEntries.valorPrevisto,
		})
		.from(accountingEntries)
		.where(
			sql`NOT EXISTS (SELECT 1 FROM ${accountingEntryLines} WHERE ${accountingEntryLines.lancamentoContabilId} = ${accountingEntries.id})`,
		);

	let created = 0;
	let skipped = 0;
	for (const entry of pending) {
		// Sem uma das contas não há partida dobrada a reconstruir — e inventar uma conta seria pior do
		// que deixar o lançamento sem linhas para inspeção manual.
		if (!entry.idContaDebito || !entry.idContaCredito || !entry.valor || entry.valor <= 0) {
			skipped++;
			continue;
		}
		if (!dryRun)
			await db.insert(accountingEntryLines).values([
				{
					organizacaoId: entry.organizacaoId,
					lancamentoContabilId: entry.id,
					contaContabilId: entry.idContaDebito,
					natureza: "DEBITO",
					valor: entry.valor,
					valorPrevisto: entry.valorPrevisto ?? null,
					ordem: 0,
					metadados: { origem: "BACKFILL_0072" },
				},
				{
					organizacaoId: entry.organizacaoId,
					lancamentoContabilId: entry.id,
					contaContabilId: entry.idContaCredito,
					natureza: "CREDITO",
					valor: entry.valor,
					valorPrevisto: entry.valorPrevisto ?? null,
					ordem: 1,
					metadados: { origem: "BACKFILL_0072" },
				},
			]);
		created++;
	}
	log(`linhas contábeis: ${created} lançamentos reconstruídos, ${skipped} ignorados (sem conta ou sem valor).`);
}

/**
 * Organizações criadas antes destes campos não têm para onde mandar crédito tributário nem despesa
 * do período — e uma compra recebida com IPI recuperável falharia na gravação. A conta de tributos
 * é criada se não existir; a de despesas reaproveita a que o plano padrão já traz.
 */
async function backfillPurchaseTreatmentAccounts() {
	const rows = await db.select({ id: organizations.id, configuracao: organizations.configuracao }).from(organizations);

	let updated = 0;
	for (const organization of rows) {
		const purchaseDefaults = organization.configuracao?.defaults?.contabilidade?.lancamentosPadrao?.compras;
		if (!purchaseDefaults) continue;
		if (purchaseDefaults.debitoCreditoTributarioContaId && purchaseDefaults.debitoDespesaPeriodoContaId) continue;

		const existingAccounts = await db
			.select({ id: accountsCharts.id, nome: accountsCharts.nome, natureza: accountsCharts.natureza })
			.from(accountsCharts)
			.where(eq(accountsCharts.organizacaoId, organization.id));

		let taxCreditAccountId = existingAccounts.find((account) => account.nome === TAX_CREDIT_ACCOUNT_NAME)?.id ?? null;
		const periodExpenseAccountId =
			existingAccounts.find((account) => account.nome === PERIOD_EXPENSE_ACCOUNT_NAME)?.id ??
			existingAccounts.find((account) => account.natureza === "DESPESA")?.id ??
			null;

		if (!taxCreditAccountId) {
			const assetParentId = existingAccounts.find((account) => account.nome === "Ativo")?.id ?? null;
			if (dryRun) {
				taxCreditAccountId = "<nova conta>";
			} else {
				const [inserted] = await db
					.insert(accountsCharts)
					.values({
						organizacaoId: organization.id,
						nome: TAX_CREDIT_ACCOUNT_NAME,
						codigo: "1.4",
						natureza: "ATIVO",
						idContaPai: assetParentId,
					})
					.returning({ id: accountsCharts.id });
				taxCreditAccountId = inserted?.id ?? null;
			}
		}

		if (!dryRun)
			await db
				.update(organizations)
				.set({
					configuracao: {
						...organization.configuracao,
						defaults: {
							...organization.configuracao.defaults,
							contabilidade: {
								...organization.configuracao.defaults.contabilidade,
								lancamentosPadrao: {
									...organization.configuracao.defaults.contabilidade.lancamentosPadrao,
									compras: {
										...purchaseDefaults,
										debitoCreditoTributarioContaId: purchaseDefaults.debitoCreditoTributarioContaId ?? taxCreditAccountId,
										debitoCreditoTributarioContaKey: purchaseDefaults.debitoCreditoTributarioContaKey ?? "tributos_recuperar",
										debitoDespesaPeriodoContaId: purchaseDefaults.debitoDespesaPeriodoContaId ?? periodExpenseAccountId,
										debitoDespesaPeriodoContaKey: purchaseDefaults.debitoDespesaPeriodoContaKey ?? "despesas_operacionais",
									},
								},
							},
						},
					},
				})
				.where(eq(organizations.id, organization.id));
		updated++;
	}
	log(`contas de tratamento: ${updated} organizações atualizadas.`);
}

/**
 * A senha do certificado saiu do schema, mas Zod só a descarta quando a configuração é regravada —
 * quem nunca ressincronizou ainda guarda a senha em texto puro no JSONB. `storagePath` some junto:
 * o certificado agora vive só na Spedy, e o objeto legado é apagado manualmente depois.
 */
async function scrubFiscalCertificateSecrets() {
	const rows = await db
		.select({ id: organizations.id, fiscalConfiguracao: organizations.fiscalConfiguracao })
		.from(organizations)
		.where(isNotNull(organizations.fiscalConfiguracao));

	let scrubbed = 0;
	for (const organization of rows) {
		const certificate = organization.fiscalConfiguracao?.spedy?.certificado as Record<string, unknown> | undefined;
		if (!certificate) continue;
		const hasSecret = "password" in certificate || "storagePath" in certificate;
		if (!hasSecret) continue;

		const { password: _password, storagePath: _storagePath, ...safeCertificate } = certificate;
		if (!dryRun)
			await db
				.update(organizations)
				.set({
					fiscalConfiguracao: {
						...organization.fiscalConfiguracao,
						spedy: {
							...organization.fiscalConfiguracao!.spedy,
							certificado: { ...safeCertificate, providerManaged: true },
						},
					} as typeof organization.fiscalConfiguracao,
				})
				.where(eq(organizations.id, organization.id));
		scrubbed++;
	}
	log(`segredos de certificado: ${scrubbed} organizações limpas (senha e storagePath removidos do JSONB).`);
}

/** Caminho legado equivalente, venha o valor gravado de antes ou de depois da reescrita. */
function toLegacyFiscalPath(storedPath: string) {
	if (storedPath.startsWith(LEGACY_FISCAL_PREFIX)) return storedPath;
	if (storedPath.startsWith(CURRENT_FISCAL_PREFIX)) return `${LEGACY_FISCAL_PREFIX}${storedPath.slice(CURRENT_FISCAL_PREFIX.length)}`;
	return null;
}

/**
 * Copia — não move — os XMLs e DANFEs do bucket público para o privado. A origem fica no lugar de
 * propósito: apagá-la antes de validar um download pela rota autenticada deixaria os documentos sem
 * nenhuma cópia acessível. A remoção é manual, depois da validação.
 *
 * Roda antes de `fiscal-paths`: enquanto o banco ainda aponta para o caminho antigo, o objeto novo
 * apenas existe sem leitor; na ordem inversa haveria uma janela com o banco apontando para um objeto
 * que ainda não chegou.
 */
async function copyFiscalAssetsToPrivateBucket() {
	const storage = getStorage();
	const rows = await db
		.select({ xmlStoragePath: fiscalOutboundDocuments.xmlStoragePath, pdfStoragePath: fiscalOutboundDocuments.pdfStoragePath })
		.from(fiscalOutboundDocuments);

	const sourcePaths = [...new Set(rows.flatMap((row) => [row.xmlStoragePath, row.pdfStoragePath]).filter((path): path is string => !!path))]
		.map(toLegacyFiscalPath)
		.filter((path): path is string => !!path);

	let copied = 0;
	let alreadyThere = 0;
	let failed = 0;
	for (const sourcePath of sourcePaths) {
		const destinationPath = `${CURRENT_FISCAL_PREFIX}${sourcePath.slice(LEGACY_FISCAL_PREFIX.length)}`;
		if (dryRun) {
			log(`  copiaria files/${sourcePath} → ${PRIVATE_FILES_BUCKET}/${destinationPath}`);
			copied++;
			continue;
		}
		const { error } = await storage.from(LEGACY_FISCAL_BUCKET).copy(sourcePath, destinationPath, { destinationBucket: PRIVATE_FILES_BUCKET });
		if (!error) {
			copied++;
			continue;
		}
		// O destino já existente é o caso normal de reexecução, não um erro.
		if (/exists|duplicate/i.test(error.message)) {
			alreadyThere++;
			continue;
		}
		failed++;
		console.error(`  falha ao copiar ${sourcePath}: ${error.message}`);
	}
	log(`objetos fiscais: ${copied} copiados, ${alreadyThere} já presentes, ${failed} com falha (de ${sourcePaths.length} referenciados).`);
	if (failed > 0) throw new Error("Copie os objetos fiscais restantes antes de reescrever os caminhos no banco.");
}

/**
 * FISCAL_STORAGE_PREFIX passou de `public/organizations/fiscal` para `fiscal` quando os XMLs foram
 * para o bucket privado. Os caminhos gravados são usados literalmente no download, então sem esta
 * reescrita todo XML/DANFE anterior deixa de ser encontrado.
 */
async function rewriteFiscalAssetPaths() {
	const rows = await db
		.select({ id: fiscalOutboundDocuments.id, xmlStoragePath: fiscalOutboundDocuments.xmlStoragePath, pdfStoragePath: fiscalOutboundDocuments.pdfStoragePath })
		.from(fiscalOutboundDocuments)
		.where(
			sql`${fiscalOutboundDocuments.xmlStoragePath} LIKE ${`${LEGACY_FISCAL_PREFIX}%`} OR ${fiscalOutboundDocuments.pdfStoragePath} LIKE ${`${LEGACY_FISCAL_PREFIX}%`}`,
		);

	for (const document of rows) {
		const nextXml = document.xmlStoragePath?.startsWith(LEGACY_FISCAL_PREFIX)
			? document.xmlStoragePath.replace(LEGACY_FISCAL_PREFIX, CURRENT_FISCAL_PREFIX)
			: document.xmlStoragePath;
		const nextPdf = document.pdfStoragePath?.startsWith(LEGACY_FISCAL_PREFIX)
			? document.pdfStoragePath.replace(LEGACY_FISCAL_PREFIX, CURRENT_FISCAL_PREFIX)
			: document.pdfStoragePath;
		if (!dryRun)
			await db
				.update(fiscalOutboundDocuments)
				.set({ xmlStoragePath: nextXml, pdfStoragePath: nextPdf })
				.where(eq(fiscalOutboundDocuments.id, document.id));
	}
	log(`caminhos fiscais: ${rows.length} documentos reescritos para o prefixo privado.`);
	if (rows.length > 0)
		log(`  valide um download pela rota autenticada e só então apague os objetos em ${LEGACY_FISCAL_BUCKET}/${LEGACY_FISCAL_PREFIX}.`);
}

/**
 * A extração grava o arquivo antes de a compra existir; se o usuário abandona a revisão, o objeto
 * fica sem dono. Como o caminho é derivado da referência, basta comparar o que está no bucket com as
 * referências citadas pelas compras da organização.
 */
async function sweepOrphanPurchaseImports() {
	const storage = getStorage().from(PRIVATE_FILES_BUCKET);
	const rows = await db
		.select({ organizacaoId: purchases.organizacaoId, documentosImportados: purchases.documentosImportados })
		.from(purchases)
		.where(isNotNull(purchases.documentosImportados));

	const referencedByOrganization = new Map<string, Set<string>>();
	for (const purchase of rows) {
		if (!purchase.organizacaoId) continue;
		const parsed = PurchaseImportedDocumentsSnapshotSchema.safeParse(purchase.documentosImportados);
		if (!parsed.success) continue;
		const referenced = referencedByOrganization.get(purchase.organizacaoId) ?? new Set<string>();
		for (const document of parsed.data.documentos) referenced.add(document.referencia);
		referencedByOrganization.set(purchase.organizacaoId, referenced);
	}

	const allOrganizations = await db.select({ id: organizations.id }).from(organizations);
	let removed = 0;
	for (const organization of allOrganizations) {
		const prefix = `organizations/${organization.id}/purchase-imports`;
		const { data: objects, error } = await storage.list(prefix, { limit: 1000 });
		if (error || !objects) continue;
		const referenced = referencedByOrganization.get(organization.id) ?? new Set<string>();
		const orphans = objects.filter((object) => !referenced.has(object.name)).map((object) => `${prefix}/${object.name}`);
		if (orphans.length === 0) continue;
		for (const orphan of orphans) log(`  órfão: ${orphan}`);
		if (!dryRun) await storage.remove(orphans);
		removed += orphans.length;
	}
	log(`importações órfãs: ${removed} objetos ${dryRun ? "identificados" : "removidos"}.`);
}

const RUNNERS: Record<TStep, () => Promise<void>> = {
	lines: backfillAccountingEntryLines,
	accounts: backfillPurchaseTreatmentAccounts,
	"fiscal-secrets": scrubFiscalCertificateSecrets,
	"fiscal-objects": copyFiscalAssetsToPrivateBucket,
	"fiscal-paths": rewriteFiscalAssetPaths,
	"orphan-imports": sweepOrphanPurchaseImports,
};

async function main() {
	if (steps.length === 0) {
		console.error(`Nenhuma etapa válida. Disponíveis: ${ALL_STEPS.join(", ")}`);
		process.exit(1);
	}
	log(`etapas: ${steps.join(", ")}`);
	for (const step of steps) await RUNNERS[step]();
	log("backfill concluído.");
	await connection.end();
}

main().catch(async (error) => {
	console.error("Falha no backfill:", error);
	await connection.end();
	process.exit(1);
});
