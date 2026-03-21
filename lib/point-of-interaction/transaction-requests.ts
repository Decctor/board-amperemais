import type { TCreatePointOfInteractionTransactionOutput, TCreatePointOfInteractionTransactionRequestInput } from "@/app/api/point-of-interaction/new-transaction/route";
import type { TPoiTransactionRequestStatusEnum } from "@/schemas/enums";

export type TPoiTransactionRequestSummary = {
	cliente: {
		id: string | null;
		nome: string;
		telefone: string;
	};
	venda: {
		valorBruto: number;
		valorResgate: number;
		valorFinal: number;
		modo: "DESCONTO" | "RECOMPENSA";
		codigoParceiro: string | null;
	};
	recompensa: {
		prizeId: string;
		prizeValue: number;
	} | null;
	resultadoProcessamento?: TCreatePointOfInteractionTransactionOutput["data"] | null;
	statusPublico?: TPoiTransactionRequestStatusEnum;
};

export function buildPoiTransactionRequestSummary(input: TCreatePointOfInteractionTransactionRequestInput): TPoiTransactionRequestSummary {
	return {
		cliente: {
			id: input.client.id ?? null,
			nome: input.client.nome,
			telefone: input.client.telefone,
		},
		venda: {
			valorBruto: input.sale.valor,
			valorResgate: input.sale.cashback.aplicar ? input.sale.cashback.valor : 0,
			valorFinal: Math.max(0, input.sale.valor - (input.sale.cashback.aplicar ? input.sale.cashback.valor : 0)),
			modo: input.sale.prizeRedemption ? "RECOMPENSA" : "DESCONTO",
			codigoParceiro: input.sale.partnerCode ?? null,
		},
		recompensa: input.sale.prizeRedemption
			? {
				prizeId: input.sale.prizeRedemption.prizeId,
				prizeValue: input.sale.prizeRedemption.prizeValue,
			}
			: null,
	};
}

export function withPoiTransactionProcessingResult({
	resumo,
	resultado,
	status,
}: {
	resumo: TPoiTransactionRequestSummary | null | undefined;
	resultado: TCreatePointOfInteractionTransactionOutput["data"] | null;
	status: TPoiTransactionRequestStatusEnum;
}) {
	if (!resumo) {
		throw new Error("Resumo da solicitação POI não informado.");
	}

	return {
		...resumo,
		resultadoProcessamento: resultado,
		statusPublico: status,
	};
}
