"use client";

import ProductRegistryTab from "@/app/dashboard/commercial/products/id/[id]/product-registry-tab";
import ProductStatsTab from "@/app/dashboard/commercial/products/id/[id]/product-stats-tab";
import ProductDetailHeader from "@/app/dashboard/commercial/products/id/[id]/_components/ProductDetailHeader";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { useProductById } from "@/lib/queries/products";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { PencilIcon, ChartBarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type ProductPageProps = {
	user: TAuthUserSession["user"];
	userMembership: NonNullable<TAuthUserSession["membership"]>;
	id: string;
};

export default function ProductPage({ user, userMembership, id }: ProductPageProps) {
	const [tab, setTab] = useQueryState("tab", parseAsStringEnum(["cadastro", "estatisticas"]).withDefault("estatisticas"));
	const queryClient = useQueryClient();
	const { data: product, queryKey, isLoading, isError, error } = useProductById({ id });

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!product) return null;

	return (
		<div className="flex w-full max-w-full grow flex-col gap-6 overflow-x-hidden bg-background py-3">
			<ProductDetailHeader product={product} />
			<Tabs value={tab ?? "estatisticas"} onValueChange={(value) => setTab(value as "cadastro" | "estatisticas")}>
				<TabsList variant="page">
					<TabsTrigger value="cadastro">
						<PencilIcon className="w-4 h-4 min-w-4 min-h-4" />
						CADASTRO
					</TabsTrigger>
					<TabsTrigger value="estatisticas">
						<ChartBarIcon className="w-4 h-4 min-w-4 min-h-4" />
						ESTATÍSTICAS
					</TabsTrigger>
				</TabsList>
				<TabsContent value="cadastro" className="mt-4">
					<ProductRegistryTab
						sessionUserMembership={userMembership}
						product={product}
						callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
					/>
				</TabsContent>
				<TabsContent value="estatisticas" className="mt-4">
					<ProductStatsTab productId={id} enabled={tab === "estatisticas"} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
