import CheckboxInput from "@/components/Inputs/CheckboxInput";
import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDecimalPlaces } from "@/lib/formatting";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { BadgeDollarSign, Package } from "lucide-react";

type ProductStockBlockProps = {
	product: TUseProductState["state"]["product"];
	updateProduct: TUseProductState["updateProduct"];
	showPricing?: boolean;
	embedded?: boolean;
};

export default function ProductStockBlock({ product, updateProduct, showPricing = false, embedded = false }: ProductStockBlockProps) {
	const formContent = (
		<div className="w-full flex flex-col gap-3">
			{showPricing ? (
				<div className="w-full flex items-center gap-2 lg:flex-row">
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="PREÇO DE CUSTO"
							value={product.precoCusto ?? null}
							placeholder="Preencha aqui o preço de custo do produto."
							handleChange={(value) => updateProduct({ precoCusto: value })}
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="PREÇO DE VENDA"
							value={product.precoVenda ?? null}
							placeholder="Preencha aqui o preço de venda do produto."
							handleChange={(value) => updateProduct({ precoVenda: value })}
						/>
					</div>
				</div>
			) : null}
			<div className="w-full flex items-center justify-center">
				<CheckboxInput
					checked={product.rastreamentoEstoqueAtivo}
					labelTrue="RASTREAR ESTOQUE"
					labelFalse="RASTREAR ESTOQUE"
					handleChange={(value) => updateProduct({ rastreamentoEstoqueAtivo: value })}
				/>
			</div>
			{product.rastreamentoEstoqueAtivo ? (
				<NumberInput
					label="QUANTIDADE EM ESTOQUE"
					value={product.quantidade ?? null}
					placeholder="Preencha aqui a quantidade em estoque do produto."
					handleChange={(value) => updateProduct({ quantidade: value })}
				/>
			) : null}
		</div>
	);

	if (embedded) return formContent;

	return (
		<ResponsiveMenuSection title="ESTOQUE" icon={<Package className="h-4 min-h-4 w-4 min-w-4" />}>
			{formContent}
		</ResponsiveMenuSection>
	);
}

export function ProductStockBlockView({ product }: { product: TUseProductState["state"]["product"] }) {
	return (
		<div className="w-full flex flex-col gap-1.5">
			<div className="w-full flex items-center gap-1.5">
				<Package className="w-4 h-4" />
				<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">RASTREAR ESTOQUE</h3>
				<h3 className="text-sm font-semibold tracking-tight">{product.rastreamentoEstoqueAtivo ? "SIM" : "NÃO"}</h3>
			</div>
			{product.rastreamentoEstoqueAtivo ? (
				<div className="w-full flex items-center gap-1.5">
					<Package className="w-4 h-4" />
					<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">QUANTIDADE</h3>
					<h3 className="text-sm font-semibold tracking-tight">
						{product.quantidade != null ? formatDecimalPlaces(product.quantidade) : "NÃO INFORMADO"}
					</h3>
				</div>
			) : null}
		</div>
	);
}
