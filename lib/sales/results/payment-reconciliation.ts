export type TPaymentReconciliationRow = {
	valorVenda: number;
	valorEntradas: number;
	valorDinheiro: number;
	trocoRegistrado: number;
	taxasCanal: number;
};

export type TPaymentReconciliation = {
	totalBruto: number;
	totalRecebido: number;
	ajustes: {
		total: number;
		troco: number;
		trocoRegistrado: number;
		trocoInferido: number;
		taxasCanal: number;
		naoClassificado: number;
	};
};

function round2(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Concilia os recebimentos brutos com o valor autoritativo de cada venda.
 *
 * O financeiro registra o valor entregue pelo cliente como ENTRADA. Troco e taxas retidas pelo
 * canal saem em transacoes separadas, portanto o total liquido do relatorio precisa desconta-los.
 * Vendas antigas podem nao ter a SAIDA de TROCO: nesse caso, o excesso coberto por DINHEIRO e
 * classificado como troco inferido, sem alterar o ledger historico.
 */
export function reconcilePaymentTotals(rows: TPaymentReconciliationRow[]): TPaymentReconciliation {
	let totalBruto = 0;
	let totalAjustes = 0;
	let trocoRegistrado = 0;
	let trocoInferido = 0;
	let taxasCanal = 0;
	let naoClassificado = 0;

	for (const row of rows) {
		const entradas = round2(Math.max(0, row.valorEntradas));
		const excesso = round2(Math.max(0, entradas - Math.max(0, row.valorVenda)));
		totalBruto = round2(totalBruto + entradas);
		if (excesso === 0) continue;

		let restante = excesso;
		const taxaAplicada = Math.min(restante, round2(Math.max(0, row.taxasCanal)));
		taxasCanal = round2(taxasCanal + taxaAplicada);
		restante = round2(restante - taxaAplicada);

		const trocoPersistidoAplicado = Math.min(restante, round2(Math.max(0, row.trocoRegistrado)));
		trocoRegistrado = round2(trocoRegistrado + trocoPersistidoAplicado);
		restante = round2(restante - trocoPersistidoAplicado);

		// Compatibilidade com vendas anteriores ao registro explicito de troco. O limite pelo valor
		// recebido em dinheiro impede classificar excesso de cartao/PIX como troco automaticamente.
		const dinheiroDisponivel = round2(Math.max(0, row.valorDinheiro - trocoPersistidoAplicado));
		const trocoLegadoAplicado = Math.min(restante, dinheiroDisponivel);
		trocoInferido = round2(trocoInferido + trocoLegadoAplicado);
		restante = round2(restante - trocoLegadoAplicado);

		naoClassificado = round2(naoClassificado + restante);
		totalAjustes = round2(totalAjustes + excesso);
	}

	return {
		totalBruto,
		totalRecebido: round2(totalBruto - totalAjustes),
		ajustes: {
			total: totalAjustes,
			troco: round2(trocoRegistrado + trocoInferido),
			trocoRegistrado,
			trocoInferido,
			taxasCanal,
			naoClassificado,
		},
	};
}
