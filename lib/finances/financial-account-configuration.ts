import type { TFinancialAccountConfiguration } from "@/schemas/financial";
import type { TFinancialAccountTypeEnum } from "@/schemas/enums";

export function getDefaultFinancialAccountConfiguration(tipo: TFinancialAccountTypeEnum): TFinancialAccountConfiguration {
	switch (tipo) {
		case "BANCO":
			return {
				categoria: "BANCO",
				tipo: "CORRENTE",
				codigo: null,
				nome: null,
				agencia: null,
				contaNumero: null,
				contaDigito: null,
			};
		case "CAIXA":
			return { categoria: "CAIXA" };
		case "CARTEIRA_DIGITAL":
			return { categoria: "CARTEIRA_DIGITAL", integracaoAtiva: false, ultimaSincronizacao: null };
		case "CARTAO_CREDITO":
			return {
				categoria: "CARTAO_CREDITO",
				limiteCredito: null,
				diaFechamentoFatura: 25,
				diaVencimentoFatura: 5,
				contaPagamentoPadraoId: null,
				taxaJurosMensal: null,
				taxaMulta: null,
				taxaFixa: null,
			};
		case "INVESTIMENTO":
			return { categoria: "INVESTIMENTO" };
		case "OUTRO":
		default:
			return { categoria: "OUTRO" };
	}
}

export function getLegacyBankFields(configuracao: TFinancialAccountConfiguration) {
	if (configuracao.categoria !== "BANCO") {
		return {
			codigoBanco: null,
			nomeBanco: null,
			agencia: null,
			numeroConta: null,
			digitoConta: null,
			tipoConta: null,
		};
	}

	return {
		codigoBanco: configuracao.codigo ?? null,
		nomeBanco: configuracao.nome ?? null,
		agencia: configuracao.agencia ?? null,
		numeroConta: configuracao.contaNumero ?? null,
		digitoConta: configuracao.contaDigito ?? null,
		tipoConta: configuracao.tipo ?? null,
	};
}

export function isCashLikeFinancialAccountType(tipo: TFinancialAccountTypeEnum) {
	return tipo === "CAIXA" || tipo === "BANCO" || tipo === "CARTEIRA_DIGITAL";
}

export type TFinancialAccountBalanceType = "CASH" | "LIABILITY";

export function getFinancialAccountBalanceType(tipo: TFinancialAccountTypeEnum): TFinancialAccountBalanceType {
	return tipo === "CARTAO_CREDITO" ? "LIABILITY" : "CASH";
}

export function calculateFinancialAccountBalance({
	tipo,
	saldoInicial,
	totalEntradas,
	totalSaidas,
}: {
	tipo: TFinancialAccountTypeEnum;
	saldoInicial: number;
	totalEntradas: number;
	totalSaidas: number;
}) {
	return getFinancialAccountBalanceType(tipo) === "LIABILITY"
		? saldoInicial + totalSaidas - totalEntradas
		: saldoInicial + totalEntradas - totalSaidas;
}
