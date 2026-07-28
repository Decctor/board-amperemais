import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatToMoney } from "@/lib/formatting";
import type { TUseInternalDealState } from "@/state-hooks/use-internal-deal-state";
import { Handshake } from "lucide-react";

type DealGeneralBlockProps = {
	deal: TUseInternalDealState["state"]["deal"];
	updateDeal: TUseInternalDealState["updateDeal"];
	// Condições comerciais são imutáveis após a criação do checkout — o price no Stripe
	// já foi emitido com esses valores. Para renegociar, cancela-se e cria-se outro deal.
	commercialTermsEditable?: boolean;
};
export default function DealGeneralBlock({ deal, updateDeal, commercialTermsEditable = true }: DealGeneralBlockProps) {
	const valorTotal = deal.valorUnitarioCentavos * deal.quantidadeLicencas;
	const intervaloLabel = deal.intervalo === "ANUAL" ? "ano" : "mês";

	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<Handshake className="h-3 w-3 min-w-3 min-h-3" />}>
			<TextInput
				label="NOME DO DEAL"
				value={deal.nome}
				placeholder="Ex: Rede Empório Verde - 5 lojas"
				handleChange={(value) => updateDeal({ nome: value })}
				required
			/>
			<TextareaInput
				label="DESCRIÇÃO"
				value={deal.descricao ?? ""}
				placeholder="Observações internas sobre a negociação..."
				handleChange={(value) => updateDeal({ descricao: value })}
			/>
			{/* Não há seletor de plano: todo deal usa o único plano comercializado (DEAL_PLAN_KEY). */}
			<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
				<SelectInput
					label="CICLO DE COBRANÇA"
					value={deal.intervalo}
					options={[
						{ id: 1, value: "MENSAL", label: "MENSAL" },
						{ id: 2, value: "ANUAL", label: "ANUAL" },
					]}
					resetOptionLabel="CICLO DE COBRANÇA"
					handleChange={(value) => updateDeal({ intervalo: value as typeof deal.intervalo })}
					onReset={() => updateDeal({ intervalo: "MENSAL" })}
					editable={commercialTermsEditable}
					required
				/>
			</div>
			<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
				<NumberInput
					label="QUANTIDADE DE LICENÇAS"
					value={deal.quantidadeLicencas}
					placeholder="Ex: 5"
					handleChange={(value) => updateDeal({ quantidadeLicencas: Math.max(1, Math.round(value)) })}
					editable={commercialTermsEditable}
					required
				/>
				<NumberInput
					label="VALOR POR LICENÇA (R$)"
					value={deal.valorUnitarioCentavos / 100}
					placeholder="Ex: 249,90"
					handleChange={(value) => updateDeal({ valorUnitarioCentavos: Math.round(value * 100) })}
					editable={commercialTermsEditable}
					required
				/>
			</div>
			<div className="flex w-full items-center justify-between rounded-md border border-border bg-input/30 px-3 py-2">
				<span className="text-xs font-medium tracking-tight text-foreground/60">TOTAL DA ASSINATURA</span>
				<span className="text-sm font-semibold tracking-tight">
					{formatToMoney(valorTotal / 100)} / {intervaloLabel}
				</span>
			</div>
		</ResponsiveMenuSection>
	);
}
