import { useCallback, useMemo, useState } from "react";
import z from "zod";

// Cart item modifier schema
export const CartItemModifierSchema = z.object({
	opcaoId: z.string({
		required_error: "ID da opção não informado.",
		invalid_type_error: "Tipo não válido para ID da opção.",
	}),
	nome: z.string({
		required_error: "Nome do modificador não informado.",
		invalid_type_error: "Tipo não válido para nome do modificador.",
	}),
	quantidade: z.number({
		required_error: "Quantidade do modificador não informada.",
		invalid_type_error: "Tipo não válido para quantidade do modificador.",
	}),
	valorUnitario: z.number({
		required_error: "Valor unitário do modificador não informado.",
		invalid_type_error: "Tipo não válido para valor unitário do modificador.",
	}),
	valorTotal: z.number({
		required_error: "Valor total do modificador não informado.",
		invalid_type_error: "Tipo não válido para valor total do modificador.",
	}),
});

// Cart item schema
export const CartItemSchema = z.object({
	tempId: z.string({
		required_error: "ID temporário não informado.",
		invalid_type_error: "Tipo não válido para ID temporário.",
	}),
	produtoId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para ID do produto.",
	}),
	produtoVarianteId: z
		.string({
			invalid_type_error: "Tipo não válido para ID da variante.",
		})
		.optional()
		.nullable(),

	// Snapshot data (for display and history)
	nome: z.string({
		required_error: "Nome do item não informado.",
		invalid_type_error: "Tipo não válido para nome do item.",
	}),
	codigo: z.string({
		required_error: "Código do item não informado.",
		invalid_type_error: "Tipo não válido para código do item.",
	}),
	imagemUrl: z
		.string({
			invalid_type_error: "Tipo não válido para URL da imagem.",
		})
		.optional()
		.nullable(),

	// Pricing
	quantidade: z
		.number({
			required_error: "Quantidade não informada.",
			invalid_type_error: "Tipo não válido para quantidade.",
		})
		.min(1, { message: "Quantidade deve ser no mínimo 1." }),
	valorUnitarioBase: z.number({
		required_error: "Valor unitário base não informado.",
		invalid_type_error: "Tipo não válido para valor unitário base.",
	}),
	valorModificadores: z.number({
		required_error: "Valor de modificadores não informado.",
		invalid_type_error: "Tipo não válido para valor de modificadores.",
	}),
	valorUnitarioFinal: z.number({
		required_error: "Valor unitário final não informado.",
		invalid_type_error: "Tipo não válido para valor unitário final.",
	}),
	valorTotalBruto: z.number({
		required_error: "Valor total bruto não informado.",
		invalid_type_error: "Tipo não válido para valor total bruto.",
	}),
	valorDesconto: z
		.number({
			invalid_type_error: "Tipo não válido para valor de desconto.",
		})
		.default(0),
	valorTotalLiquido: z.number({
		required_error: "Valor total líquido não informado.",
		invalid_type_error: "Tipo não válido para valor total líquido.",
	}),

	// Modifiers/Add-ons selected
	modificadores: z.array(CartItemModifierSchema),
});

// Sale state schema
export const SaleStateSchema = z.object({
	cliente: z
		.object({
			id: z.string({
				required_error: "ID do cliente não informado.",
				invalid_type_error: "Tipo não válido para ID do cliente.",
			}),
			nome: z.string({
				required_error: "Nome do cliente não informado.",
				invalid_type_error: "Tipo não válido para nome do cliente.",
			}),
			telefone: z.string({
				required_error: "Telefone do cliente não informado.",
				invalid_type_error: "Tipo não válido para telefone do cliente.",
			}),
		})
		.optional()
		.nullable(),
	vendedorId: z
		.string({
			invalid_type_error: "Tipo não válido para ID do vendedor.",
		})
		.optional()
		.nullable(),
	vendedorNome: z
		.string({
			invalid_type_error: "Tipo não válido para nome do vendedor.",
		})
		.optional()
		.nullable(),
	itens: z.array(CartItemSchema),
});

export type TCartItemModifier = z.infer<typeof CartItemModifierSchema>;
export type TCartItem = z.infer<typeof CartItemSchema>;
export type TSaleState = z.infer<typeof SaleStateSchema>;

type UseSaleStateProps = {
	initialState?: Partial<TSaleState>;
};

export const useSaleState = ({ initialState }: UseSaleStateProps = {}) => {
	const [state, setState] = useState<TSaleState>({
		cliente: initialState?.cliente ?? null,
		vendedorId: initialState?.vendedorId ?? null,
		vendedorNome: initialState?.vendedorNome ?? null,
		itens: initialState?.itens ?? [],
	});

	// ===== CLIENT MANAGEMENT =====

	const setCliente = useCallback((cliente: TSaleState["cliente"]) => {
		setState((prev) => ({
			...prev,
			cliente,
		}));
	}, []);

	const clearCliente = useCallback(() => {
		setState((prev) => ({
			...prev,
			cliente: null,
		}));
	}, []);

	// ===== SELLER MANAGEMENT =====

	const setVendedor = useCallback((vendedorId: string | null, vendedorNome: string | null) => {
		setState((prev) => ({
			...prev,
			vendedorId,
			vendedorNome,
		}));
	}, []);

	const clearVendedor = useCallback(() => {
		setState((prev) => ({
			...prev,
			vendedorId: null,
			vendedorNome: null,
		}));
	}, []);

	// ===== CART OPERATIONS =====

	const addItem = useCallback((item: TCartItem) => {
		setState((prev) => ({
			...prev,
			itens: [...prev.itens, item],
		}));
	}, []);

	const updateItemQuantity = useCallback((tempId: string, quantidade: number) => {
		if (quantidade < 1) return; // Don't allow zero or negative quantities

		setState((prev) => ({
			...prev,
			itens: prev.itens.map((item) => {
				if (item.tempId !== tempId) return item;

				// Recalculate totals based on new quantity
				const valorTotalBruto = item.valorUnitarioFinal * quantidade;
				const valorTotalLiquido = valorTotalBruto - item.valorDesconto;

				return {
					...item,
					quantidade,
					valorTotalBruto,
					valorTotalLiquido,
				};
			}),
		}));
	}, []);

	const updateItemDiscount = useCallback((tempId: string, valorDesconto: number) => {
		setState((prev) => ({
			...prev,
			itens: prev.itens.map((item) => {
				if (item.tempId !== tempId) return item;

				// Recalculate total with new discount
				const valorTotalLiquido = item.valorTotalBruto - valorDesconto;

				return {
					...item,
					valorDesconto,
					valorTotalLiquido,
				};
			}),
		}));
	}, []);

	const removeItem = useCallback((tempId: string) => {
		setState((prev) => ({
			...prev,
			itens: prev.itens.filter((item) => item.tempId !== tempId),
		}));
	}, []);

	const clearCart = useCallback(() => {
		setState((prev) => ({
			...prev,
			itens: [],
		}));
	}, []);

	// ===== COMPUTED VALUES =====

	const getSubtotal = useCallback(() => {
		return state.itens.reduce((sum, item) => sum + item.valorTotalBruto, 0);
	}, [state.itens]);

	const getTotalDesconto = useCallback(() => {
		return state.itens.reduce((sum, item) => sum + item.valorDesconto, 0);
	}, [state.itens]);

	const getTotal = useCallback(() => {
		return state.itens.reduce((sum, item) => sum + item.valorTotalLiquido, 0);
	}, [state.itens]);

	const getItemCount = useCallback(() => {
		return state.itens.reduce((sum, item) => sum + item.quantidade, 0);
	}, [state.itens]);

	// ===== VALIDATION =====

	const isReadyForCheckout = useCallback(() => {
		return state.cliente !== null && state.itens.length > 0;
	}, [state.cliente, state.itens.length]);

	// ===== RESET STATE =====

	const resetState = useCallback((newState: TSaleState) => {
		setState(newState);
	}, []);

	// Memoized computed values for performance
	const computedValues = useMemo(
		() => ({
			subtotal: getSubtotal(),
			totalDesconto: getTotalDesconto(),
			total: getTotal(),
			itemCount: getItemCount(),
		}),
		[getSubtotal, getTotalDesconto, getTotal, getItemCount],
	);

	return {
		state,
		// Client management
		setCliente,
		clearCliente,
		// Seller management
		setVendedor,
		clearVendedor,
		// Cart operations
		addItem,
		updateItemQuantity,
		updateItemDiscount,
		removeItem,
		clearCart,
		// Computed values
		...computedValues,
		// Validation
		isReadyForCheckout: isReadyForCheckout(),
		// Utilities
		resetState,
	};
};

export type TUseSaleState = ReturnType<typeof useSaleState>;
