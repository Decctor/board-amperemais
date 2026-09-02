import "dotenv/config";
import { writeDefaultAccountingEntryLines } from "@/lib/finances/accounting-entry-lines";
import { connection, db } from "@/services/drizzle";
import { accountingEntries, financialTransactions, sales } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";

/**
 * Realinha os totais das vendas de canal gerenciado ja importadas com a composicao da NF.
 *
 * Vendas importadas antes da correcao do mapper gravaram `valorTotal` como o valor cobrado do
 * cliente (`orderAmount`), enquanto a NF usa o valor da operacao da loja — o patrocinio do canal
 * volta como pagamento e a taxa do canal fica de fora. Aqui os totais sao recompostos a partir do
 * que ja esta persistido:
 *
 *   valorTotal = itens brutos - desconto dos itens + frete proprio   (= vNF)
 *
 * e o patrocinio ganha a transacao financeira que faltava (o canal deve esse valor a loja).
 *
 * DRY-RUN por padrao. Uso:
 *   npx tsx ./scripts/repair-managed-sale-totals.ts --org=<id> [--commit]
 */

function arg(name: string, fallback?: string) {
	const found = process.argv.find((value) => value.startsWith(`--${name}=`));
	return found ? found.slice(name.length + 3) : fallback;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

async function main() {
	const orgId = arg("org");
	if (!orgId) throw new Error("Informe --org=<organizacaoId>.");
	const commit = hasFlag("commit");

	const rows = await db.query.sales.findMany({
		// Só venda confirmada: numa venda cancelada as transações já foram canceladas e inserir o
		// patrocínio criaria um recebível vivo cobrando do canal um repasse que nunca virá.
		where: and(eq(sales.organizacaoId, orgId), eq(sales.modelo, "IFOOD"), eq(sales.statusVenda, "CONFIRMADA")),
		columns: { id: true, idExterno: true, valorTotal: true, descontosTotal: true, acrescimosTotal: true, integracaoMetadados: true },
		with: {
			itens: { columns: { valorVendaTotalBruto: true, valorTotalDesconto: true } },
			lancamentosContabeis: {
				columns: { id: true, valor: true, chaveIdempotencia: true, idContaDebito: true, idContaCredito: true },
				with: { transacoesFinanceiras: { columns: { metodo: true, tipo: true, valor: true } } },
			},
		},
	});

	console.log(`=== ${commit ? "APLICANDO" : "DRY-RUN (use --commit para gravar)"} ===`);
	let repaired = 0;

	for (const sale of rows) {
		const metadata = sale.integracaoMetadados;
		if (!metadata) continue;

		const itemsGross = round2(sale.itens.reduce((sum, item) => sum + (item.valorVendaTotalBruto ?? 0), 0));
		const itemsDiscount = round2(sale.itens.reduce((sum, item) => sum + (item.valorTotalDesconto ?? 0), 0));
		// Só o frete PRÓPRIO é receita da loja e entra no total (mesma regra do mapper e do `vFrete`).
		// Quando quem entrega é o canal, o frete é retido por ele e nunca chega à loja.
		const ownFreight = metadata.entrega?.realizadaPor === "LOJA" ? round2(Math.max(metadata.entrega.valorFrete, 0)) : 0;
		const operationValue = round2(itemsGross - itemsDiscount + ownFreight);

		const sponsored = (metadata.descontos?.patrocinados ?? []).filter((entry) => entry.valor > 0);
		const existingVale = sale.lancamentosContabeis
			.flatMap((entry) => entry.transacoesFinanceiras)
			.filter((transaction) => transaction.tipo === "ENTRADA" && transaction.metodo === "VALE");

		const totalsChanged = Math.abs(operationValue - sale.valorTotal) > 0.005;
		const missingSponsorship = sponsored.length > 0 && existingVale.length === 0;
		if (!totalsChanged && !missingSponsorship) continue;

		console.log(`  ${sale.idExterno}`);
		console.log(`    valorTotal      ${sale.valorTotal.toFixed(2)} -> ${operationValue.toFixed(2)}`);
		console.log(`    descontosTotal  ${(sale.descontosTotal ?? 0).toFixed(2)} -> ${itemsDiscount.toFixed(2)}`);
		console.log(`    acrescimosTotal ${(sale.acrescimosTotal ?? 0).toFixed(2)} -> ${ownFreight.toFixed(2)}`);
		if (missingSponsorship) {
			for (const entry of sponsored) console.log(`    + patrocinio ${entry.patrocinador}: ${entry.valor.toFixed(2)} (recebivel do canal)`);
		}

		if (!commit) {
			repaired++;
			continue;
		}

		await db.transaction(async (tx) => {
			await tx
				.update(sales)
				.set({
					valorTotal: operationValue,
					descontosTotal: itemsDiscount > 0 ? itemsDiscount : null,
					acrescimosTotal: ownFreight > 0 ? ownFreight : null,
				})
				.where(eq(sales.id, sale.id));

			if (!missingSponsorship) return;
			// O patrocinio entra na conta do canal: quem deve esse valor a loja e o iFood, nao o cliente.
			// O lancamento da VENDA e o que nao tem chave de idempotencia — `[0]` poderia ser o das taxas.
			const saleEntry = sale.lancamentosContabeis.find((entry) => entry.chaveIdempotencia === null);
			if (!saleEntry) {
				console.warn(`    ! ${sale.idExterno} sem lancamento contabil da venda — rode o backfill do financeiro antes.`);
				return;
			}
			const channelAccount = await tx.query.financialAccounts.findFirst({
				where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, orgId), operators.eq(fields.chaveSistema, "IFOOD")),
				columns: { id: true },
			});
			let sponsoredAdded = 0;
			for (const entry of sponsored) {
				const valor = round2(entry.valor);
				await tx.insert(financialTransactions).values({
					organizacaoId: orgId,
					lancamentoContabilId: saleEntry.id,
					contaFinanceiraId: channelAccount?.id ?? null,
					titulo: `Patrocínio ${entry.patrocinador} - ${sale.idExterno}`,
					tipo: "ENTRADA",
					valor,
					metodo: "VALE",
					dataPrevisao: new Date(),
					dataEfetivacao: null,
					provedorReferencia: sale.idExterno,
					provedorStatus: "AGUARDANDO_REPASSE",
					autorId: null,
				});
				sponsoredAdded = round2(sponsoredAdded + valor);
			}

			// O lancamento da venda vale a SOMA DOS PAGAMENTOS (e nao o total da venda: o caminho vivo
			// grava `paymentsTotal`), entao ele cresce exatamente o que acabou de ser lancado. As linhas
			// contabeis sao reescritas junto — deixa-las com o valor antigo quebraria o balanco do
			// lancamento e o DRE, que le pelas linhas.
			const newEntryValue = round2(saleEntry.valor + sponsoredAdded);
			await tx.update(accountingEntries).set({ valor: newEntryValue }).where(eq(accountingEntries.id, saleEntry.id));
			await writeDefaultAccountingEntryLines({
				trx: tx,
				organizationId: orgId,
				accountingEntryId: saleEntry.id,
				entryValue: newEntryValue,
				debitAccountId: saleEntry.idContaDebito,
				creditAccountId: saleEntry.idContaCredito,
			});
		});
		repaired++;
	}

	console.log(`\nVendas realinhadas: ${repaired}`);
}

main()
	.catch((error) => {
		console.error("Falha no reparo:", error?.message ?? error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
