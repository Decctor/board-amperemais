import { formatCashbackValue, formatToMoney } from "@/lib/formatting";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema";

// Copy da regra de acúmulo do programa, usada no hub (card da org) e no banner de
// boas-vindas do perfil (chegada via fluxo de clube).
export function getCashbackAccumulationCopy(cashbackProgram: TCashbackProgramEntity): string {
	const { acumuloTipo, acumuloValor, acumuloRegraValorMinimo, terminologia } = cashbackProgram;

	let copy: string;

	if (acumuloTipo === "PERCENTUAL") {
		const referencePurchaseValue = 100;
		const earnedPerReference = (referencePurchaseValue * acumuloValor) / 100;
		copy = `A cada ${formatToMoney(referencePurchaseValue)} gastos, você ganha ${formatCashbackValue(earnedPerReference, terminologia)}`;
	} else {
		copy = `Ganhe ${formatCashbackValue(acumuloValor, terminologia)} por compra`;
	}

	if (acumuloRegraValorMinimo > 0) {
		copy += ` ( para compras a partir de ${formatToMoney(acumuloRegraValorMinimo)} )`;
	}

	return copy;
}
