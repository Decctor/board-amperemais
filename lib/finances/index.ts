type TFixedAccountChartsNames =
	| "ATIVOS"
	| "PASSIVOS"
	| "RECEITAS"
	| "DESPESAS"
	| "REAJUSTES DE ATIVOS"
	| "ATIVOS - CONTAS A RECEBER"
	| "ATIVOS - ESTOQUE"
	| "PASSIVOS - CONTAS A PAGAR"
	| "PASSIVOS - FORNECEDORES"
	| "RECEITAS - RECEITAS OPERACIONAIS"
	| "DESPESAS - DESPESAS OPERACIONAIS"
	| "CUSTOS"
	| "PATRIMÔNIO LÍQUIDO"
	| "REAJUSTES DE ATIVOS";

export const FixedAccountCharts = [
	{
		id: "1f58f82a-200e-443a-a730-4f2ea662d2f7",
		name: "ATIVOS",
		description: "Conta principal de ativos",
		children: [
			{
				id: "57bbd0fd-2f7e-4941-b46c-0cadd3320894",
				name: "ATIVOS - CONTAS A RECEBER",
				description: "Conta de contas a receber",
			},
			{
				id: "037d658e-9c23-4ea4-af95-192e4a1fd0a8",
				name: "ATIVOS - ESTOQUE",
				description: "Conta de estoque",
			},
		],
	},
	{
		id: "9fce8a26-8bd3-48e1-9c8f-6b2766d220d8",
		name: "PASSIVOS",
		description: "Conta principal de passivos",
		children: [
			{
				id: "cc7702a8-8b74-4dd1-a324-a9aaa1cf9dd9",
				name: "PASSIVOS - CONTAS A PAGAR",
				description: "Conta de contas a pagar",
			},
			{
				id: "0abb5be8-535a-468c-9af8-c41b27d44023",
				name: "PASSIVOS - FORNECEDORES",
				description: "Conta de fornecedores",
			},
		],
	},
	{
		id: "390da598-c4e0-42d7-949d-9f6372eb7eef",
		name: "RECEITAS",
		description: "Conta principal de receitas",
		children: [
			{
				id: "e7103c1e-c456-4b87-b7c7-6a94aca41b5b",
				name: "RECEITAS - RECEITAS OPERACIONAIS",
				description: "Conta de receitas operacionais",
			},
		],
	},
	{
		id: "6da1afdc-bfa7-49f0-a39e-d1a170580697",
		name: "DESPESAS",
		description: "Conta principal de despesas",
		children: [
			{
				id: "f04ddf3e-e877-468b-b25f-50ccc3b3266b",
				name: "DESPESAS - DESPESAS OPERACIONAIS",
				description: "Conta de despesas operacionais",
			},
		],
	},
	{
		id: "2b18c4fd-d926-4328-96b6-d45f50c992c9",
		name: "CUSTOS",
		description: "Conta principal de custos",
		children: [],
	},
	{
		id: "1e81118c-1f4c-4774-946f-b43221305eb7",
		name: "PATRIMÔNIO LÍQUIDO",
		description: "Conta para patrimônio líquido",
		children: [],
	},
	{
		id: "5be79227-a7e6-4d86-8251-764b132e7e3b",
		name: "REAJUSTES DE ATIVOS",
		description: "Conta para reajustes de ativos",
		children: [],
	},
];

export function getFixedAccountChartId(chartName: TFixedAccountChartsNames) {
	try {
		const mainChart = FixedAccountCharts.find((c) => c.name === chartName);
		if (mainChart) return mainChart.id;
		const subChart = FixedAccountCharts.flatMap((c) => c.children).find((c) => c.name === chartName);
		if (!subChart) throw new Error("Conta não encontrada");
		return subChart.id;
	} catch (error) {
		console.log("Error in getFixedAccountChartId:", error);
		throw error;
	}
}

export function getRevenueRelatedAccountChartsIds() {
	const revenueAccountChart = FixedAccountCharts.find((c) => c.name === "RECEITAS");
	if (!revenueAccountChart) throw new Error("Conta de receitas não encontrada");
	return [revenueAccountChart.id, ...(revenueAccountChart?.children?.map((c) => c.id) || [])];
}
export function getExpenseRelatedAccountChartsIds() {
	const expenseAccountChart = FixedAccountCharts.find((c) => c.name === "DESPESAS");
	if (!expenseAccountChart) throw new Error("Conta de despesas não encontrada");
	return [expenseAccountChart.id, ...(expenseAccountChart?.children?.map((c) => c.id) || [])];
}
export function getCostRelatedAccountChartsIds() {
	const costAccountChart = FixedAccountCharts.find((c) => c.name === "CUSTOS");
	if (!costAccountChart) throw new Error("Conta de custos não encontrada");
	return [costAccountChart.id];
}
