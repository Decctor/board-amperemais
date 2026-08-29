"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/errors";
import { updateReplenishmentSettings } from "@/lib/mutations/replenishment";
import type { TReplenishmentSettings } from "@/schemas/replenishment";
import { useMutation } from "@tanstack/react-query";
import { Boxes, CalendarClock, Gauge, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SERVICE_LEVEL_OPTIONS = [
	{ id: "0.8", value: "0.8", label: "80% — aceito faltar com frequência" },
	{ id: "0.9", value: "0.9", label: "90% — equilíbrio para itens de giro médio" },
	{ id: "0.95", value: "0.95", label: "95% — padrão para varejo de balcão" },
	{ id: "0.98", value: "0.98", label: "98% — itens que não podem faltar" },
	{ id: "0.99", value: "0.99", label: "99% — máximo (custa muito estoque parado)" },
];

type ReplenishmentPolicyModalProps = {
	settings: TReplenishmentSettings;
	closeModal: () => void;
	onSaved: () => void;
};

// A política é o que transforma a tela em decisão: cada campo aqui muda o ponto de pedido de todo o
// catálogo. Por isso cada um traz, em uma linha, o efeito prático de mexer nele.
export function ReplenishmentPolicyModal({ settings, closeModal, onSaved }: ReplenishmentPolicyModalProps) {
	const [state, setState] = useState<TReplenishmentSettings>(settings);

	function updateState(partial: Partial<TReplenishmentSettings>) {
		setState((previous) => ({ ...previous, ...partial }));
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-replenishment-settings"],
		mutationFn: () => updateReplenishmentSettings({ organizacao: state, produtos: [] }),
		onSuccess: (data) => {
			toast.success(data.message);
			onSaved();
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<ResponsiveMenu
			menuTitle="POLÍTICA DE COMPRA"
			menuDescription="Os parâmetros que definem quando comprar e quanto comprar em todo o catálogo."
			menuActionButtonText="SALVAR POLÍTICA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate()}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="lg"
		>
			<ResponsiveMenuSection title="DEMANDA" icon={<Gauge className="h-3.5 w-3.5" />}>
				<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
					<NumberInput
						label="Janela de análise (dias)"
						placeholder="90"
						value={state.janelaAnaliseDias}
						handleChange={(value) => updateState({ janelaAnaliseDias: value })}
					/>
					<div className="flex flex-col justify-center gap-1">
						<label className="flex cursor-pointer items-center gap-2 text-xs font-medium tracking-tight">
							<Switch checked={state.ajustarDemandaPorRuptura} onCheckedChange={(checked) => updateState({ ajustarDemandaPorRuptura: checked })} />
							Descontar dias em ruptura da média
						</label>
						<p className="text-muted-foreground text-[0.65rem] leading-snug">
							Sem isso, um item que ficou 20 dias zerado parece ter vendido pouco — e a próxima compra vem menor ainda.
						</p>
					</div>
				</div>
				<p className="text-muted-foreground text-[0.65rem] leading-snug">
					A saída média é ponderada: os 30 dias mais recentes pesam 3× os mais antigos da janela, para a sugestão acompanhar a virada de sazonalidade em
					vez de ficar presa na média do trimestre.
				</p>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="PRAZOS" icon={<CalendarClock className="h-3.5 w-3.5" />}>
				<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
					<NumberInput
						label="Prazo de entrega padrão (dias)"
						placeholder="15"
						value={state.leadTimeDiasPadrao}
						handleChange={(value) => updateState({ leadTimeDiasPadrao: value })}
					/>
					<NumberInput
						label="Ciclo de compra (dias)"
						placeholder="15"
						value={state.cicloRevisaoDias}
						handleChange={(value) => updateState({ cicloRevisaoDias: value })}
					/>
					<NumberInput
						label="Cobertura alvo (dias)"
						placeholder="30"
						value={state.diasCoberturaAlvo}
						handleChange={(value) => updateState({ diasCoberturaAlvo: value })}
					/>
				</div>
				<p className="text-muted-foreground text-[0.65rem] leading-snug">
					O prazo padrão só entra quando o fornecedor ainda não tem histórico: assim que houver compras com data de pedido e de recebimento, o prazo real
					dele passa a valer. O ciclo de compra é o intervalo entre duas rodadas — o pedido precisa cobrir os dois.
				</p>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="ORIGEM DO SALDO" icon={<Boxes className="h-3.5 w-3.5" />}>
				<SelectInput
					label="De onde vem o estoque atual"
					value={state.origemEstoquePadrao}
					options={[
						{ id: "SISTEMA", value: "SISTEMA", label: "Saldo do RecompraCRM (movimentações internas)" },
						{ id: "IMPORTACAO", value: "IMPORTACAO", label: "Última posição importada do ERP" },
					]}
					handleChange={(value) => updateState({ origemEstoquePadrao: value === "IMPORTACAO" ? "IMPORTACAO" : "SISTEMA" })}
					resetOptionLabel="PADRÃO (RECOMPRACRM)"
					onReset={() => updateState({ origemEstoquePadrao: "SISTEMA" })}
				/>
				<p className="text-muted-foreground text-[0.65rem] leading-snug">
					Use a posição importada quando as entradas e saídas acontecem no ERP externo — é o caso de quem opera pela Online Sistemas, cuja integração
					entrega as vendas mas não o saldo de estoque. Importar uma posição já liga esta opção automaticamente.
				</p>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="RISCO E EXCESSO" icon={<Package className="h-3.5 w-3.5" />}>
				<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
					<SelectInput
						label="Nível de serviço"
						value={String(state.nivelServico)}
						options={SERVICE_LEVEL_OPTIONS}
						handleChange={(value) => updateState({ nivelServico: Number(value) })}
						resetOptionLabel="PADRÃO (95%)"
						onReset={() => updateState({ nivelServico: 0.95 })}
					/>
					<NumberInput
						label="Excesso acima de (dias de cobertura)"
						placeholder="30"
						value={state.diasExcessoLimite}
						handleChange={(value) => updateState({ diasExcessoLimite: value })}
					/>
				</div>
				<p className="text-muted-foreground text-[0.65rem] leading-snug">
					O nível de serviço define o estoque de segurança: quanto maior, menos rupturas e mais capital parado. O limite de excesso é o que alimenta a aba
					de ofertas — itens acima dele viram candidatos a promoção, exceto os marcados como sobressalentes.
				</p>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}
