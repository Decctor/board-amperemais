"use client";

import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { useIfoodMerchants } from "@/lib/queries/ifood";
import IfoodLogo from "@/utils/images/integrations/ifood-logo.png";
import Image from "next/image";
import { useEffect, useState } from "react";
import { IfoodCatalogTab } from "./_module/catalog/IfoodCatalogTab";
import { IfoodOrdersTab } from "./_module/orders/IfoodOrdersTab";
import { IfoodOverviewTab } from "./_module/overview/IfoodOverviewTab";
import { IfoodConnectionGate } from "./_module/shared/IfoodConnectionGate";
import { MerchantSelector } from "./_module/shared/MerchantSelector";
import { IfoodStatusTab } from "./_module/status/IfoodStatusTab";

type IntegrationsIFoodPageProps = {
	sessionUser: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function IntegrationsIFoodPage({ sessionUser: _sessionUser, membership }: IntegrationsIFoodPageProps) {
	const isConnected = membership.organizacao.integracaoTipo === "IFOOD";
	const canManage = canManageIntegrations(membership.permissoes);

	const merchantsQuery = useIfoodMerchants({ enabled: isConnected });
	const merchants = merchantsQuery.data ?? [];
	const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);

	useEffect(() => {
		if (!selectedMerchantId && merchants.length > 0) setSelectedMerchantId(merchants[0].id);
	}, [merchants, selectedMerchantId]);

	return (
		<div className="flex h-full w-full flex-col gap-3 p-2 lg:p-4">
			<div className="flex w-full flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<div className="relative h-10 w-10 overflow-hidden rounded-lg">
						<Image src={IfoodLogo} alt="iFood" fill className="object-contain" />
					</div>
					<div className="space-y-0.5">
						<h1 className="text-xl font-semibold tracking-tight">iFood</h1>
						<p className="text-sm text-muted-foreground">Gerencie o status, os horários e o catálogo da sua loja no iFood.</p>
					</div>
				</div>
				<MerchantSelector merchants={merchants} selectedMerchantId={selectedMerchantId} onSelect={setSelectedMerchantId} />
			</div>

			<IfoodConnectionGate isConnected={isConnected} error={merchantsQuery.error} canManage={canManage}>
				{merchantsQuery.isLoading ? (
					<LoadingComponent />
				) : (
					<Tabs defaultValue="overview" className="w-full">
						<TabsList>
							<TabsTrigger value="overview">Visão geral</TabsTrigger>
							<TabsTrigger value="orders">Pedidos</TabsTrigger>
							<TabsTrigger value="status">Status & Horários</TabsTrigger>
							<TabsTrigger value="catalog">Catálogo</TabsTrigger>
						</TabsList>
						<TabsContent value="overview" className="pt-2">
							<IfoodOverviewTab merchantId={selectedMerchantId} />
						</TabsContent>
						<TabsContent value="orders" className="pt-2">
							<IfoodOrdersTab canManage={canManage} />
						</TabsContent>
						<TabsContent value="status" className="pt-2">
							<IfoodStatusTab merchantId={selectedMerchantId} canManage={canManage} />
						</TabsContent>
						<TabsContent value="catalog" className="pt-2">
							<IfoodCatalogTab merchantId={selectedMerchantId} canManage={canManage} />
						</TabsContent>
					</Tabs>
				)}
			</IfoodConnectionGate>
		</div>
	);
}
