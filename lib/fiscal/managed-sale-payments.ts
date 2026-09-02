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
		// O patrocinio ja entra como VALE logo abaixo, a partir do metadata. Como ele tambem existe
		// como transacao financeira da venda, precisa sair do rateio do cliente — senao a parcela do
		// consumidor seria diluida na linha do patrocinador e os metodos sairiam errados.
		//
		// Sai o VALOR patrocinado, nao o metodo: vale-refeicao, vale-alimentacao e gift card do
		// cliente tambem chegam como VALE (ver IFOOD_PAYMENT_METHOD_MAP) e `loadSalePayments` agrega
		// tudo num unico balde por metodo. Descartar o balde inteiro apagaria um pagamento real.
		let sponsoredToDeduct = sponsoredTotal;
		const customerPayments = payments
			.map((payment) => {
				if (payment.metodo !== "VALE" || sponsoredToDeduct <= 0) return payment;
				const deduction = Math.min(payment.valor, sponsoredToDeduct);
				sponsoredToDeduct = round2(sponsoredToDeduct - deduction);
				return { ...payment, valor: round2(payment.valor - deduction) };
			})
			.filter((payment) => payment.valor > 0);
		const rawCustomerTotal = customerPayments.reduce((sum, payment) => sum + payment.valor, 0);
		if (rawCustomerTotal <= 0) {
			result.push({ metodo: "OUTRO", valor: customerPortion });
		} else {
			// Rateio proporcional com resto no último método (a soma precisa fechar exata no vNF).
			let allocated = 0;
			customerPayments.forEach((payment, index) => {
				const valor =
					index === customerPayments.length - 1 ? round2(customerPortion - allocated) : round2((customerPortion * payment.valor) / rawCustomerTotal);
				allocated = round2(allocated + valor);
				if (valor > 0) result.push({ metodo: payment.metodo, valor });
			});
		}
	}

	if (sponsoredPortion > 0) result.push({ metodo: "VALE", valor: round2(sponsoredPortion) });

	return result.length > 0 ? result : [{ metodo: "OUTRO", valor: round2(fiscalTotal) }];
}
