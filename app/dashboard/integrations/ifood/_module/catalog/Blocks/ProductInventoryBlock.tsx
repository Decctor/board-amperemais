"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { getErrorMessage } from "@/lib/errors";
import { setIfoodInventory } from "@/lib/mutations/ifood";
import { useIfoodInventory } from "@/lib/queries/ifood";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Boxes } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ProductInventoryBlockProps = {
	merchantId: string;
	produtoId: string | null;
	canManage: boolean;
};

/**
 * Estoque do produto no iFood. Fora do rascunho da página de propósito: o inventário tem endpoint
 * próprio (`POST /inventory`), não viaja no `PUT /items`, e misturá-lo na apply bar faria a barra
 * prometer uma escrita que ela não faz.
 *
 * Sem estoque configurado o produto vende sem limite. Com estoque, o iFood pausa o item sozinho ao
 * chegar em zero — é a única pausa automática da plataforma, e o lojista precisa saber disso antes
 * de ligar o controle.
 */
export function ProductInventoryBlock({ merchantId, produtoId, canManage }: ProductInventoryBlockProps) {
	const queryClient = useQueryClient();
	const { data: estoque, isLoading, queryKey } = useIfoodInventory({ merchantId, produtoId });

	const [quantidade, setQuantidade] = useState<number | null>(null);
	useEffect(() => {
		setQuantidade(estoque?.quantidade ?? null);
	}, [estoque]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["set-ifood-inventory", merchantId, produtoId],
		mutationFn: setIfoodInventory,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const controlado = estoque?.quantidade != null;
	const alterado = (estoque?.quantidade ?? null) !== quantidade;

	if (!produtoId) return null;

	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Boxes className="h-4 w-4 min-h-4 min-w-4" />
				</Section.Icon>
				<Section.Title>ESTOQUE</Section.Title>
			</Section.Header>
			<Section.Body>
				<div className="flex w-full flex-col gap-3">
					<p className="max-w-[70ch] text-xs text-muted-foreground">
						{controlado
							? "Quando o estoque chegar a zero, o iFood pausa este item automaticamente."
							: "Sem controle de estoque, o item vende sem limite. Defina uma quantidade para que o iFood o pause sozinho ao acabar."}
					</p>

					{isLoading ? (
						<p className="text-xs text-muted-foreground">Carregando estoque…</p>
					) : (
						<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
							<div className="w-full sm:w-[200px]">
								<NumberInput
									label="QUANTIDADE DISPONÍVEL"
									value={quantidade}
									placeholder="Sem limite"
									editable={canManage}
									handleChange={(value) => setQuantidade(value)}
								/>
							</div>
							{canManage ? (
								<div className="flex items-center gap-2">
									<LoadingButton
										type="button"
										size="sm"
										loading={isPending}
										disabled={!alterado || quantidade == null}
										onClick={() => produtoId && quantidade != null && mutate({ merchantId, produtoId, quantidade })}
									>
										SALVAR ESTOQUE
									</LoadingButton>
									{controlado ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											disabled={isPending}
											onClick={() => produtoId && mutate({ merchantId, produtoId, quantidade: null })}
										>
											REMOVER LIMITE
										</Button>
									) : null}
								</div>
							) : null}
						</div>
					)}
				</div>
			</Section.Body>
		</Section.Root>
	);
}
