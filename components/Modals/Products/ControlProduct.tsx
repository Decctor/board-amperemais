import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updateProduct } from "@/lib/mutations/products";
import { useProductById } from "@/lib/queries/products";
import type { TGetProductsOutputById } from "@/pages/api/products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CodeIcon, DiamondIcon, Ruler, TextIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { MdAttachFile } from "react-icons/md";
import { toast } from "sonner";

type ControlProductProps = {
	productId: string;
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlProduct({ productId, user, closeModal, callbacks }: ControlProductProps) {
	const queryClient = useQueryClient();

	const { data: product, queryKey, isLoading, isError, isSuccess, error } = useProductById({ id: productId });

	const [productCoverHolder, setProductCoverHolder] = useState<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: null });

	async function handleUpdateProduct({
		coverHolder,
		product,
	}: { coverHolder: { file: File | null; previewUrl: string | null }; product: TGetProductsOutputById }) {
		let productCoverUrl = product.imagemCapaUrl;
		if (coverHolder.file) {
			const { url, format, size } = await uploadFile({ file: coverHolder.file, fileName: product.descricao });
			productCoverUrl = url;
		}
		return await updateProduct({ productId: productId, product: { ...product, imagemCapaUrl: productCoverUrl } });
	}
	const { mutate: handleUpdateProductMutation, isPending } = useMutation({
		mutationKey: ["update-product"],
		mutationFn: handleUpdateProduct,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			await queryClient.invalidateQueries({ queryKey });
			return;
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR PRODUTO"
			menuDescription="Preencha os campos abaixo para atualizar o produto"
			menuActionButtonText="ATUALIZAR PRODUTO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => product && handleUpdateProductMutation({ coverHolder: productCoverHolder, product: product })}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<ImageContent imageUrl={product?.imagemCapaUrl ?? ""} imageHolder={productCoverHolder} updateImageHolder={setProductCoverHolder} />
			<InformationItem icon={<TextIcon className="w-4 h-4 min-w-4 min-h-4" />} label="DESCRIÇÃO " value={product?.descricao ?? ""} />
			<InformationItem icon={<CodeIcon className="" />} label="CÓDIGO" value={product?.codigo ?? ""} />
			<InformationItem icon={<Ruler className="w-4 h-4 min-w-4 min-h-4" />} label="UNIDADE" value={product?.unidade ?? ""} />
			<InformationItem icon={<CodeIcon className="w-4 h-4 min-w-4 min-h-4" />} label="NCM" value={product?.ncm ?? ""} />
			<InformationItem icon={<DiamondIcon className="w-4 h-4 min-w-4 min-h-4" />} label="TIPO" value={product?.tipo ?? ""} />
			<InformationItem icon={<DiamondIcon className="w-4 h-4 min-w-4 min-h-4" />} label="GRUPO" value={product?.grupo ?? ""} />
		</ResponsiveMenu>
	);
}

function ImageContent({
	imageUrl,
	imageHolder,
	updateImageHolder,
}: {
	imageUrl: TGetProductsOutputById["imagemCapaUrl"];
	imageHolder: { file: File | null; previewUrl: string | null };
	updateImageHolder: (image: { file: File | null; previewUrl: string | null }) => void;
}) {
	return (
		<div className="flex w-full items-center justify-center">
			<label className="relative w-32 h-32 cursor-pointer overflow-hidden rounded-full" htmlFor="avatar-input-file">
				<ImagePreview imageHolder={imageHolder} imageUrl={imageUrl} />
				<input
					accept=".png,.jpeg,.jpg"
					className="absolute h-full w-full cursor-pointer opacity-0"
					id="avatar-input-file"
					multiple={false}
					onChange={(e) => {
						const file = e.target.files?.[0] ?? null;
						updateImageHolder({ file, previewUrl: file ? URL.createObjectURL(file) : null });
					}}
					tabIndex={-1}
					type="file"
				/>
			</label>
		</div>
	);
}

function ImagePreview({
	imageUrl,
	imageHolder,
}: { imageUrl: TGetProductsOutputById["imagemCapaUrl"]; imageHolder: { file: File | null; previewUrl: string | null } }) {
	if (imageHolder.previewUrl) {
		return <Image alt="Capa do produto." fill={true} objectFit="cover" src={imageHolder.previewUrl} />;
	}
	if (imageUrl) {
		return <Image alt="Capa do produto." fill={true} objectFit="cover" src={imageUrl} />;
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/20">
			<MdAttachFile className="h-6 w-6" />
			<p className="text-center font-medium text-xs">DEFINIR CAPA</p>
		</div>
	);
}

function InformationItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
	return (
		<div className="w-full flex items-center gap-1.5">
			{icon}
			<h3 className="text-sm font-semibold tracking-tighter text-primary/80">{label}</h3>
			<h3 className="text-sm font-semibold tracking-tight">{value}</h3>
		</div>
	);
}
