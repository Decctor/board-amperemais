"use client";

import { OrgColorsProvider } from "@/components/Providers/OrgColorsProvider";
import { useShopCatalog } from "@/lib/queries/shop";
import type { TShopCatalogData } from "@/lib/shop/catalog-data";
import { Store } from "lucide-react";
import ShopLoadingSkeleton from "./_components/ShopLoadingSkeleton";
import { ShopProvider } from "./_components/ShopProvider";
import ShopShell from "./_components/ShopShell";

type ShopPageProps = {
	orgId: string;
	initialCatalog: TShopCatalogData | null;
};

export default function ShopPage({ orgId, initialCatalog }: ShopPageProps) {
	const { data, isLoading, isError, error } = useShopCatalog({ orgId, initialData: initialCatalog ?? undefined });

	if (isLoading) {
		return <ShopLoadingSkeleton />;
	}

	if (isError || !data) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background p-4">
				<div className="flex flex-col items-center gap-4 text-center max-w-sm">
					<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
						<Store className="w-8 h-8 text-muted-foreground" />
					</div>
					<h1 className="text-xl font-bold">Loja indisponível</h1>
					<p className="text-sm text-muted-foreground">
						{error?.message || "Esta loja digital não está disponível no momento. Tente novamente mais tarde."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<OrgColorsProvider
			scoped
			corPrimaria={data.organization.corPrimaria}
			corPrimariaForeground={data.organization.corPrimariaForeground}
			corSecundaria={data.organization.corSecundaria}
			corSecundariaForeground={data.organization.corSecundariaForeground}
		>
			<ShopProvider orgId={orgId} catalog={data}>
				<ShopShell />
			</ShopProvider>
		</OrgColorsProvider>
	);
}
