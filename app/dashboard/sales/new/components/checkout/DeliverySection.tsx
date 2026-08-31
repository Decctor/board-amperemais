import SelectInput from "@/components/Inputs/SelectInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import type { TDeliveryModeEnum } from "@/schemas/enums";
import { resolveShopDeliveryFee } from "@/lib/shop/config";
import { useShopSettings } from "@/lib/queries/shop";
import { SaleFullfilmentModesOptions } from "@/utils/select-options";
import { TruckIcon } from "lucide-react";

type DeliverySectionProps = {
	saleState: TUseSaleState;
	locationOptions: { id: string; value: string; label: string }[];
	onOpenNewLocation: () => void;
};

export default function DeliverySection({ saleState, locationOptions, onOpenNewLocation }: DeliverySectionProps) {
	const { data: shopSettings } = useShopSettings();
	const configuracoes = shopSettings?.configuracoes ?? null;
	// Mesma regra da loja digital, aplicada ao subtotal de itens do PDV.
	const deliveryFee = configuracoes ? resolveShopDeliveryFee({ configuracoes, modalidade: "ENTREGA", subtotalItens: saleState.totalItens }) : 0;

	// Prefill editável: preenche ao entrar em ENTREGA se o operador ainda não mexeu no acréscimo,
	// e só limpa ao sair se o valor continuar sendo exatamente a taxa configurada.
	const handleModeSelect = (mode: TDeliveryModeEnum) => {
		const previous = saleState.state.entregaModalidade;
		saleState.setEntregaModalidade(mode);
		if (mode === previous) return;

		if (mode === "ENTREGA") {
			if (deliveryFee > 0 && saleState.state.acrescimoGeral === 0) saleState.setAcrescimoGeral(deliveryFee);
			return;
		}
		if (previous === "ENTREGA" && deliveryFee > 0 && saleState.state.acrescimoGeral === deliveryFee) saleState.setAcrescimoGeral(0);
	};

	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-3 shadow-2xs">
			<div className="flex items-center gap-1.5">
				<TruckIcon className="w-4 h-4 text-foreground" />
				<h3 className="font-bold text-xs tracking-wide">ENTREGA</h3>
			</div>
			<div className="w-full flex items-center flex-wrap gap-1.5 justify-center">
				{SaleFullfilmentModesOptions.map((mode) => {
					const isEntregaBlocked = mode.value === "ENTREGA" && saleState.state.modoCliente === "CONSUMIDOR";
					return (
						<Button
							key={mode.value}
							type="button"
							size="fit"
							className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
							variant={saleState.state.entregaModalidade === mode.value ? "brand" : "ghost"}
							disabled={isEntregaBlocked}
							onClick={() => handleModeSelect(mode.value)}
						>
							{mode.icon}
							{mode.label}
						</Button>
					);
				})}
			</div>

			{saleState.state.entregaModalidade === "ENTREGA" ? (
				<>
					<SelectInput
						label="Local de entrega"
						value={saleState.state.entregaLocalizacaoId}
						options={locationOptions}
						handleChange={(value) => saleState.setEntregaLocalizacaoId(value)}
						onReset={() => saleState.setEntregaLocalizacaoId(null)}
						resetOptionLabel="Selecione um endereço"
					/>
					<Button type="button" variant="outline" size="sm" disabled={!saleState.state.cliente} onClick={onOpenNewLocation}>
						NOVA LOCALIZAÇÃO
					</Button>
				</>
			) : null}

			{saleState.state.entregaModalidade === "COMANDA" ? (
				<Input
					placeholder="Número da comanda"
					value={saleState.state.comandaNumero ?? ""}
					onChange={(event) => saleState.setComandaNumero(event.target.value || null)}
				/>
			) : null}
		</div>
	);
}
