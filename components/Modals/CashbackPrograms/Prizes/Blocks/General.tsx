import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { LayoutGrid } from "lucide-react";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import SelectProductWithVariants from "@/components/Inputs/SelectProductWithVariants";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import NumberInput from "@/components/Inputs/NumberInput";
import type { TUseCashbackProgramPrizeState } from "@/state-hooks/use-cashback-program-state";
import { getCashbackUnitLabel } from "@/lib/formatting";
import CheckboxInput from "@/components/Inputs/CheckboxInput";

type CashbackProgramsPrizesGeneralBlockProps = {
	state: TUseCashbackProgramPrizeState["state"];
	updateCashbackProgramPrize: TUseCashbackProgramPrizeState["updateCashbackProgramPrize"];
	cashbackProgramTerminology: TCashbackProgramTerminologyEnum;
};

export default function CashbackProgramsPrizesGeneralBlock({
	state,
	updateCashbackProgramPrize,
	cashbackProgramTerminology,
}: CashbackProgramsPrizesGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-center">
				<CheckboxInput
					checked={state.ativo}
					labelTrue="ATIVO"
					labelFalse="ATIVO"
					handleChange={(value) => updateCashbackProgramPrize({ ativo: value })}
					justify="justify-center"
				/>
			</div>
			<SelectProductWithVariants
				label="PRODUTO"
				initialSearch={state.produto?.nome ?? ""}
				value={state.produtoId ? { productId: state.produtoId, productVariantId: state.produtoVarianteId } : null}
				selectedLabel={state.produto?.nome}
				handleChange={(value) => {
					updateCashbackProgramPrize({
						produtoId: value?.product?.id ?? null,
						produtoVarianteId: value?.productVariant?.id ?? null,
						produto: value?.product ? { id: value.product.id, nome: value.product.nome } : null,
						titulo: value?.productVariant?.nome ?? value?.product?.nome ?? state.titulo,
						imagemCapaUrl: value?.productVariant?.imagemCapaUrl ?? value?.product?.imagemCapaUrl ?? null,
					});
				}}
				onReset={() => {
					updateCashbackProgramPrize({ produtoId: null, produtoVarianteId: null, produto: null, imagemCapaUrl: null });
				}}
				resetOptionLabel="SELECIONE UM PRODUTO"
			/>
			<TextInput
				label="TÍTULO"
				placeholder="Título do prêmio..."
				width="100%"
				value={state.titulo}
				handleChange={(value) => updateCashbackProgramPrize({ titulo: value })}
			/>
			<TextareaInput
				label="DESCRIÇÃO"
				placeholder="Preencha aqui uma descrição visual para o cartão do prêmio..."
				value={state.descricao ?? ""}
				handleChange={(value) => updateCashbackProgramPrize({ descricao: value })}
			/>
			<NumberInput
				label="VALOR"
				placeholder={`Preencha aqui o valor do prêmio em ${getCashbackUnitLabel(cashbackProgramTerminology)}...`}
				width="100%"
				value={state.valor}
				handleChange={(value) => updateCashbackProgramPrize({ valor: value })}
			/>
		</ResponsiveMenuSection>
	);
}
