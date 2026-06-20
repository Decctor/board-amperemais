import { TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import TextInput from "@/components/Inputs/TextInput";
import { Truck } from "lucide-react";
import { formatToCNPJ, formatToPhone } from "@/lib/formatting";

type PurchaseTransportBlockProps = {
	purchase: TUsePurchaseState["state"]["purchase"];
	updatePurchase: TUsePurchaseState["updatePurchase"];
};
export default function PurchaseTransportBlock({ purchase, updatePurchase }: PurchaseTransportBlockProps) {
	return (
		<ResponsiveMenuSection title="TRANSPORTE" icon={<Truck className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col lg:flex-row gap-1.5">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="TRANSPORTADORA"
						value={purchase.transporteTransportadoraNome || ""}
						placeholder="Preencha aqui o nome da transportadora..."
						handleChange={(value) => updatePurchase({ transporteTransportadoraNome: value })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="CNPJ DA TRANSPORTADORA"
						value={purchase.transporteTransportadoraCnpj || ""}
						placeholder="Preencha aqui o CNPJ da transportadora..."
						handleChange={(value) => updatePurchase({ transporteTransportadoraCnpj: formatToCNPJ(value) })}
					/>
				</div>
			</div>
			<div className="w-full flex flex-col lg:flex-row gap-1.5">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="TELEFONE DO FORNECEDOR"
						value={purchase.transporteTransportadoraTelefone || ""}
						placeholder="Preencha aqui o telefone da transportadora..."
						handleChange={(value) => updatePurchase({ transporteTransportadoraTelefone: formatToPhone(value) })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="EMAIL DA TRANSPORTADORA"
						value={purchase.transporteTransportadoraEmail || ""}
						placeholder="Preencha aqui o email da transportadora..."
						handleChange={(value) => updatePurchase({ transporteTransportadoraEmail: value })}
					/>
				</div>
			</div>
			<TextInput
				label="LINK DE RASTREIO"
				value={purchase.transporteLinkRastreio || ""}
				placeholder="Preencha aqui o link de rastreio..."
				handleChange={(value) => updatePurchase({ transporteLinkRastreio: value })}
			/>
		</ResponsiveMenuSection>
	);
}
