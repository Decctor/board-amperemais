import { TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Truck } from "lucide-react";
import DateInput from "@/components/Inputs/DateInput";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";

type PurchaseDeliveryBlockProps = {
	purchase: TUsePurchaseState["state"]["purchase"];
	updatePurchase: TUsePurchaseState["updatePurchase"];
};
export default function PurchaseDeliveryBlock({ purchase, updatePurchase }: PurchaseDeliveryBlockProps) {
	const isReceived = purchase.status === "RECEBIDA";
	return (
		<ResponsiveMenuSection title="ENTREGA" icon={<Truck className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col lg:flex-row gap-1.5">
				<div className="w-full lg:w-1/3">
					<DateInput
						label="DATA DE ENVIO"
						value={formatDateForInputValue(purchase.entregaDataEnvio)}
						handleChange={(value) => updatePurchase({ entregaDataEnvio: formatDateOnInputChange(value, "date") })}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<DateInput
						label="DATA DE PREVISÃO DE RECEBIMENTO"
						value={formatDateForInputValue(purchase.entregaDataRecebimentoPrevisao)}
						handleChange={(value) => updatePurchase({ entregaDataRecebimentoPrevisao: formatDateOnInputChange(value, "date") })}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<DateInput
						label="DATA DE RECEBIMENTO EFETIVO"
						value={formatDateForInputValue(purchase.entregaDataRecebimentoEfetivacao)}
						handleChange={(value) => updatePurchase({ entregaDataRecebimentoEfetivacao: formatDateOnInputChange(value, "date") })}
						width="100%"
						editable={isReceived}
					/>
					{!isReceived ? (
						<p className="text-[0.65rem] text-muted-foreground mt-1">Disponível apenas quando o status da compra for RECEBIDA.</p>
					) : null}
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}
