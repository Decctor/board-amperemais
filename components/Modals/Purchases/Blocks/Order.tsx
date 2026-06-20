import DateInput from "@/components/Inputs/DateInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateForInputValue, formatDateOnInputChange, formatToCNPJ, formatToPhone } from "@/lib/formatting";
import { TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import { FileText } from "lucide-react";

type PurchaseOrderBlockProps = {
	purchase: TUsePurchaseState["state"]["purchase"];
	updatePurchase: TUsePurchaseState["updatePurchase"];
};
export default function PurchaseOrderBlock({ purchase, updatePurchase }: PurchaseOrderBlockProps) {
	return (
		<ResponsiveMenuSection title="PEDIDO" icon={<FileText className="h-4 min-h-4 w-4 min-w-4" />}>
			<DateInput
				label="DATA DO PEDIDO"
				value={formatDateForInputValue(purchase.pedidoData)}
				handleChange={(value) => updatePurchase({ pedidoData: formatDateOnInputChange(value, "date") })}
			/>
			<div className="w-full flex flex-col gap-1.5">
				<h3 className="text-xs font-medium tracking-tight text-muted-foreground">DADOS DO FORNECEDOR</h3>
				<div className="w-full flex flex-col lg:flex-row gap-1.5">
					<div className="w-full lg:w-1/2">
						<TextInput
							label="FORNECEDOR"
							value={purchase.pedidoFornecedorNome || ""}
							placeholder="Preencha aqui o nome do fornecedor..."
							handleChange={(value) => updatePurchase({ pedidoFornecedorNome: value })}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<TextInput
							label="CNPJ DO FORNECEDOR"
							value={purchase.pedidoFornecedorCnpj || ""}
							placeholder="Preencha aqui o CNPJ do fornecedor..."
							handleChange={(value) => updatePurchase({ pedidoFornecedorCnpj: formatToCNPJ(value) })}
						/>
					</div>
				</div>
				<div className="w-full flex flex-col lg:flex-row gap-1.5">
					<div className="w-full lg:w-1/2">
						<TextInput
							label="TELEFONE DO FORNECEDOR"
							value={purchase.pedidoFornecedorTelefone || ""}
							placeholder="Preencha aqui o telefone do fornecedor..."
							handleChange={(value) => updatePurchase({ pedidoFornecedorTelefone: formatToPhone(value) })}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<TextInput
							label="EMAIL DO FORNECEDOR"
							value={purchase.pedidoFornecedorEmail || ""}
							placeholder="Preencha aqui o email do fornecedor..."
							handleChange={(value) => updatePurchase({ pedidoFornecedorEmail: value })}
						/>
					</div>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}
