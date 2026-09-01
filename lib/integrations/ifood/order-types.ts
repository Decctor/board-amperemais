import type { TIfoodOrder } from "@/lib/data-connectors/ifood/types";
import z from "zod";

/**
 * Schemas das respostas da Order API v1.0 do iFood (tolerantes, `.passthrough()`) e os DTOs
 * em PT consumidos pela UI. A UI nunca vê o shape cru do iFood — só os `TIfood*DTO` mapeados.
 *
 * O parse do pedido em si reusa `IfoodOrderSchema` do data-connector (`lib/data-connectors/ifood`),
 * que já é tolerante; aqui ficam o mapeamento para DTO e os schemas exclusivos de gestão.
 */

const NullableString = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((value) => (value === null || value === undefined ? null : String(value)));

// ---------------------------------------------------------------------------
// Motivos de cancelamento
// ---------------------------------------------------------------------------

const IfoodCancellationReasonResponseSchema = z
	.object({
		/** Order API v1.0 (doc) */
		code: NullableString,
		/** Formato retornado na prática pelo GET /cancellationReasons */
		cancelCodeId: NullableString,
		description: NullableString,
	})
	.passthrough();

export const IfoodCancellationReasonsResponseSchema = z.union([
	z.array(IfoodCancellationReasonResponseSchema),
	z.object({ reasons: z.array(IfoodCancellationReasonResponseSchema) }).passthrough(),
]);

export type TIfoodCancellationReasonDTO = {
	codigo: string;
	descricao: string;
};

export function mapIfoodCancellationReasons(parsed: z.infer<typeof IfoodCancellationReasonsResponseSchema>): TIfoodCancellationReasonDTO[] {
	const reasons = Array.isArray(parsed) ? parsed : parsed.reasons;
	return reasons.flatMap((reason) => {
		const codigo = reason.code ?? reason.cancelCodeId;
		if (!codigo) return [];
		return [{ codigo, descricao: reason.description ?? codigo }];
	});
}

// ---------------------------------------------------------------------------
// Detalhes do pedido (DTO para a UI)
// ---------------------------------------------------------------------------

export type TIfoodOrderItemDTO = {
	nome: string;
	quantidade: number;
	valorUnitario: number;
	valorTotal: number;
	observacoes: string | null;
	complementos: {
		nome: string;
		quantidade: number;
		valorTotal: number;
	}[];
};

export type TIfoodOrderDetailsDTO = {
	id: string;
	displayId: string | null;
	/** DELIVERY | TAKEOUT | DINE_IN */
	tipo: string | null;
	/** IMMEDIATE | SCHEDULED */
	agendamento: string | null;
	status: string | null;
	categoria: string | null;
	canalVenda: string | null;
	ehTeste: boolean;
	criadoEm: string | null;
	confirmadoEm: string | null;
	concluidoEm: string | null;
	canceladoEm: string | null;
	merchant: { id: string | null; nome: string | null };
	cliente: {
		nome: string | null;
		telefone: string | null;
		documento: string | null;
	};
	entrega: {
		entreguePor: string | null;
		endereco: string | null;
	};
	itens: TIfoodOrderItemDTO[];
	totais: {
		subtotal: number;
		taxaEntrega: number;
		taxasAdicionais: number;
		descontos: number;
		total: number;
	};
	pagamento: {
		prePago: number;
		pendente: number;
	};
};

function formatDeliveryAddress(order: TIfoodOrder): string | null {
	const address = order.delivery?.deliveryAddress;
	if (!address) return null;
	const streetLine = [address.streetName, address.streetNumber].filter(Boolean).join(", ");
	const parts = [streetLine, address.complement, address.neighborhood, address.city, address.state, address.postalCode].filter(Boolean);
	return parts.length ? parts.join(" · ") : null;
}

export function mapIfoodOrderDetails(order: TIfoodOrder): TIfoodOrderDetailsDTO {
	const passthrough = order as Record<string, unknown>;

	return {
		id: order.id,
		displayId: order.displayId,
		tipo: order.orderType,
		agendamento: order.orderTiming,
		status: order.status,
		categoria: order.category,
		canalVenda: order.salesChannel,
		ehTeste: passthrough.isTest === true,
		criadoEm: order.createdAt,
		confirmadoEm: order.confirmedAt,
		concluidoEm: order.concludedAt,
		canceladoEm: order.cancelledAt,
		merchant: {
			id: order.merchant?.id ?? null,
			nome: order.merchant?.name ?? null,
		},
		cliente: {
			nome: order.customer?.name ?? null,
			telefone: order.customer?.phone?.number ?? null,
			documento: order.customer?.documentNumber ?? null,
		},
		entrega: {
			entreguePor: order.delivery?.deliveredBy ?? null,
			endereco: formatDeliveryAddress(order),
		},
		itens: order.items.map((item) => ({
			nome: item.name ?? "ITEM IFOOD",
			quantidade: item.quantity,
			valorUnitario: item.unitPrice,
			valorTotal: item.totalPrice,
			observacoes: item.observations,
			complementos: item.options.map((option) => ({
				nome: option.name ?? "COMPLEMENTO",
				quantidade: option.quantity,
				valorTotal: option.totalPrice,
			})),
		})),
		totais: {
			subtotal: order.total.subTotal,
			taxaEntrega: order.total.deliveryFee,
			taxasAdicionais: order.total.additionalFees,
			descontos: order.total.benefits,
			total: order.total.orderAmount,
		},
		pagamento: {
			prePago: order.payments?.prepaid ?? 0,
			pendente: order.payments?.pending ?? 0,
		},
	};
}

// ---------------------------------------------------------------------------
// Ações de pedido
// ---------------------------------------------------------------------------

export const IfoodOrderActionEnum = z.enum(["confirm", "startPreparation", "readyToPickup", "dispatch", "requestCancellation"], {
	required_error: "Ação do pedido não informada.",
	invalid_type_error: "Ação de pedido inválida.",
});
export type TIfoodOrderActionEnum = z.infer<typeof IfoodOrderActionEnum>;

export const IFOOD_ORDER_ACTION_LABELS: Record<TIfoodOrderActionEnum, string> = {
	confirm: "confirmado",
	startPreparation: "em preparo",
	readyToPickup: "marcado como pronto",
	dispatch: "despachado",
	requestCancellation: "com cancelamento solicitado",
};
