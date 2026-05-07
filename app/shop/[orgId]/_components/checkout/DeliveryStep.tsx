"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MapPin, Package, Truck } from "lucide-react";
import { useEffect } from "react";
import { useShop } from "../ShopProvider";

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

	const updateAddress = (field: string, value: string) => {
		orderState.updateDelivery({
			endereco: {
				...delivery.endereco,
				[field]: value || null,
			},
		});
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
							delivery.modalidade === "RETIRADA"
								? "border-primary bg-primary/5"
								: "border-border hover:border-primary/50"
						)}
					>
						<Package className={cn("w-6 h-6", delivery.modalidade === "RETIRADA" ? "text-primary" : "text-muted-foreground")} />
						<span className={cn("font-semibold", delivery.modalidade === "RETIRADA" && "text-primary")}>
							Retirada
						</span>
					</button>

					<button
						type="button"
						onClick={() => handleModeSelect("ENTREGA")}
						className={cn(
							"flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors",
							delivery.modalidade === "ENTREGA"
								? "border-primary bg-primary/5"
								: "border-border hover:border-primary/50"
						)}
					>
						<Truck className={cn("w-6 h-6", delivery.modalidade === "ENTREGA" ? "text-primary" : "text-muted-foreground")} />
						<span className={cn("font-semibold", delivery.modalidade === "ENTREGA" && "text-primary")}>
							Entrega
						</span>
					</button>
				</div>
			)}

			{delivery.modalidade === "RETIRADA" && orgLocation && (
				<div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border">
					<MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
					<div>
						<p className="font-semibold text-sm">Endereco para retirada</p>
						<p className="text-sm text-muted-foreground mt-1">{orgLocation}</p>
					</div>
				</div>
			)}

			{isDelivery && (
				<div className="flex flex-col gap-4 p-4 rounded-xl bg-muted/50 border">
					<p className="text-sm font-semibold">Endereco de entrega</p>

					<div className="grid grid-cols-2 gap-3">
						<div className="col-span-2 flex flex-col gap-2">
							<Label htmlFor="logradouro" className="text-xs">
								Logradouro <span className="text-red-500">*</span>
							</Label>
							<Input
								id="logradouro"
								placeholder="Rua, Avenida..."
								value={delivery.endereco?.localizacaoLogradouro || ""}
								onChange={(e) => updateAddress("localizacaoLogradouro", e.target.value)}
								className="h-10"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="numero" className="text-xs">
								Numero <span className="text-red-500">*</span>
							</Label>
							<Input
								id="numero"
								placeholder="123"
								value={delivery.endereco?.localizacaoNumero || ""}
								onChange={(e) => updateAddress("localizacaoNumero", e.target.value)}
								className="h-10"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="complemento" className="text-xs">
								Complemento
							</Label>
							<Input
								id="complemento"
								placeholder="Apto, Bloco..."
								value={delivery.endereco?.localizacaoComplemento || ""}
								onChange={(e) => updateAddress("localizacaoComplemento", e.target.value)}
								className="h-10"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="bairro" className="text-xs">
								Bairro
							</Label>
							<Input
								id="bairro"
								placeholder="Centro"
								value={delivery.endereco?.localizacaoBairro || ""}
								onChange={(e) => updateAddress("localizacaoBairro", e.target.value)}
								className="h-10"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="cidade" className="text-xs">
								Cidade <span className="text-red-500">*</span>
							</Label>
							<Input
								id="cidade"
								placeholder="Cidade"
								value={delivery.endereco?.localizacaoCidade || ""}
								onChange={(e) => updateAddress("localizacaoCidade", e.target.value)}
								className="h-10"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="estado" className="text-xs">
								Estado
							</Label>
							<Input
								id="estado"
								placeholder="SP"
								value={delivery.endereco?.localizacaoEstado || ""}
								onChange={(e) => updateAddress("localizacaoEstado", e.target.value)}
								className="h-10"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="cep" className="text-xs">
								CEP
							</Label>
							<Input
								id="cep"
								placeholder="00000-000"
								value={delivery.endereco?.localizacaoCep || ""}
								onChange={(e) => updateAddress("localizacaoCep", e.target.value)}
								className="h-10"
							/>
						</div>
					</div>
				</div>
			)}

			<Button
				className={cn("w-full h-12 rounded-xl font-bold mt-auto", !canProceed && "opacity-50")}
				onClick={onNext}
				disabled={!canProceed}
			>
				Continuar
			</Button>
		</div>
	);
}
