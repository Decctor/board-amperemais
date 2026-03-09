import CheckboxInput from "@/components/Inputs/CheckboxInput";
import NumberInput from "@/components/Inputs/NumberInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { TUseProductState } from "@/state-hooks/use-product-state";
import { Package } from "lucide-react";

type ProductStockBlockProps = {
  product: TUseProductState["state"]["product"];
  updateProduct: TUseProductState["updateProduct"];
};

export default function ProductStockBlock({ product, updateProduct }: ProductStockBlockProps) {
  return (
    <ResponsiveMenuSection title="ESTOQUE" icon={<Package className="h-4 min-h-4 w-4 min-w-4" />}>
      <div className="w-full flex items-center justify-center">
        <CheckboxInput
          checked={product.rastreamentoEstoqueAtivo}
          labelTrue="RASTREAR ESTOQUE"
          labelFalse="RASTREAR ESTOQUE"
          handleChange={(value) => updateProduct({ rastreamentoEstoqueAtivo: value })}
        />
      </div>
      {product.rastreamentoEstoqueAtivo ? (
        <>
          <NumberInput
            label="QUANTIDADE EM ESTOQUE"
            value={product.quantidade ?? null}
            placeholder="Preencha aqui a quantidade em estoque do produto."
            handleChange={(value) => updateProduct({ quantidade: value })}
          />
        </>
      ) : null}
    </ResponsiveMenuSection>
  );
}
