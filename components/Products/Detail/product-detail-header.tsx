"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { useProductById } from "@/lib/queries/products";
import { ArrowLeft, Code } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type ProductDetailHeaderProps = {
	productId: string;
};

export default function ProductDetailHeader({ productId }: ProductDetailHeaderProps) {
	const { data: product, isLoading, isError, error } = useProductById({ id: productId });

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!product) return null;

	return (
		<div className="flex w-full flex-col gap-4">
			<Button variant="ghost" size="fit" asChild className="rounded-full hover:bg-primary/10 flex items-center gap-1 px-2 py-2 w-fit">
				<Link href="/dashboard/commercial/products?view=database" className="flex items-center gap-1">
					<ArrowLeft className="w-5 h-5" />
					VOLTAR
				</Link>
			</Button>
			<div className="flex w-full flex-col items-center gap-3 lg:flex-row lg:items-start">
				{product.product.imagemCapaUrl ? (
					<div className="relative h-20 w-20 min-h-20 min-w-20 overflow-hidden rounded-2xl border border-border">
						<Image src={product.product.imagemCapaUrl} alt={product.product.descricao} fill className="object-cover" />
					</div>
				) : null}
				<div className="flex flex-col items-center gap-2 lg:items-start">
					<div className="flex flex-col items-center gap-2 lg:flex-row">
						<div className="flex items-center gap-1 rounded-lg bg-secondary px-2 py-2 text-center text-[0.65rem] font-bold italic text-foreground/80">
							<Code className="h-4 min-h-4 w-4 min-w-4" />
							<p>{product.product.codigo}</p>
						</div>
						<h1 className="text-xl font-extrabold leading-none tracking-tight md:text-2xl">{product.product.descricao}</h1>
					</div>
					{product.product.grupo ? (
						<p className="text-sm text-muted-foreground">
							Grupo: <span className="font-medium text-foreground">{product.product.grupo}</span>
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
