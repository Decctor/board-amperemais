"use client";

import { SaleFulfillmentDetailsMenu } from "@/components/Modals/Sales/SaleFulfillmentDetailsMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { parseAsString, useQueryState } from "nuqs";
import FulfillmentBoard from "../_components/fulfillment/fulfillment-board";

type SalesOrdersPageProps = {
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	canEditSales: boolean;
	canDeleteSales: boolean;
};

export default function SalesOrdersPage({ organization, canEditSales, canDeleteSales }: SalesOrdersPageProps) {
	const [selectedSaleId, setSelectedSaleId] = useQueryState("saleId", parseAsString.withOptions({ shallow: true }));

	function closeSaleDetails() {
		const triggerId = selectedSaleId ? `sale-details-trigger-${selectedSaleId}` : null;
		void setSelectedSaleId(null, { history: "replace" }).then(() => {
			if (!triggerId) return;
			requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
		});
	}

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			<FulfillmentBoard
				organizationId={organization.id}
				organizationConfig={organization.configuracao}
				canEditSales={canEditSales}
				onViewDetails={(saleId) => void setSelectedSaleId(saleId, { history: "push" })}
			/>
			{selectedSaleId ? (
				<SaleFulfillmentDetailsMenu
					saleId={selectedSaleId}
					closeMenu={closeSaleDetails}
					canEditSales={canEditSales}
					canDeleteSales={canDeleteSales}
				/>
			) : null}
		</div>
	);
}

