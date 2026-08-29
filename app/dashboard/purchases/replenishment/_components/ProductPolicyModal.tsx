"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/errors";
import { updateReplenishmentSettings } from "@/lib/mutations/replenishment";
import type { TReplenishmentItem } from "@/lib/replenishment";
import type { TProductReplenishmentSettings } from "@/schemas/replenishment";
import { useMutation } from "@tanstack/react-query";
import { Boxes, Package, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ProductPolicyModalProps = {
	item: TReplenishmentItem;
	closeModal: () => void;
	onSaved: () => void;
};

// Exceções por produto. É onde a compradora registra o que o histórico não conta: que aquele item é
// peça de reposição, que o fornecedor só vende em caixa fechada de 12, que o fabricante exige um
// mínimo. Sem esse lugar, o ajuste vira uma correção manual repetida em toda planilha.
export function ProductPolicyModal({ item, closeModal, onSaved }: ProductPolicyModalProps) {
	const [state, setState] = useState<TProductReplenishmentSettings>({
		produtoId: item.produtoId,
		sobressalente: item.sobressalente,
		naoPromover: item.naoPromover,
		descontinuado: item.descontinuado,
		fornecedorPreferencialId: item.fornecedor.origem === "PREFERENCIAL" ? item.fornecedor.id : null,
		leadTimeDias: null,
		multiploCompra: item.politica.multiploCompra,
		quantidadeMinimaCompra: item.politica.quantidadeMinimaCompra,
		estoqueMinimo: null,
		estoqueMaximo: null,
		anotacoes: null,
	});

	function updateState(partial: Partial<TProductReplenishmentSettings>) {
		setState((previous) => ({ ...previous, ...partial }));
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-product-replenishment-settings", item.produtoId],
		mutationFn: () => updateReplenishmentSettings({ organizacao: null, produtos: [state] }),
		onSuccess: (data) => {
			toast.success(data.message);
			onSaved();
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<ResponsiveMenu
			menuTitle={`POLÍTICA · ${item.nome}`}
			menuDescription="Exceções deste produto em relação à política da loja."
			menuActionButtonText="SALVAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate()}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<ResponsiveMenuSection title="CLASSIFICAÇÃO" icon={<Tag className="h-3.5 w-3.5" />}>
				<label className="flex cursor-pointer items-start gap-2 text-xs font-medium tracking-tight">
					<Switch checked={state.sobressalente} onCheckedChange={(checked) => updateState({ sobressalente: checked })} className="mt-0.5" />
					<span>
						Item sobressalente
						<span className="text-muted-foreground block text-[0.65rem] leading-snug">
							Giro baixo por escolha (peça de reposição, garantia). Fica fora do alerta de excesso e das sugestões de oferta.
						</span>
					</span>
				</label>
				<label className="flex cursor-pointer items-start gap-2 text-xs font-medium tracking-tight">
					<Switch checked={state.naoPromover} onCheckedChange={(checked) => updateState({ naoPromover: checked })} className="mt-0.5" />
					<span>
						Não promocionar
						<span className="text-muted-foreground block text-[0.65rem] leading-snug">
							Preço tabelado ou contrato com o fabricante impede desconto, mesmo com excesso real.
						</span>
					</span>
				</label>
				<label className="flex cursor-pointer items-start gap-2 text-xs font-medium tracking-tight">
					<Switch checked={state.descontinuado} onCheckedChange={(checked) => updateState({ descontinuado: checked })} className="mt-0.5" />
					<span>
						Descontinuado
						<span className="text-muted-foreground block text-[0.65rem] leading-snug">
							Fora de linha: não sugerir recompra nem em ruptura. Some da lista até você pedir para incluir descontinuados.
						</span>
					</span>
				</label>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="CONDIÇÕES DE COMPRA" icon={<Package className="h-3.5 w-3.5" />}>
				<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
					<NumberInput
						label="Prazo do fornecedor (dias)"
						placeholder={`Padrão: ${item.politica.leadTimeDias}`}
						value={state.leadTimeDias}
						handleChange={(value) => updateState({ leadTimeDias: value })}
					/>
					<NumberInput
						label="Múltiplo de compra"
						placeholder="Ex.: 12 (caixa fechada)"
						value={state.multiploCompra}
						handleChange={(value) => updateState({ multiploCompra: value })}
					/>
					<NumberInput
						label="Pedido mínimo"
						placeholder="Ex.: 50"
						value={state.quantidadeMinimaCompra}
						handleChange={(value) => updateState({ quantidadeMinimaCompra: value })}
					/>
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="MÍNIMO E MÁXIMO MANUAIS" icon={<Boxes className="h-3.5 w-3.5" />}>
				<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
					<NumberInput
						label="Estoque mínimo"
						placeholder={`Calculado: ${Math.round(item.plano.pontoPedido)}`}
						value={state.estoqueMinimo}
						handleChange={(value) => updateState({ estoqueMinimo: value })}
					/>
					<NumberInput
						label="Estoque máximo"
						placeholder={`Calculado: ${Math.round(item.plano.nivelAlvo)}`}
						value={state.estoqueMaximo}
						handleChange={(value) => updateState({ estoqueMaximo: value })}
					/>
				</div>
				<p className="text-muted-foreground text-[0.65rem] leading-snug">
					Preenchidos, substituem o cálculo: o mínimo vira o ponto de pedido e o máximo vira o nível até onde encher. Deixe em branco para o sistema
					continuar acompanhando a demanda sozinho.
				</p>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="ANOTAÇÕES" icon={<Tag className="h-3.5 w-3.5" />}>
				<TextareaInput
					label="Observações"
					placeholder="Ex.: fornecedor só entrega às terças; comprar junto com o item 57106004."
					value={state.anotacoes ?? ""}
					handleChange={(value) => updateState({ anotacoes: value })}
				/>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}
