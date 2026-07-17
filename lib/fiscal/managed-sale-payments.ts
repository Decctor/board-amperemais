import type { TSaleIntegrationMetadata } from "@/schemas/sales";
import type { TFiscalSalePayment } from "./types";

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Pagamentos FISCAIS de uma venda de canal gerenciado (fase 5/C2).
 *
 * As transações financeiras somam o valor cheio do pedido (inclui taxas do canal e frete de
 * entrega do canal, que ficam fora da NF) — usá-las cruas geraria `vTroco` artificial na NFC-e.
 * Aqui os pagamentos são reconstruídos para somar exatamente o total fiscal (vNF):
 * - a parcela paga por patrocinadores (benefits IFOOD/EXTERNAL/CHAIN — NF cheia) entra como VALE;
 * - o restante é distribuído proporcionalmente entre os métodos reais do cliente.
 * O financeiro (fase 4) permanece com os valores cheios — este ajuste é só a visão fiscal.
 */
export function buildFiscalPaymentsForManagedSale({
	payments,
	integracaoMetadados,
	fiscalTotal,
}: {
	payments: TFiscalSalePayment[];
	integracaoMetadados: TSaleIntegrationMetadata;
	fiscalTotal: number;
}): TFiscalSalePayment[] {
	if (fiscalTotal <= 0) return [];

	const sponsoredTotal = round2(integracaoMetadados.descontos.patrocinados.reduce((sum, sponsored) => sum + sponsored.valor, 0));
	const sponsoredPortion = Math.min(sponsoredTotal, fiscalTotal);
	const customerPortion = round2(fiscalTotal - sponsoredPortion);

	const result: TFiscalSalePayment[] = [];

	if (customerPortion > 0) {
		const rawCustomerTotal = payments.reduce((sum, payment) => sum + payment.valor, 0);
		if (rawCustomerTotal <= 0) {
			result.push({ metodo: "OUTRO", valor: customerPortion });
		} else {
			// Rateio proporcional com resto no último método (a soma precisa fechar exata no vNF).
			let allocated = 0;
			payments.forEach((payment, index) => {
				const valor = index === payments.length - 1 ? round2(customerPortion - allocated) : round2((customerPortion * payment.valor) / rawCustomerTotal);
				allocated = round2(allocated + valor);
				if (valor > 0) result.push({ metodo: payment.metodo, valor });
			});
		}
	}

	if (sponsoredPortion > 0) result.push({ metodo: "VALE", valor: round2(sponsoredPortion) });

	return result.length > 0 ? result : [{ metodo: "OUTRO", valor: round2(fiscalTotal) }];
}
