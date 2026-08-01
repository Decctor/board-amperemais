"use client";

import type { TUpdateProductStockDeductionInput, TUpdateProductStockDeductionOutput } from "@/app/api/products/stock-deduction/route";
import SelectInput from "@/components/Inputs/SelectInput";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { useProductionRecipes } from "@/lib/queries/productions";
import type { TProductStockDeductionModeEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CookingPot, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

async function updateProductStockDeduction(input: TUpdateProductStockDeductionInput) {
	const { data } = await axios.put<TUpdateProductStockDeductionOutput>("/api/products/stock-deduction", input);
	return data;
}

type StockDeductionModeSectionProps = {
	productId: string;
	baixaEstoqueModo: TProductStockDeductionModeEnum;
	fichaTecnicaReceitaId: string | null;
};

/**
 * Configuracao do modo de baixa (Fase 2 de tabs): pratos/drinks usam COMPOSICAO —
 * a entrega explode a ficha tecnica e baixa os INSUMOS por FEFO; o prato em si
 * nunca tem saldo. A ficha tecnica e uma receita do modulo de producao.
 */
export default function StockDeductionModeSection({ productId, baixaEstoqueModo, fichaTecnicaReceitaId }: StockDeductionModeSectionProps) {
	const [modo, setModo] = useState<TProductStockDeductionModeEnum>(baixaEstoqueModo);
	const [receitaId, setReceitaId] = useState<string | null>(fichaTecnicaReceitaId);
	const { data: recipesResult } = useProductionRecipes();

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-product-stock-deduction", productId],
		mutationFn: updateProductStockDeduction,
		onSuccess: (data) => toast.success(data.message),
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const isDirty = modo !== baixaEstoqueModo || (modo === "COMPOSICAO" && receitaId !== fichaTecnicaReceitaId);

	return (
		<div className="border-border flex w-full flex-col gap-3 rounded-xl border px-3.5 py-3">
			<div className="flex items-center gap-1.5">
				<CookingPot className="h-4 w-4 min-h-4 min-w-4" />
				<span className="text-xs font-bold uppercase tracking-wide">MODO DE BAIXA DE ESTOQUE</span>
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<div className="grow">
					<SelectInput
						label="MODO"
						value={modo}
						options={[
							{ id: "ESTOQUE_PROPRIO", value: "ESTOQUE_PROPRIO", label: "ESTOQUE PRÓPRIO (saldo do produto)" },
							{ id: "COMPOSICAO", value: "COMPOSICAO", label: "COMPOSIÇÃO (explode a ficha técnica)" },
						]}
						resetOptionLabel="ESTOQUE PRÓPRIO"
						handleChange={(value) => setModo(value as TProductStockDeductionModeEnum)}
						onReset={() => setModo("ESTOQUE_PROPRIO")}
					/>
				</div>
				{modo === "COMPOSICAO" ? (
					<div className="grow">
						<SelectInput
							label="FICHA TÉCNICA (RECEITA)"
							value={receitaId}
							options={(recipesResult?.recipes ?? []).map((recipe) => ({ id: recipe.id, value: recipe.id, label: recipe.titulo }))}
							resetOptionLabel="NENHUMA"
							handleChange={(value) => setReceitaId(value)}
							onReset={() => setReceitaId(null)}
						/>
					</div>
				) : null}
				<Button
					size="sm"
					variant="secondary"
					className="flex items-center gap-1.5"
					disabled={!isDirty || isPending}
					onClick={() => mutate({ productId, baixaEstoqueModo: modo, fichaTecnicaReceitaId: receitaId })}
				>
					<Save className="h-3.5 w-3.5" />
					SALVAR
				</Button>
			</div>
			{modo === "COMPOSICAO" ? (
				<p className="text-xs text-muted-foreground">
					Na entrega, os insumos da receita são baixados por FEFO (inclusive lotes do pré-preparo). Sem ficha técnica ativa, nenhuma baixa acontece e a
					venda não é bloqueada.
				</p>
			) : null}
		</div>
	);
}
