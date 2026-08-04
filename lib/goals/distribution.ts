/**
 * Repartição do objetivo da meta entre os vendedores.
 *
 * Mesma forma do balanço de lançamento contábil em `lib/finances/accounting-entry-balance.ts` —
 * um total, N linhas, uma diferença a fechar — mas metas não são contabilidade: a soma **pode**
 * divergir do objetivo geral e a meta segue válida. A UI mostra a diferença; não bloqueia o salvamento.
 */

/** Diferença em reais que ainda conta como "fechado". Some com centavo de arredondamento. */
export const GOAL_DISTRIBUTION_TOLERANCE = 0.02;

type TDistributableSellerGoal = { objetivoValor: number; deletar?: boolean | null };

/** Soma dos objetivos dos vendedores que continuam na meta. */
export function getActiveSellerGoalsTotal(goalSellers: TDistributableSellerGoal[]) {
	return goalSellers.filter((goalSeller) => !goalSeller.deletar).reduce((acc, goalSeller) => acc + (goalSeller.objetivoValor || 0), 0);
}

/**
 * Divide um total em N partes sem perder centavos: o resto se espalha uma unidade por vez nas
 * primeiras partes, então a soma fecha exatamente com o total.
 */
export function distributeGoalEqually(total: number, count: number) {
	if (count <= 0) return [];
	const cents = Math.round(total * 100);
	const base = Math.floor(cents / count);
	const remainder = cents - base * count;
	return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

export type TGoalDistributionStatus = "SEM_VENDEDORES" | "DISTRIBUIDO" | "EXCEDENTE" | "PENDENTE";

/**
 * Estado da repartição, para o cabeçalho da tabela de vendedores.
 *
 * `restante` é o que falta distribuir e serve de valor sugerido da linha rascunho — negativo
 * quando os vendedores já passaram do objetivo geral.
 */
export function resolveGoalDistribution({ objetivoValor, goalSellers }: { objetivoValor: number; goalSellers: TDistributableSellerGoal[] }) {
	const ativos = goalSellers.filter((goalSeller) => !goalSeller.deletar);
	const total = getActiveSellerGoalsTotal(ativos);
	const restante = (objetivoValor || 0) - total;

	const temVendedores = ativos.length > 0;
	const fechado = temVendedores && Math.abs(restante) <= GOAL_DISTRIBUTION_TOLERANCE;
	const excedente = temVendedores && restante < -GOAL_DISTRIBUTION_TOLERANCE;

	const status: TGoalDistributionStatus = !temVendedores ? "SEM_VENDEDORES" : fechado ? "DISTRIBUIDO" : excedente ? "EXCEDENTE" : "PENDENTE";

	return { total, restante, status, fechado, excedente, quantidadeVendedores: ativos.length };
}

/**
 * Fatia que um vendedor carrega do objetivo geral, em pontos percentuais.
 *
 * É a coluna que o gerente realmente pensa ("a Ana leva 40% do mês"), e a mesma conta ao contrário
 * transforma a fatia digitada de volta em reais.
 */
export function resolveSellerGoalShare({ objetivoValor, objetivoValorVendedor }: { objetivoValor: number; objetivoValorVendedor: number }) {
	if (!objetivoValor || objetivoValor <= 0) return 0;
	return (objetivoValorVendedor / objetivoValor) * 100;
}

/** Converte uma fatia percentual de volta em reais, arredondando ao centavo. */
export function resolveSellerGoalValueFromShare({ objetivoValor, fatiaPercentual }: { objetivoValor: number; fatiaPercentual: number }) {
	if (!objetivoValor || objetivoValor <= 0) return 0;
	return Math.round(objetivoValor * (fatiaPercentual / 100) * 100) / 100;
}
