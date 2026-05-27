"use client";

import ProductCadastroTab from "@/app/dashboard/commercial/products/id/[id]/product-cadastro-tab";
import ProductStatsTab from "@/app/dashboard/commercial/products/id/[id]/product-stats-tab";
import ProductDetailHeader from "@/components/Products/Detail/product-detail-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { PencilIcon, ChartBarIcon } from "lucide-react";
type ProductPageProps = {
	user: TAuthUserSession["user"];
	userMembership: NonNullable<TAuthUserSession["membership"]>;
	id: string;
};

export default function ProductPage({ user, userMembership, id }: ProductPageProps) {
	const [tab, setTab] = useQueryState("tab", parseAsStringEnum(["cadastro", "estatisticas"]).withDefault("estatisticas"));

	return (
		<div className="flex w-full max-w-full grow flex-col gap-6 overflow-x-hidden bg-background py-3">
			<ProductDetailHeader productId={id} />
			<Tabs value={tab ?? "estatisticas"} onValueChange={(value) => setTab(value as "cadastro" | "estatisticas")}>
				<TabsList>
					<TabsTrigger value="cadastro" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<PencilIcon className="w-4 h-4 min-w-4 min-h-4" />
						CADASTRO
					</TabsTrigger>
					<TabsTrigger value="estatisticas" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<ChartBarIcon className="w-4 h-4 min-w-4 min-h-4" />
						ESTATÍSTICAS
					</TabsTrigger>
				</TabsList>
				<TabsContent value="cadastro" className="mt-4">
					<ProductCadastroTab sessionUser={user} sessionUserMembership={userMembership} productId={id} />
				</TabsContent>
				<TabsContent value="estatisticas" className="mt-4">
					<ProductStatsTab productId={id} enabled={tab === "estatisticas"} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
