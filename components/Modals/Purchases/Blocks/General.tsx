import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { cn } from "@/lib/utils";
import { TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import { PurchaseStatusOptions } from "@/utils/select-options";
import { LayoutGrid } from "lucide-react";

type PurchaseGeneralBlockProps = {
	purchase: TUsePurchaseState["state"]["purchase"];
	updatePurchase: TUsePurchaseState["updatePurchase"];
};
export default function PurchaseGeneralBlock({ purchase, updatePurchase }: PurchaseGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center gap-1.5 flex-wrap">
				{PurchaseStatusOptions.map((option) => (
					<Button
						key={option.id}
						variant="ghost"
						size="fit"
						className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors", option.className, {
							"opacity-100": purchase.status === option.value,
							"opacity-50 border-transparent": purchase.status !== option.value,
						})}
						onClick={() => updatePurchase({ status: option.value })}
					>
						{option.icon}
						<span className="text-xs font-medium">{option.label}</span>
					</Button>
				))}
			</div>
			<TextInput
				label="TÍTULO"
				placeholder="Preencha aqui o título da compra..."
				value={purchase.titulo}
				handleChange={(value) => updatePurchase({ titulo: value })}
				width="100%"
			/>
		</ResponsiveMenuSection>
	);
}
