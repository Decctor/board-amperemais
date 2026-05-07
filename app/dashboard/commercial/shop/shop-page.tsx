"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useShopSettings } from "@/lib/queries/shop";
import ShopOrdersQueue from "./components/ShopOrdersQueue";
import ShopSettingsPanel from "./components/ShopSettingsPanel";
import ShopShareCard from "./components/ShopShareCard";
import { getErrorMessage } from "@/lib/errors";

type ShopPageProps = {
	organizationId: string;
};

export default function ShopPage({ organizationId }: ShopPageProps) {
	const { data: settings, isLoading, isError, error } = useShopSettings();

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-black">Loja Digital</h1>
				<p className="text-muted-foreground">Configure sua loja digital e gerencie pedidos recebidos.</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 flex flex-col gap-6">
					<ShopSettingsPanel settings={settings} />
				</div>

				<div className="flex flex-col gap-6">
					<ShopShareCard organizationId={organizationId} isActive={settings?.ativo ?? false} />
					<ShopOrdersQueue />
				</div>
			</div>
		</div>
	);
}
