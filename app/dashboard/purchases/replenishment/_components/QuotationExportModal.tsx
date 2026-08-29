"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { exportReplenishmentQuotation } from "@/lib/mutations/replenishment";
import { useMutation } from "@tanstack/react-query";
import { FileSpreadsheet, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type QuotationExportModalProps = {
	searchParams: URLSearchParams;
	produtoIds: string[];
	quantidades: Record<string, number>;
	valorEstimado: number;
	closeModal: () => void;
};

const MAX_SUPPLIERS = 8;

// A planilha sai com um bloco de colunas por fornecedor cotado. Três é o padrão da concorrência
// saudável — menos que isso vira negociação com preço único, mais vira planilha ilegível.
export function QuotationExportModal({ searchParams, produtoIds, quantidades, valorEstimado, closeModal }: QuotationExportModalProps) {
	const [fornecedores, setFornecedores] = useState<string[]>(["", "", ""]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["export-replenishment-quotation"],
		mutationFn: () =>
			exportReplenishmentQuotation({
				searchParams,
				input: {
					fornecedores: fornecedores.map((nome, index) => (nome.trim() ? nome.trim() : `FORNECEDOR ${index + 1}`)),
					produtoIds,
					quantidades,
				},
			}),
		onSuccess: (result) => {
			toast.success(`Planilha ${result.fileName} gerada.`);
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<ResponsiveMenu
			menuTitle="EXPORTAR COTAÇÃO"
			menuDescription="Gera a planilha para enviar aos fornecedores e comparar as respostas."
			menuActionButtonText={isPending ? "GERANDO..." : "BAIXAR PLANILHA"}
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate()}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<ResponsiveMenuSection title="O QUE VAI NA PLANILHA" icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>
				<div className="bg-muted/50 flex flex-col gap-1 rounded-lg px-3 py-2 text-[0.7rem] font-medium">
					<span>
						<strong className="tabular-nums">{produtoIds.length > 0 ? produtoIds.length : "Todos os"}</strong>{" "}
						{produtoIds.length > 0 ? "produtos selecionados" : "produtos do filtro atual"}
					</span>
					<span className="text-muted-foreground">Investimento estimado ao custo atual: {formatToMoney(valorEstimado)}</span>
				</div>
				<p className="text-muted-foreground text-[0.65rem] leading-snug">
					Cada fornecedor recebe um par de colunas (preço unitário e total). O total da linha, o valor final do pedido, o menor preço e o fornecedor
					vencedor saem como fórmula: basta digitar os preços que a comparação se atualiza sozinha. As linhas de forma de pagamento e previsão de entrega
					ficam em branco para você preencher junto ao fornecedor.
				</p>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection
				title="FORNECEDORES COTADOS"
				icon={<Users className="h-3.5 w-3.5" />}
				action={
					fornecedores.length < MAX_SUPPLIERS ? (
						<Button variant="ghost" size="sm" onClick={() => setFornecedores((previous) => [...previous, ""])}>
							<Plus className="h-3.5 w-3.5" />
							ADICIONAR
						</Button>
					) : null
				}
			>
				<div className="flex w-full flex-col gap-2">
					{fornecedores.map((fornecedor, index) => (
						// A lista é reordenável só por remoção e o nome pode repetir enquanto é digitado, então o
						// índice é a identidade estável aqui.
						<div key={index} className="flex items-center gap-2">
							<Input
								value={fornecedor}
								placeholder={`Fornecedor ${index + 1}`}
								onChange={(event) => setFornecedores((previous) => previous.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
								className="rounded-lg"
							/>
							{fornecedores.length > 1 ? (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setFornecedores((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
									aria-label={`Remover fornecedor ${index + 1}`}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							) : null}
						</div>
					))}
				</div>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}
