"use client";

import { CommercialStatsSection } from "@/components/Stats/CommercialStatsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { BadgeDollarSign, ReceiptText } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { OperationalResultsView } from "./_components/operational-results-view";

const RESULTS_VIEWS = ["comercial", "operacional"] as const;
type TResultsView = (typeof RESULTS_VIEWS)[number];

type SalesResultsPageProps = {
	user: TAuthUserSession["user"];
	userOrg: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	membership: NonNullable<TAuthUserSession["membership"]>;
	/** Ids de vendedor do escopo de resultados do membro; `null` = sem escopo (organização inteira). */
	scopeSellersIds: string[] | null;
	/** A visão operacional consome `/api/sales/results`, que exige o módulo de ERP. */
	hasErpAccess: boolean;
};

/**
 * Único lar dos resultados de vendas. A análise comercial (faturamento, gráficos, agrupamentos e
 * comparação de períodos) vale para qualquer organização; a visão operacional só existe com ERP.
 */
export default function SalesResultsPage({ user, userOrg, membership, scopeSellersIds, hasErpAccess }: SalesResultsPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum([...RESULTS_VIEWS]));
	const activeView: TResultsView = hasErpAccess ? (viewMode ?? "comercial") : "comercial";

	return (
		<div className="flex w-full flex-col gap-4 p-1">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col">
					<h1 className="font-black text-2xl tracking-tight">Resultados</h1>
					<p className="text-sm text-muted-foreground">
						{hasErpAccess
							? "Análise comercial do período e, na visão operacional, recebimentos, modalidades, vendedores e emissão fiscal."
							: "Faturamento, ticket médio, evolução e agrupamentos das vendas no período."}
					</p>
				</div>
			</div>

			{hasErpAccess ? (
				<Tabs value={activeView} onValueChange={(v) => setViewMode(v as TResultsView)} className="flex w-full flex-col gap-3">
					<TabsList variant="page">
						<TabsTrigger value="comercial">
							<BadgeDollarSign className="h-4 w-4 min-h-4 min-w-4" />
							Comercial
						</TabsTrigger>
						<TabsTrigger value="operacional">
							<ReceiptText className="h-4 w-4 min-h-4 min-w-4" />
							Operacional
						</TabsTrigger>
					</TabsList>
					<TabsContent value="comercial">
						<CommercialStatsSection user={user} userOrg={userOrg} membership={membership} scopeSellersIds={scopeSellersIds} />
					</TabsContent>
					<TabsContent value="operacional">
						<OperationalResultsView
							hasResultsScope={Boolean(membership.permissoes.resultados.escopo && membership.permissoes.resultados.escopo.length > 0)}
							canViewSensitive={membership.permissoes.resultados.visualizarSensiveis}
						/>
					</TabsContent>
				</Tabs>
			) : (
				<CommercialStatsSection user={user} userOrg={userOrg} membership={membership} scopeSellersIds={scopeSellersIds} />
			)}
		</div>
	);
}
