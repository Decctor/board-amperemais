import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TProductCoreState, TUseProductCoreState } from "@/state-hooks/use-product-state";
import { UnitsOfMeasurementOptions } from "@/utils/select-options";
import { ImageIcon, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { useId } from "react";

type ProductStateGeneralBlockProps = {
	product: TProductCoreState;
	updateProduct: TUseProductCoreState["updateProduct"];
	updateProductImageHolder: TUseProductCoreState["updateProductImageHolder"];
	showPricing?: boolean;
	embedded?: boolean;
};

export default function ProductStateGeneralBlock({
	product,
	updateProduct,
	updateProductImageHolder,
	showPricing = true,
	embedded = false,
}: ProductStateGeneralBlockProps) {
	const imageInputId = useId();
	const formContent = (
		<div className="w-full flex items-center flex-col  gap-2">
			<ProductGeneralBlockImage
				imageUrl={product.imagemCapaUrl}
				imageHolder={product.imagemCapaHolder}
				updateImageHolder={updateProductImageHolder}
				inputId={imageInputId}
			/>
			<div className="h-full w-full lg:grow flex flex-col items-center gap-2">
				<TextInput
					label="DESCRIÇÃO"
					value={product.descricao}
					placeholder="Preencha aqui a descrição do produto."
					handleChange={(value) => updateProduct({ descricao: value })}
					width="100%"
				/>
				<div className="w-full flex items-center gap-2 lg:flex-row">
					<div className="w-full lg:w-1/2">
						<TextInput
							label="CÓDIGO"
							value={product.codigo}
							placeholder="Preencha aqui o código do produto."
							handleChange={(value) => updateProduct({ codigo: value })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<SelectInput
							label="UNIDADE"
							value={product.unidade}
							resetOptionLabel="SELECIONE A UNIDADE"
							handleChange={(value) => updateProduct({ unidade: value })}
							width="100%"
							options={UnitsOfMeasurementOptions}
							onReset={() => updateProduct({ unidade: "UN" })}
						/>
					</div>
				</div>
				<TextInput
					label="GRUPO"
					value={product.grupo}
					placeholder="Preencha aqui o grupo do produto."
					handleChange={(value) => updateProduct({ grupo: value })}
					width="100%"
				/>

				{showPricing ? (
					<div className="w-full flex items-center gap-2 lg:flex-row">
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="PREÇO DE CUSTO"
								value={product.precoCusto ?? null}
								placeholder="Preencha aqui o preço de custo do produto."
								handleChange={(value) => updateProduct({ precoCusto: value })}
								width="100%"
							/>
						</div>
						<div className="w-full lg:w-1/2">
							<NumberInput
								label="PREÇO DE VENDA"
								value={product.precoVenda ?? null}
								placeholder="Preencha aqui o preço de venda do produto."
								handleChange={(value) => updateProduct({ precoVenda: value })}
								width="100%"
							/>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);

	if (embedded) return formContent;

	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			{formContent}
		</ResponsiveMenuSection>
	);
}

function ProductGeneralBlockImage({
	imageUrl,
	imageHolder,
	updateImageHolder,
	inputId,
}: {
	imageUrl: TProductCoreState["imagemCapaUrl"];
	imageHolder: TProductCoreState["imagemCapaHolder"];
	updateImageHolder: TUseProductCoreState["updateProductImageHolder"];
	inputId: string;
}) {
	return (
		<div className="flex items-center justify-center min-h-[250px] min-w-[250px]">
			<label className="relative aspect-square w-full max-w-[250px] cursor-pointer overflow-hidden rounded-lg" htmlFor={inputId}>
				<UsersGeneralBlockAvatarPreview imageHolder={imageHolder} imageUrl={imageUrl} />
				<input
					accept=".png,.jpeg,.jpg"
					className="absolute h-full w-full cursor-pointer opacity-0"
					id={inputId}
					multiple={false}
					onChange={(e) => {
						const file = e.target.files?.[0] ?? null;
						updateImageHolder({
							file,
							previewUrl: file ? URL.createObjectURL(file) : null,
						});
					}}
					tabIndex={-1}
					type="file"
				/>
			</label>
		</div>
	);
}

function UsersGeneralBlockAvatarPreview({
	imageUrl,
	imageHolder,
}: {
	imageUrl: TProductCoreState["imagemCapaUrl"];
	imageHolder: TProductCoreState["imagemCapaHolder"];
}) {
	if (imageHolder.previewUrl) {
		return <Image alt="Capa do produto." fill={true} objectFit="cover" src={imageHolder.previewUrl} />;
	}
	if (imageUrl) {
		return <Image alt="Capa do produto." fill={true} objectFit="cover" src={imageUrl} />;
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/20">
			<ImageIcon className="h-6 w-6" />
			<p className="text-center font-medium text-xs">DEFINIR CAPA</p>
		</div>
	);
}
