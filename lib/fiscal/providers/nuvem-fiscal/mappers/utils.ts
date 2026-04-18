import type { TFiscalOperationConsumerPresenceEnum, TFiscalOperationFinalityEnum } from "@/schemas/enums";

export function mapFiscalFinalityToNfeCode(finalidade: TFiscalOperationFinalityEnum): 1 | 2 | 3 | 4 {
	switch (finalidade) {
		case "NORMAL":
			return 1;
		case "COMPLEMENTAR":
			return 2;
		case "AJUSTE":
			return 3;
		case "DEVOLUCAO":
			return 4;
	}
}

export function mapConsumerPresenceToNfeCode(presenca: TFiscalOperationConsumerPresenceEnum): 0 | 1 | 2 | 3 | 4 {
	switch (presenca) {
		case "NAO_SE_APLICA":
			return 0;
		case "OPERACAO_PRESENCIAL":
			return 1;
		case "INTERNET":
			return 2;
		case "TELEATENDIMENTO":
			return 3;
		case "ENTREGA_DOMICILIO":
			return 4;
	}
}
