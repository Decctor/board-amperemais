"use client";

import SelectProductWithVariants, { type TSelectProductWithVariantsValue } from "@/components/Inputs/SelectProductWithVariants";
import type { TSalesChannelShowcaseProduct } from "@/lib/queries/sales-channels";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type ShowcaseDraftRowProps = {
	hasProduct: (produtoId: string) => boolean;
	addProduct: (produto: TSalesChannelShowcaseProduct) => void;
};

/**
 * Linha de inclusão da vitrine. Diferente das tabelas do cadastro, não há rascunho a preencher: o
 * produto já existe, então escolher no combobox é a própria inclusão — e a linha vai para o painel
 * do grupo dele, que é criado no fim da vitrine quando ainda não existe.
 */
export default function ShowcaseDraftRow({ hasProduct, addProduct }: ShowcaseDraftRowProps) {
	function handleChange(value: TSelectProductWithVariantsValue) {
		// Selecionar uma variante inclui o produto: a vitrine cura produtos, e a disponibilidade de
		// variante só restringe dentro de um produto já visível (regra do resolver de canais).
		const product = value?.product;
		if (!product) return;

		if (product.ativo === false || !product.vendavel) {
			toast.error("Produto inativo ou não vendável não pode entrar na vitrine.");
			return;
		}
		if (hasProduct(product.id)) {
			toast.info("Esse produto já está na vitrine.");
			return;
		}

		addProduct({
			id: product.id,
			nome: product.nome,
			codigo: product.codigo,
			grupo: product.grupo,
			imagemCapaUrl: product.imagemCapaUrl,
			precoVenda: product.precoVenda,
			precoVendaCanal: null,
			// A busca só devolve variantes ativas; um produto que só tem variantes desligadas chega
			// aqui como "sem variantes" e o servidor corrige na próxima leitura.
			temVariantes: product.variantes.length > 0,
			rastreamentoEstoqueAtivo: product.rastreamentoEstoqueAtivo,
			quantidade: product.quantidade,
		});
	}

	return (
		<div className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
			<Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<SelectProductWithVariants
					label="PRODUTO"
					showLabel={false}
					value={null}
					selectedLabel="Adicionar produto à vitrine"
					resetOptionLabel="SELECIONE UM PRODUTO"
					holderClassName="h-auto min-h-8 rounded-md border-transparent bg-transparent px-2 py-1 text-left shadow-none hover:border-border hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40"
					popoverContentClassName="w-[var(--radix-popover-trigger-width)] min-w-[410px] max-w-[520px]"
					commandListClassName="max-h-[360px]"
					handleChange={handleChange}
					onReset={() => undefined}
					renderTriggerContent={() => (
						<span className="flex min-w-0 flex-1 items-center gap-2">
							<span className="truncate text-xs font-medium text-muted-foreground">Adicionar produto à vitrine</span>
						</span>
					)}
				/>
			</div>
		</div>
	);
}
