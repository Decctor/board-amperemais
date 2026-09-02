import "dotenv/config";
import { attendanceStatusRequiresPhysicalOut } from "@/lib/sales/sale-processing/attendance";
import { processManagedSaleFinancials, settleManagedSaleOfflinePayments } from "@/lib/sales/fulfillment-channels/managed-sale-financials";
import { FIRST_PARTY_ACCOUNT_KEYS } from "@/lib/finances/first-party-accounts";
import { isManagedFulfillmentSaleModel } from "@/lib/sales/fulfillment-channels/policy";
import type { TCanonicalSale, TCanonicalSalePayment } from "@/lib/data-connectors/types";
import { connection, db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { PaymentMethodEnum } from "@/schemas/enums";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Backfill do financeiro de vendas de canal gerenciado (iFood) importadas enquanto a politica
 * `integracaoERP.financeiro` estava desligada — elas ficaram sem lancamento contabil e sem
 * transacoes financeiras.
 *
 * Reconstroi o minimo que `processManagedSaleFinancials` consome a partir da venda ja persistida
 * (`integracaoMetadados.pagamentos.metodos` e a forma persistida dos pagamentos canonicos) e
 * reaproveita exatamente o mesmo caminho do sync — nao duplica regra de negocio. Vendas ja
 * entregues tambem tem os pagamentos "na entrega" efetivados, como o sync faria.
 *
 * DRY-RUN por padrao. Uso:
 *   npx tsx ./scripts/backfill-managed-sale-financials.ts --org=<id> [--limit=N] [--commit]
 */

function arg(name: string, fallback?: string) {
	const found = process.argv.find((value) => value.startsWith(`--${name}=`));
	return found ? found.slice(name.length + 3) : fallback;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
	const orgId = arg("org");
	if (!orgId) throw new Error("Informe --org=<organizacaoId>.");
	const limit = Number(arg("limit", "500"));
	const commit = hasFlag("commit");

	const candidates = await db.query.sales.findMany({
		// O modelo entra no WHERE (e nao so no filtro em memoria) porque a varredura cairia toda
		// sobre as vendas de PDV, que sao a maioria, e nenhuma venda de canal apareceria.
		where: and(
			eq(sales.organizacaoId, orgId),
			eq(sales.statusVenda, "CONFIRMADA"),
			eq(sales.processamentoOrigem, "EXTERNO"),
			eq(sales.modelo, "IFOOD"),
			isNull(sales.tabId),
		),
		columns: {
			id: true,
			idExterno: true,
			modelo: true,
			valorTotal: true,
			dataVenda: true,
			statusAtendimento: true,
			integracaoMetadados: true,
			processamentoOrigem: true,
		},
		// `chaveIdempotencia` distingue o lancamento da venda (nula) do de taxas do canal.
		with: { lancamentosContabeis: { columns: { id: true, chaveIdempotencia: true } } },
		orderBy: (fields, { asc }) => asc(fields.dataVenda),
	});

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq: equals }) => equals(fields.id, orgId),
		columns: { configuracao: true },
	});
	if (!organization) throw new Error("Organizacao nao encontrada.");

	// Duas pendencias independentes, porque `processManagedSaleFinancials` tem uma trava por
	// concern: a venda (lancamento sem chave) e as taxas do canal (chave `taxas-canal:<id>`). Uma
	// venda ja lancada quando a rotina de taxas ainda nao existia continua devendo a despesa.
	const pending = candidates
		.map((sale) => {
			const hasChannelFees = (sale.integracaoMetadados?.taxasCanal ?? []).some((fee) => fee.valor > 0);
			return {
				sale,
				missingSaleEntry: !sale.lancamentosContabeis.some((entry) => entry.chaveIdempotencia === null),
				missingFeesEntry: hasChannelFees && !sale.lancamentosContabeis.some((entry) => entry.chaveIdempotencia === `taxas-canal:${sale.id}`),
			};
		})
		.filter(
			({ sale, missingSaleEntry, missingFeesEntry }) =>
				isManagedFulfillmentSaleModel(sale.modelo) && sale.valorTotal > 0 && (missingSaleEntry || missingFeesEntry),
		)
		// O `limit` recai sobre o que FALTA, nao sobre a varredura: aplicado na consulta, ele devolvia
		// sempre as mesmas vendas ja processadas e as reexecucoes nunca avancavam.
		.slice(0, limit);

	console.log(`=== ${commit ? "APLICANDO" : "DRY-RUN (use --commit para gravar)"} ===`);
	console.log(`Vendas gerenciadas confirmadas com financeiro pendente: ${pending.length} (de ${candidates.length} confirmadas analisadas)`);

	let processed = 0;
	let feesOnly = 0;
	let settled = 0;
	const skipped: string[] = [];

	for (const { sale, missingSaleEntry } of pending) {
		const metadata = sale.integracaoMetadados;
		const metodos = metadata?.pagamentos?.metodos ?? [];
		const payments: TCanonicalSalePayment[] = metodos.map((method) => ({
			// O metadata guarda o metodo como string livre; o canonico exige o enum.
			metodo: PaymentMethodEnum.safeParse(method.metodo).data ?? "OUTRO",
			valor: method.valor,
			pagoOnline: method.pagoOnline,
			descricao: method.descricao ?? null,
		}));
		// Sem pagamentos nao da para lancar a venda — mas as taxas do canal nao dependem deles, entao
		// uma venda que so precisa da despesa segue em frente.
		if (payments.length === 0 && missingSaleEntry) {
			skipped.push(`${sale.idExterno}: sem detalhamento de pagamento no metadata`);
			continue;
		}

		// Apenas os campos que processManagedSaleFinancials le da venda canonica.
		const canonical = {
			sourceSaleId: sale.idExterno,
			displayId: sale.idExterno,
			model: sale.modelo,
			totalValue: sale.valorTotal,
			occurredAt: sale.dataVenda ?? new Date(),
			payments,
			integrationMetadata: metadata,
		} as unknown as TCanonicalSale;

		const label = `${sale.idExterno} (R$ ${sale.valorTotal.toFixed(2)}, ${payments.map((p) => `${p.metodo}${p.pagoOnline ? " online" : " na entrega"}`).join(" + ")})`;
		const fees = (metadata?.taxasCanal ?? []).filter((fee) => fee.valor > 0);
		const feesLabel = fees.length > 0 ? ` + taxas ${fees.reduce((sum, fee) => sum + fee.valor, 0).toFixed(2)}` : "";

		if (!commit) {
			console.log(`  ${missingSaleEntry ? "+" : "~"} ${label}${feesLabel}${missingSaleEntry ? "" : " [somente taxas]"}`);
			if (missingSaleEntry) {
				processed++;
				if (attendanceStatusRequiresPhysicalOut(sale.statusAtendimento)) settled++;
			} else {
				feesOnly++;
			}
			continue;
		}

		await db.transaction(async (tx) => {
			const result = await processManagedSaleFinancials(tx, {
				organizationId: orgId,
				saleId: sale.id,
				sale: canonical,
				channelAccountKey: FIRST_PARTY_ACCOUNT_KEYS.IFOOD,
				organizationConfiguration: organization.configuracao,
			});
			if (!result.processed) {
				// "ja-processada" aqui e o caminho esperado da venda que so devia as taxas do canal —
				// elas ja foram lancadas dentro desta mesma chamada, antes da trava da venda.
				if (result.reason === "ja-processada") feesOnly++;
				else skipped.push(`${sale.idExterno}: ${result.reason}`);
				return;
			}
			processed++;
			// Venda ja entregue: os pagamentos "na entrega" ja aconteceram no mundo real.
			if (attendanceStatusRequiresPhysicalOut(sale.statusAtendimento)) {
				await settleManagedSaleOfflinePayments(tx, { organizationId: orgId, saleId: sale.id });
				settled++;
			}
		});
		console.log(`  + ${label}${feesLabel}`);
	}

	if (skipped.length > 0) {
		console.log(`\n=== PULADAS (${skipped.length}) ===`);
		for (const reason of skipped.slice(0, 30)) console.log(`  - ${reason}`);
	}
	console.log(
		`\nProcessadas: ${processed} | Somente taxas do canal: ${feesOnly} | Com pagamentos na entrega efetivados: ${settled} | Puladas: ${skipped.length}`,
	);
}

main()
	.catch((error) => {
		console.error("Falha no backfill:", error?.message ?? error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
