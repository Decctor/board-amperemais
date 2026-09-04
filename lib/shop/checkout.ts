// Ordem canônica das etapas do checkout da loja. Toda derivação de navegação/título parte daqui —
// uma etapa nova entra neste array e nos títulos tipados, e o resto do fluxo acompanha.
export const SHOP_CHECKOUT_STEPS = ["CLIENTE", "ENTREGA", "CASHBACK", "PAGAMENTO", "REVISAO"] as const;
export type TShopCheckoutStep = (typeof SHOP_CHECKOUT_STEPS)[number];

// CASHBACK é o título genérico da etapa de benefícios; o cabeçalho troca pelo de
// getShopBenefitsTitle conforme as capacidades da loja.
export const SHOP_CHECKOUT_STEP_TITLES: Record<TShopCheckoutStep, string> = {
	CLIENTE: "Seus dados",
	ENTREGA: "Forma de entrega",
	CASHBACK: "Descontos",
	PAGAMENTO: "Forma de pagamento",
	REVISAO: "Revisar pedido",
};

export type TShopBenefitCapabilities = {
	cupons: boolean;
	descontoCashback: boolean;
	recompensas: boolean;
};

export type TShopCashbackCapabilityProgram = {
	modalidadeDescontosPermitida: boolean;
	modalidadeRecompensasPermitida: boolean;
	resgatePermitirViaLojaDigital: boolean;
};

/**
 * O que o programa de cashback oferece NA LOJA: modalidade × superfície. Sem o resgate pela loja
 * digital (`resgatePermitirViaLojaDigital`, lib/cashback/redemption-policy) nenhuma modalidade
 * aparece — a etapa de benefícios some inteira, como quando não há cupom. Compartilhada por
 * CheckoutSheet e CashbackStep para as duas telas não divergirem.
 */
export function getShopCashbackCapabilities(program: TShopCashbackCapabilityProgram | null | undefined) {
	const shopRedemptionAllowed = !!program?.resgatePermitirViaLojaDigital;
	return {
		descontoCashback: shopRedemptionAllowed && !!program?.modalidadeDescontosPermitida,
		recompensas: shopRedemptionAllowed && !!program?.modalidadeRecompensasPermitida,
	};
}

export function hasShopBenefits(capabilities: TShopBenefitCapabilities) {
	return capabilities.cupons || capabilities.descontoCashback || capabilities.recompensas;
}

export function getShopCheckoutSteps(capabilities: TShopBenefitCapabilities): TShopCheckoutStep[] {
	return SHOP_CHECKOUT_STEPS.filter((step) => step !== "CASHBACK" || hasShopBenefits(capabilities));
}

/**
 * Próxima etapa a partir da POSIÇÃO CANÔNICA da atual — nunca de um indexOf na lista visível.
 * A lista visível é recalculada com dados assíncronos (cupons), então a etapa em que o usuário
 * está pode sumir dela; com indexOf, o -1 mandava o usuário de volta ao início do checkout.
 */
export function getNextShopCheckoutStep(current: TShopCheckoutStep, visibleSteps: TShopCheckoutStep[]): TShopCheckoutStep {
	const canonicalIndex = SHOP_CHECKOUT_STEPS.indexOf(current);
	const next = visibleSteps.find((step) => SHOP_CHECKOUT_STEPS.indexOf(step) > canonicalIndex);
	return next ?? visibleSteps[visibleSteps.length - 1] ?? current;
}

/** Contraparte de getNextShopCheckoutStep: última etapa visível antes da posição canônica da atual. */
export function getPreviousShopCheckoutStep(current: TShopCheckoutStep, visibleSteps: TShopCheckoutStep[]): TShopCheckoutStep {
	const canonicalIndex = SHOP_CHECKOUT_STEPS.indexOf(current);
	const previous = [...visibleSteps].reverse().find((step) => SHOP_CHECKOUT_STEPS.indexOf(step) < canonicalIndex);
	return previous ?? visibleSteps[0] ?? current;
}

export function getShopBenefitsTitle(capabilities: TShopBenefitCapabilities) {
	const enabledCount = [capabilities.cupons, capabilities.descontoCashback, capabilities.recompensas].filter(Boolean).length;
	if (enabledCount > 1) return "Benefícios";
	if (capabilities.recompensas) return "Recompensas";
	if (capabilities.descontoCashback) return "Cashback";
	return "Cupons";
}
