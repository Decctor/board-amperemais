type TAccountChartWithNature = {
	id: string;
	natureza: "ATIVO" | "PASSIVO" | "PATRIMONIO_LIQUIDO" | "RECEITA" | "CUSTO" | "DESPESA";
};

export function getAccountChartIdsByNatureza(accounts: TAccountChartWithNature[], natureza: TAccountChartWithNature["natureza"]) {
	return accounts.filter((account) => account.natureza === natureza).map((account) => account.id);
}
