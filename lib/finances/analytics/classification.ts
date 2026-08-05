import type { TAccountChartNatureEnum } from "@/schemas/enums";

/**
 * Classificação DRE por `natureza` do plano de contas. Diferente da referência (syncroniza-control),
 * que classifica percorrendo a árvore a partir de raízes fixas, aqui cada conta carrega a própria
 * natureza — sub-contas criadas pela organização entram pelo valor do campo, não pela ancestralidade.
 * A árvore (`idContaPai`) é usada apenas para o roll-up de exibição.
 */
export type TDreChartAccount = {
	id: string;
	nome: string;
	natureza: TAccountChartNatureEnum;
	idContaPai: string | null;
};

export type TDreClassification = {
	accountById: Map<string, TDreChartAccount>;
	revenueIds: Set<string>;
	costIds: Set<string>;
	expenseIds: Set<string>;
};

export function buildDreClassification(accounts: TDreChartAccount[]): TDreClassification {
	const revenueIds = new Set<string>();
	const costIds = new Set<string>();
	const expenseIds = new Set<string>();
	for (const account of accounts) {
		if (account.natureza === "RECEITA") revenueIds.add(account.id);
		else if (account.natureza === "CUSTO") costIds.add(account.id);
		else if (account.natureza === "DESPESA") expenseIds.add(account.id);
	}
	return {
		accountById: new Map(accounts.map((account) => [account.id, account])),
		revenueIds,
		costIds,
		expenseIds,
	};
}

export type TDreCategoryTotals = {
	revenueByAccount: Map<string, number>;
	costByAccount: Map<string, number>;
	expenseByAccount: Map<string, number>;
};

/**
 * Acumula totais diretos por conta a partir de linhas agrupadas (crédito, débito, total).
 * Receita reconhecida pelo lado do crédito; custo e despesa pelo lado do débito.
 */
export function accumulateCategoryTotals(
	rows: Array<{ creditId: string; debitId: string; total: number }>,
	classification: TDreClassification,
): TDreCategoryTotals {
	const revenueByAccount = new Map<string, number>();
	const costByAccount = new Map<string, number>();
	const expenseByAccount = new Map<string, number>();
	for (const row of rows) {
		if (classification.revenueIds.has(row.creditId)) revenueByAccount.set(row.creditId, (revenueByAccount.get(row.creditId) || 0) + row.total);
		if (classification.costIds.has(row.debitId)) costByAccount.set(row.debitId, (costByAccount.get(row.debitId) || 0) + row.total);
		else if (classification.expenseIds.has(row.debitId)) expenseByAccount.set(row.debitId, (expenseByAccount.get(row.debitId) || 0) + row.total);
	}
	return { revenueByAccount, costByAccount, expenseByAccount };
}

export function sumMapValues(map: Map<string, number>) {
	let total = 0;
	for (const value of map.values()) total += value;
	return total;
}

export type TDreTreeNode = {
	contaId: string;
	nome: string;
	total: number;
	totalAnterior: number;
	filhos: TDreTreeNode[];
};

const MAX_ACCOUNT_TREE_DEPTH = 20;

/**
 * Monta a árvore de uma categoria (contas do conjunto `categoryIds`) com totais acumulados nos
 * ancestrais: cada nó agrega lançamentos diretos + descendentes. Nós zerados nos dois períodos são
 * podados; irmãos ordenados por total desc. Raízes da categoria são contas sem pai ou cujo pai está
 * fora do conjunto (ex.: pai de outra natureza).
 */
export function buildCategoryTree({
	categoryIds,
	accountById,
	currentTotals,
	previousTotals,
}: {
	categoryIds: Set<string>;
	accountById: Map<string, TDreChartAccount>;
	currentTotals: Map<string, number>;
	previousTotals: Map<string, number>;
}): TDreTreeNode[] {
	const isCategoryParent = (accountId: string): string | null => {
		const parentId = accountById.get(accountId)?.idContaPai ?? null;
		return parentId && categoryIds.has(parentId) ? parentId : null;
	};

	const childrenByParent = new Map<string, string[]>();
	const rootIds: string[] = [];
	for (const accountId of categoryIds) {
		const parentId = isCategoryParent(accountId);
		if (!parentId) {
			rootIds.push(accountId);
			continue;
		}
		const siblings = childrenByParent.get(parentId) || [];
		siblings.push(accountId);
		childrenByParent.set(parentId, siblings);
	}

	const rolledTotals = new Map<string, { total: number; totalAnterior: number }>();
	const rollUp = (directTotals: Map<string, number>, key: "total" | "totalAnterior") => {
		for (const [accountId, value] of directTotals) {
			if (!categoryIds.has(accountId)) continue;
			let cursorId: string | null = accountId;
			for (let depth = 0; depth < MAX_ACCOUNT_TREE_DEPTH && cursorId; depth++) {
				const node = rolledTotals.get(cursorId) || { total: 0, totalAnterior: 0 };
				node[key] += value;
				rolledTotals.set(cursorId, node);
				cursorId = isCategoryParent(cursorId);
			}
		}
	};
	rollUp(currentTotals, "total");
	rollUp(previousTotals, "totalAnterior");

	const buildNodes = (ids: string[]): TDreTreeNode[] =>
		ids
			.map((accountId) => {
				const totals = rolledTotals.get(accountId);
				if (!totals || (totals.total === 0 && totals.totalAnterior === 0)) return null;
				return {
					contaId: accountId,
					nome: accountById.get(accountId)?.nome || "Conta desconhecida",
					total: totals.total,
					totalAnterior: totals.totalAnterior,
					filhos: buildNodes(childrenByParent.get(accountId) || []),
				};
			})
			.filter((node): node is TDreTreeNode => node !== null)
			.sort((a, b) => b.total - a.total);

	return buildNodes(rootIds);
}
