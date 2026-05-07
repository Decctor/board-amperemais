"use client";

import { useShopCatalog } from "@/lib/queries/shop";
import { Loader2, Store } from "lucide-react";
import { ShopProvider } from "./_components/ShopProvider";
import ShopShell from "./_components/ShopShell";

type ShopPageProps = {
	orgId: string;
};

export default function ShopPage({ orgId }: ShopPageProps) {
	const { data, isLoading, isError, error } = useShopCatalog({ orgId });

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-primary" />
					<p className="text-sm text-muted-foreground">Carregando catalogo...</p>
				</div>
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background p-4">
				<div className="flex flex-col items-center gap-4 text-center max-w-sm">
					<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
						<Store className="w-8 h-8 text-muted-foreground" />
					</div>
					<h1 className="text-xl font-bold">Loja indisponivel</h1>
					<p className="text-sm text-muted-foreground">
						{error?.message || "Esta loja digital nao esta disponivel no momento. Tente novamente mais tarde."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<ShopProvider orgId={orgId} catalog={data}>
			<ShopShell />
		</ShopProvider>
	);
}
