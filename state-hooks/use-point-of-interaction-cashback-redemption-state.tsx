"use client";

import { useCallback, useState } from "react";
import z from "zod";

export const PointOfInteractionCashbackRedemptionStateSchema = z.object({
	orgId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	client: z.object({
		id: z
			.string({
				invalid_type_error: "Tipo não válido para ID do cliente.",
			})
			.optional()
			.nullable(),
		nome: z.string({
			required_error: "Nome do cliente não informado.",
			invalid_type_error: "Tipo não válido para nome do cliente.",
		}),
		telefone: z.string({
			required_error: "Telefone não informado.",
			invalid_type_error: "Tipo não válido para telefone.",
		}),
	}),
	saleValue: z
		.number({
			required_error: "Valor da venda não informado.",
			invalid_type_error: "Tipo não válido para valor da venda.",
		})
		.nonnegative()
		.default(0),
	redemptionValue: z
		.number({
			required_error: "Valor do resgate não informado.",
			invalid_type_error: "Tipo não válido para valor do resgate.",
		})
		.nonnegative()
		.default(0),
	operatorIdentifier: z.string({
		required_error: "Identificador do operador não informado.",
		invalid_type_error: "Tipo não válido para identificador do operador.",
	}),
});
export type TPointOfInteractionCashbackRedemptionState = z.infer<typeof PointOfInteractionCashbackRedemptionStateSchema>;

export function usePointOfInteractionCashbackRedemptionState(initialOrgId: string) {
	const [state, setState] = useState<TPointOfInteractionCashbackRedemptionState>({
		orgId: initialOrgId,
		client: { id: null, nome: "", telefone: "" },
		saleValue: 0,
		redemptionValue: 0,
		operatorIdentifier: "",
	});

	const updateClient = useCallback((client: Partial<TPointOfInteractionCashbackRedemptionState["client"]>) => {
		setState((prev) => ({
			...prev,
			client: { ...prev.client, ...client },
		}));
	}, []);

	const updateSaleValue = useCallback((saleValue: number) => {
		setState((prev) => ({
			...prev,
			saleValue,
		}));
	}, []);

	const updateRedemptionValue = useCallback((redemptionValue: number) => {
		setState((prev) => ({
			...prev,
			redemptionValue,
		}));
	}, []);

	const updateOperatorIdentifier = useCallback((operatorIdentifier: string) => {
		setState((prev) => ({
			...prev,
			operatorIdentifier,
		}));
	}, []);

	const resetState = useCallback(() => {
		setState({
			orgId: initialOrgId,
			client: { id: null, nome: "", telefone: "" },
			saleValue: 0,
			redemptionValue: 0,
			operatorIdentifier: "",
		});
	}, [initialOrgId]);

	return {
		state,
		updateClient,
		updateSaleValue,
		updateRedemptionValue,
		updateOperatorIdentifier,
		resetState,
	};
}
export type TUsePointOfInteractionCashbackRedemptionState = ReturnType<typeof usePointOfInteractionCashbackRedemptionState>;
