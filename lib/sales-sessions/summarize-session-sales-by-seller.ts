export type TSessionSaleSellerInput = { vendedorId: string | null; vendedorNome: string; valorTotal: number };

export function summarizeSessionSalesBySeller(sales: TSessionSaleSellerInput[]) {
	const groups = new Map<string, { vendedorId: string | null; vendedorNome: string; quantidadeVendas: number; valorTotal: number }>();
	for (const sale of sales) {
		const key = sale.vendedorId ?? "__SEM_VENDEDOR__";
		const current = groups.get(key) ?? {
			vendedorId: sale.vendedorId,
			vendedorNome: sale.vendedorNome || "Sem vendedor",
			quantidadeVendas: 0,
			valorTotal: 0,
		};
		current.quantidadeVendas += 1;
		current.valorTotal += sale.valorTotal;
		groups.set(key, current);
	}
	return [...groups.values()].sort((left, right) => right.valorTotal - left.valorTotal);
}
