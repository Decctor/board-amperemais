"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ArrowRight, MapPin, Package, Truck } from "lucide-react";
import { useEffect } from "react";
import { useShop } from "../ShopProvider";
import { TUseShopOrderState } from "@/state-hooks/use-shop-order-state";
import TextInput from "@/components/Inputs/TextInput";
import { formatToCEP } from "@/lib/formatting";
import SelectInput from "@/components/Inputs/SelectInput";
import { BrazilianCitiesOptionsFromUF, BrazilianStatesOptions } from "@/utils/states-cities";
import { toast } from "sonner";
import { getCEPInfo } from "@/lib/utils";

type DeliveryStepProps = {
	onNext: () => void;
};

export default function DeliveryStep({ onNext }: DeliveryStepProps) {
	const { catalog, orderState } = useShop();
	const { delivery } = orderState.state;
	const config = catalog.shopSettings.configuracoes;

	const onlyPickup = config.aceitaRetirada && !config.aceitaEntrega;
	const onlyDelivery = !config.aceitaRetirada && config.aceitaEntrega;

	useEffect(() => {
		if (onlyPickup) {
			orderState.updateDelivery({ modalidade: "RETIRADA", endereco: null });
		} else if (onlyDelivery) {
			orderState.updateDelivery({ modalidade: "ENTREGA" });
		}
	}, [onlyPickup, onlyDelivery]);

	const handleModeSelect = (mode: "RETIRADA" | "ENTREGA") => {
		if (mode === "RETIRADA") {
			orderState.updateDelivery({ modalidade: mode, endereco: null });
		} else {
			orderState.updateDelivery({
				modalidade: mode,
				endereco: delivery.endereco || {
					titulo: null,
					localizacaoCep: null,
					localizacaoEstado: null,
					localizacaoCidade: null,
					localizacaoBairro: null,
					localizacaoLogradouro: null,
					localizacaoNumero: null,
					localizacaoComplemento: null,
				},
			});
		}
	};

	const isDelivery = delivery.modalidade === "ENTREGA";

	const canProceed =
		delivery.modalidade === "RETIRADA" ||
		(delivery.modalidade === "ENTREGA" &&
			delivery.endereco?.localizacaoLogradouro &&
			delivery.endereco?.localizacaoNumero &&
			delivery.endereco?.localizacaoCidade);

	const orgLocation = [
		catalog.organization.localizacaoLogradouro,
		catalog.organization.localizacaoNumero,
		catalog.organization.localizacaoBairro,
		catalog.organization.localizacaoCidade,
		catalog.organization.localizacaoEstado,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<div className="flex flex-col gap-6">
			{config.aceitaRetirada && config.aceitaEntrega && (
				<div className="grid grid-cols-2 gap-3">
					<button
						type="button"
						onClick={() => handleModeSelect("RETIRADA")}
						className={cn(
							"flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors",
							delivery.modalidade === "RETIRADA" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
						)}
					>
						<Package className={cn("w-6 h-6", delivery.modalidade === "RETIRADA" ? "text-primary" : "text-muted-foreground")} />
						<span className={cn("font-semibold", delivery.modalidade === "RETIRADA" && "text-primary")}>RETIRADA</span>
					</button>

					<button
						type="button"
						onClick={() => handleModeSelect("ENTREGA")}
						className={cn(
							"flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors",
							delivery.modalidade === "ENTREGA" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
						)}
					>
						<Truck className={cn("w-6 h-6", delivery.modalidade === "ENTREGA" ? "text-primary" : "text-muted-foreground")} />
						<span className={cn("font-semibold", delivery.modalidade === "ENTREGA" && "text-primary")}>ENTREGA</span>
					</button>
				</div>
			)}

			{delivery.modalidade === "RETIRADA" && orgLocation && (
				<div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border">
					<MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
					<div>
						<p className="font-semibold text-sm">ENDERECO PARA RETIRADA</p>
						<p className="text-sm text-muted-foreground mt-1">{orgLocation}</p>
					</div>
				</div>
			)}

			{isDelivery && <DeliveryAddressForm deliveryAddress={delivery.endereco} updateDelivery={orderState.updateDelivery} />}

			<Button
				variant="brand"
				className={cn("flex items-center gap-1.5 w-full h-12 rounded-xl font-bold mt-auto", !canProceed && "opacity-50")}
				onClick={onNext}
				disabled={!canProceed}
			>
				CONTINUAR
				<ArrowRight className="h-4 w-4" />
			</Button>
		</div>
	);
}

type DeliveryAddressFormProps = {
	deliveryAddress: TUseShopOrderState["state"]["delivery"]["endereco"];
	updateDelivery: TUseShopOrderState["updateDelivery"];
};
function DeliveryAddressForm({ deliveryAddress, updateDelivery }: DeliveryAddressFormProps) {
	async function setAddressDataByCEP(cep: string) {
		const addressInfo = await getCEPInfo(cep);
		const toastID = toast.loading("Buscando informações sobre o CEP...", {
			duration: 2000,
		});
		setTimeout(() => {
			if (addressInfo) {
				toast.dismiss(toastID);
				toast.success("Dados do CEP buscados com sucesso.", {
					duration: 1000,
				});
				updateDelivery({
					endereco: {
						...deliveryAddress,
						localizacaoLogradouro: addressInfo.logradouro,
						localizacaoBairro: addressInfo.bairro,
						localizacaoEstado: addressInfo.uf,
						localizacaoCidade: addressInfo.localidade.toUpperCase(),
						localizacaoCep: cep,
					},
				});
			}
		}, 1000);
	}

	return (
		<div className="flex flex-col gap-4 p-4 rounded-xl bg-muted/50 border">
			<p className="text-sm font-semibold">ENDERECO DE ENTREGA</p>
			<div className="w-full flex flex-col gap-3">
				<div className="w-full flex items-center flex-col lg:flex-row gap-3">
					<div className="w-full lg:w-1/3">
						<TextInput
							label="CEP"
							placeholder="Preencha aqui o CEP do endereço de entrega..."
							value={deliveryAddress?.localizacaoCep || ""}
							handleChange={(value) => {
								if (value.length === 9) {
									setAddressDataByCEP(value);
								}
								updateDelivery({ endereco: { ...deliveryAddress, localizacaoCep: formatToCEP(value) } });
							}}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<SelectInput
							label="ESTADO"
							value={deliveryAddress?.localizacaoEstado || null}
							handleChange={(value) => updateDelivery({ endereco: { ...deliveryAddress, localizacaoEstado: value } })}
							options={BrazilianStatesOptions}
							resetOptionLabel="Selecione um estado"
							onReset={() => updateDelivery({ endereco: { ...deliveryAddress, localizacaoEstado: null } })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<SelectInput
							label="CIDADE"
							value={deliveryAddress?.localizacaoCidade || null}
							handleChange={(value) => updateDelivery({ endereco: { ...deliveryAddress, localizacaoCidade: value } })}
							options={BrazilianCitiesOptionsFromUF(deliveryAddress?.localizacaoEstado ?? null)}
							resetOptionLabel="Selecione uma cidade"
							onReset={() => updateDelivery({ endereco: { ...deliveryAddress, localizacaoCidade: null } })}
							width="100%"
						/>
					</div>
				</div>
				<div className="w-full flex items-center flex-col lg:flex-row gap-3">
					<div className="w-full lg:w-1/3">
						<TextInput
							label="Bairro"
							placeholder="Preencha aqui o bairro do endereço de entrega..."
							value={deliveryAddress?.localizacaoBairro || ""}
							handleChange={(value) => updateDelivery({ endereco: { ...deliveryAddress, localizacaoLogradouro: value } })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="Logradouro"
							placeholder="Preencha aqui o logradouro do endereço de entrega..."
							value={deliveryAddress?.localizacaoLogradouro || ""}
							handleChange={(value) => updateDelivery({ endereco: { ...deliveryAddress, localizacaoBairro: value } })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="Número"
							placeholder="Preencha aqui o número do endereço de entrega..."
							value={deliveryAddress?.localizacaoNumero || ""}
							handleChange={(value) => updateDelivery({ endereco: { ...deliveryAddress, localizacaoNumero: value } })}
							width="100%"
						/>
					</div>
				</div>
				<TextInput
					label="Complemento"
					placeholder="Preencha aqui o complemento (apartamento, bloco, referência...) do endereço de entrega..."
					value={deliveryAddress?.localizacaoComplemento || ""}
					handleChange={(value) => updateDelivery({ endereco: { ...deliveryAddress, localizacaoComplemento: value } })}
					width="100%"
				/>
			</div>
		</div>
	);
}
