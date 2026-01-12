import { ProductAddOnOptionSchema, ProductAddOnSchema, ProductSchema, ProductVariantSchema } from "@/schemas/products";
import { useCallback, useState } from "react";
import z from "zod";

export const ProductStateSchema = z.object({
	product: ProductSchema.omit({ organizacaoId: true }).extend({
		imagemCapaHolder: z.object({
			file: z.instanceof(File).optional().nullable(),
			previewUrl: z
				.string({
					required_error: "URL da imagem capa do produto não informada.",
					invalid_type_error: "Tipo não válido para URL da imagem capa do produto.",
				})
				.optional()
				.nullable(),
		}),
	}),

	productVariants: z.array(
		ProductVariantSchema.omit({ organizacaoId: true, produtoId: true }).extend({
			imagemCapaHolder: z.object({
				file: z.instanceof(File).optional().nullable(),
				previewUrl: z
					.string({
						required_error: "URL da imagem capa da variante não informada.",
						invalid_type_error: "Tipo não válido para URL da imagem capa da variante.",
					})
					.optional()
					.nullable(),
			}),
			addOns: z.array(
				ProductAddOnSchema.omit({ organizacaoId: true }).extend({
					opcoes: z.array(
						ProductAddOnOptionSchema.omit({ organizacaoId: true, produtoAddOnId: true }).extend({
							produtoConsumo: z
								.string({
									required_error: "ID do produto de consumo não informado.",
									invalid_type_error: "Tipo não válido para ID do produto de consumo.",
								})
								.optional()
								.nullable(),
							id: z
								.string({
									required_error: "ID da opção não informado.",
									invalid_type_error: "Tipo não válido para ID da opção.",
								})
								.optional(),
							deletar: z
								.boolean({
									required_error: "Deletar opção não informado.",
									invalid_type_error: "Tipo não válido para deletar opção.",
								})
								.optional(),
						}),
					),
					id: z
						.string({
							required_error: "ID do adicional não informado.",
							invalid_type_error: "Tipo não válido para ID do adicional.",
						})
						.optional(),
					deletar: z
						.boolean({
							required_error: "Deletar adicional não informado.",
							invalid_type_error: "Tipo não válido para deletar adicional.",
						})
						.optional(),
				}),
			),
			id: z
				.string({
					required_error: "ID da variante não informado.",
					invalid_type_error: "Tipo não válido para ID da variante.",
				})
				.optional(),
			deletar: z
				.boolean({
					required_error: "Deletar variante não informado.",
					invalid_type_error: "Tipo não válido para deletar variante.",
				})
				.optional(),
		}),
	),
	productAddOns: z.array(
		ProductAddOnSchema.omit({ organizacaoId: true }).extend({
			opcoes: z.array(
				ProductAddOnOptionSchema.omit({ organizacaoId: true, produtoAddOnId: true }).extend({
					produtoConsumo: z
						.string({
							required_error: "ID do produto de consumo não informado.",
							invalid_type_error: "Tipo não válido para ID do produto de consumo.",
						})
						.optional()
						.nullable(),
					id: z
						.string({
							required_error: "ID da opção não informado.",
							invalid_type_error: "Tipo não válido para ID da opção.",
						})
						.optional(),
					deletar: z
						.boolean({
							required_error: "Deletar opção não informado.",
							invalid_type_error: "Tipo não válido para deletar opção.",
						})
						.optional(),
				}),
			),
			id: z
				.string({
					required_error: "ID do adicional não informado.",
					invalid_type_error: "Tipo não válido para ID do adicional.",
				})
				.optional(),
			deletar: z
				.boolean({
					required_error: "Deletar adicional não informado.",
					invalid_type_error: "Tipo não válido para deletar adicional.",
				})
				.optional(),
		}),
	),
});

export type TProductState = z.infer<typeof ProductStateSchema>;
export type TProductVariantState = TProductState["productVariants"][number];
export type TProductAddOnState = TProductState["productAddOns"][number];
export type TProductAddOnOptionState = TProductAddOnState["opcoes"][number];
export type TVariantAddOnState = TProductVariantState["addOns"][number];

type UseProductStateProps = {
	initialState?: Partial<TProductState>;
};
export const useProductState = ({ initialState }: UseProductStateProps = {}) => {
	const [state, setState] = useState<TProductState>({
		product: {
			codigo: initialState?.product?.codigo ?? "",
			descricao: initialState?.product?.descricao ?? "",
			unidade: initialState?.product?.unidade ?? "",
			ncm: initialState?.product?.ncm ?? "",
			tipo: initialState?.product?.tipo ?? "",
			grupo: initialState?.product?.grupo ?? "",
			imagemCapaHolder: {
				file: initialState?.product?.imagemCapaHolder?.file ?? null,
				previewUrl: initialState?.product?.imagemCapaHolder?.previewUrl ?? null,
			},
		},
		productVariants: initialState?.productVariants ?? [],
		productAddOns: initialState?.productAddOns ?? [],
	});

	// ===== PRODUTO PRINCIPAL =====

	const updateProduct = useCallback((updates: Partial<Omit<TProductState["product"], "imagemCapaHolder">>) => {
		setState((prev) => ({
			...prev,
			product: {
				...prev.product,
				...updates,
			},
		}));
	}, []);

	const updateProductImageHolder = useCallback((holder: Partial<TProductState["product"]["imagemCapaHolder"]>) => {
		setState((prev) => ({
			...prev,
			product: {
				...prev.product,
				imagemCapaHolder: {
					...prev.product.imagemCapaHolder,
					...holder,
				},
			},
		}));
	}, []);

	// ===== VARIANTES DO PRODUTO =====

	const addProductVariant = useCallback((variant: TProductVariantState) => {
		setState((prev) => ({
			...prev,
			productVariants: [...prev.productVariants, variant],
		}));
	}, []);

	const updateProductVariant = useCallback((index: number, updates: Partial<Omit<TProductVariantState, "imagemCapaHolder" | "addOns">>) => {
		setState((prev) => ({
			...prev,
			productVariants: prev.productVariants.map((variant, i) => (i === index ? { ...variant, ...updates } : variant)),
		}));
	}, []);

	const updateProductVariantImageHolder = useCallback((variantIndex: number, holder: Partial<TProductVariantState["imagemCapaHolder"]>) => {
		setState((prev) => ({
			...prev,
			productVariants: prev.productVariants.map((variant, i) =>
				i === variantIndex
					? {
							...variant,
							imagemCapaHolder: {
								...variant.imagemCapaHolder,
								...holder,
							},
						}
					: variant,
			),
		}));
	}, []);

	const removeProductVariant = useCallback((index: number) => {
		setState((prev) => {
			const variant = prev.productVariants[index];
			// Se é uma variante existente (tem id), marca como deletar
			if (variant?.id) {
				return {
					...prev,
					productVariants: prev.productVariants.map((v, i) => (i === index ? { ...v, deletar: true } : v)),
				};
			}
			// Se é nova (sem id), remove da lista
			return {
				...prev,
				productVariants: prev.productVariants.filter((_, i) => i !== index),
			};
		});
	}, []);

	// ===== ADD-ONS DO PRODUTO PRINCIPAL =====

	const addProductAddOn = useCallback((addOn: TProductAddOnState) => {
		setState((prev) => ({
			...prev,
			productAddOns: [...prev.productAddOns, addOn],
		}));
	}, []);

	const updateProductAddOn = useCallback((index: number, updates: Partial<Omit<TProductAddOnState, "opcoes">>) => {
		setState((prev) => ({
			...prev,
			productAddOns: prev.productAddOns.map((addOn, i) => (i === index ? { ...addOn, ...updates } : addOn)),
		}));
	}, []);

	const removeProductAddOn = useCallback((index: number) => {
		setState((prev) => {
			const addOn = prev.productAddOns[index];
			// Se é um add-on existente (tem id), marca como deletar
			if (addOn?.id) {
				return {
					...prev,
					productAddOns: prev.productAddOns.map((a, i) => (i === index ? { ...a, deletar: true } : a)),
				};
			}
			// Se é novo (sem id), remove da lista
			return {
				...prev,
				productAddOns: prev.productAddOns.filter((_, i) => i !== index),
			};
		});
	}, []);

	// ===== OPÇÕES DE ADD-ON DO PRODUTO =====

	const addProductAddOnOption = useCallback((addOnIndex: number, option: TProductAddOnOptionState) => {
		setState((prev) => ({
			...prev,
			productAddOns: prev.productAddOns.map((addOn, i) =>
				i === addOnIndex
					? {
							...addOn,
							opcoes: [...addOn.opcoes, option],
						}
					: addOn,
			),
		}));
	}, []);

	const updateProductAddOnOption = useCallback((addOnIndex: number, optionIndex: number, updates: Partial<TProductAddOnOptionState>) => {
		setState((prev) => ({
			...prev,
			productAddOns: prev.productAddOns.map((addOn, i) =>
				i === addOnIndex
					? {
							...addOn,
							opcoes: addOn.opcoes.map((option, j) => (j === optionIndex ? { ...option, ...updates } : option)),
						}
					: addOn,
			),
		}));
	}, []);

	const removeProductAddOnOption = useCallback((addOnIndex: number, optionIndex: number) => {
		setState((prev) => ({
			...prev,
			productAddOns: prev.productAddOns.map((addOn, i) => {
				if (i !== addOnIndex) return addOn;

				const option = addOn.opcoes[optionIndex];
				// Se é uma opção existente (tem id), marca como deletar
				if (option?.id) {
					return {
						...addOn,
						opcoes: addOn.opcoes.map((o, j) => (j === optionIndex ? { ...o, deletar: true } : o)),
					};
				}
				// Se é nova (sem id), remove da lista
				return {
					...addOn,
					opcoes: addOn.opcoes.filter((_, j) => j !== optionIndex),
				};
			}),
		}));
	}, []);

	// ===== ADD-ONS DE VARIANTE =====

	const addVariantAddOn = useCallback((variantIndex: number, addOn: TVariantAddOnState) => {
		setState((prev) => ({
			...prev,
			productVariants: prev.productVariants.map((variant, i) =>
				i === variantIndex
					? {
							...variant,
							addOns: [...variant.addOns, addOn],
						}
					: variant,
			),
		}));
	}, []);

	const updateVariantAddOn = useCallback((variantIndex: number, addOnIndex: number, updates: Partial<Omit<TVariantAddOnState, "opcoes">>) => {
		setState((prev) => ({
			...prev,
			productVariants: prev.productVariants.map((variant, i) =>
				i === variantIndex
					? {
							...variant,
							addOns: variant.addOns.map((addOn, j) => (j === addOnIndex ? { ...addOn, ...updates } : addOn)),
						}
					: variant,
			),
		}));
	}, []);

	const removeVariantAddOn = useCallback((variantIndex: number, addOnIndex: number) => {
		setState((prev) => ({
			...prev,
			productVariants: prev.productVariants.map((variant, i) => {
				if (i !== variantIndex) return variant;

				const addOn = variant.addOns[addOnIndex];
				// Se é um add-on existente (tem id), marca como deletar
				if (addOn?.id) {
					return {
						...variant,
						addOns: variant.addOns.map((a, j) => (j === addOnIndex ? { ...a, deletar: true } : a)),
					};
				}
				// Se é novo (sem id), remove da lista
				return {
					...variant,
					addOns: variant.addOns.filter((_, j) => j !== addOnIndex),
				};
			}),
		}));
	}, []);

	// ===== OPÇÕES DE ADD-ON DE VARIANTE =====

	const addVariantAddOnOption = useCallback((variantIndex: number, addOnIndex: number, option: TProductAddOnOptionState) => {
		setState((prev) => ({
			...prev,
			productVariants: prev.productVariants.map((variant, i) =>
				i === variantIndex
					? {
							...variant,
							addOns: variant.addOns.map((addOn, j) =>
								j === addOnIndex
									? {
											...addOn,
											opcoes: [...addOn.opcoes, option],
										}
									: addOn,
							),
						}
					: variant,
			),
		}));
	}, []);

	const updateVariantAddOnOption = useCallback(
		(variantIndex: number, addOnIndex: number, optionIndex: number, updates: Partial<TProductAddOnOptionState>) => {
			setState((prev) => ({
				...prev,
				productVariants: prev.productVariants.map((variant, i) =>
					i === variantIndex
						? {
								...variant,
								addOns: variant.addOns.map((addOn, j) =>
									j === addOnIndex
										? {
												...addOn,
												opcoes: addOn.opcoes.map((option, k) => (k === optionIndex ? { ...option, ...updates } : option)),
											}
										: addOn,
								),
							}
						: variant,
				),
			}));
		},
		[],
	);

	const removeVariantAddOnOption = useCallback((variantIndex: number, addOnIndex: number, optionIndex: number) => {
		setState((prev) => ({
			...prev,
			productVariants: prev.productVariants.map((variant, i) => {
				if (i !== variantIndex) return variant;

				return {
					...variant,
					addOns: variant.addOns.map((addOn, j) => {
						if (j !== addOnIndex) return addOn;

						const option = addOn.opcoes[optionIndex];
						// Se é uma opção existente (tem id), marca como deletar
						if (option?.id) {
							return {
								...addOn,
								opcoes: addOn.opcoes.map((o, k) => (k === optionIndex ? { ...o, deletar: true } : o)),
							};
						}
						// Se é nova (sem id), remove da lista
						return {
							...addOn,
							opcoes: addOn.opcoes.filter((_, k) => k !== optionIndex),
						};
					}),
				};
			}),
		}));
	}, []);

	// ===== RESET E ESTADO COMPLETO =====

	const resetState = useCallback((newState: TProductState) => {
		setState(newState);
	}, []);

	return {
		state,
		// Produto principal
		updateProduct,
		updateProductImageHolder,
		// Variantes
		addProductVariant,
		updateProductVariant,
		updateProductVariantImageHolder,
		removeProductVariant,
		// Add-ons do produto
		addProductAddOn,
		updateProductAddOn,
		removeProductAddOn,
		// Opções de add-on do produto
		addProductAddOnOption,
		updateProductAddOnOption,
		removeProductAddOnOption,
		// Add-ons de variante
		addVariantAddOn,
		updateVariantAddOn,
		removeVariantAddOn,
		// Opções de add-on de variante
		addVariantAddOnOption,
		updateVariantAddOnOption,
		removeVariantAddOnOption,
		// Utilitários
		resetState,
	};
};
export type TUseProductState = ReturnType<typeof useProductState>;
