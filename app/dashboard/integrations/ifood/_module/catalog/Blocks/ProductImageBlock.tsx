"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { buildIfoodCatalogImageUrl, IFOOD_IMAGE_MAX_SIZE_LABEL } from "@/lib/integrations/ifood/catalog-types";
import { uploadIfoodImage } from "@/lib/mutations/ifood";
import { useMutation } from "@tanstack/react-query";
import { ImageIcon, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

type ProductImageBlockProps = {
	merchantId: string;
	imagemPath: string | null;
	onUploaded: (imagemPath: string) => void;
};

/** Upload da imagem do produto para o CDN do iFood; devolve o `path` para o campo `image`. */
export function ProductImageBlock({ merchantId, imagemPath, onUploaded }: ProductImageBlockProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const { mutate: uploadImage, isPending } = useMutation({
		mutationKey: ["upload-ifood-image", merchantId],
		mutationFn: uploadIfoodImage,
		onSuccess: (data) => {
			toast.success(data.message);
			onUploaded(data.data.path);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const previewUrl = buildIfoodCatalogImageUrl(imagemPath);

	return (
		<div className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5">
			{previewUrl ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={previewUrl} alt="Imagem do produto" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-border" />
			) : (
				<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
					<ImageIcon className="h-5 w-5" />
				</div>
			)}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-sm font-medium text-foreground">Imagem do produto</span>
				<span className="text-xs text-muted-foreground">PNG ou JPG, até {IFOOD_IMAGE_MAX_SIZE_LABEL}.</span>
			</div>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/png,image/jpeg"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) uploadImage({ merchantId, file });
					e.target.value = "";
				}}
			/>
			<Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
				<Upload className="h-4 w-4" />
				{isPending ? "ENVIANDO..." : "ENVIAR IMAGEM"}
			</Button>
		</div>
	);
}
