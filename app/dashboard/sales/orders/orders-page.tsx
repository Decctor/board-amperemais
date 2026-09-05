"use client";

import { FiscalPermissionsProvider, type TFiscalUiPermissions } from "@/components/Fiscal/fiscal-permissions-context";
import { SaleFulfillmentDetailsMenu } from "@/components/Modals/Sales/SaleFulfillmentDetailsMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { parseAsString, useQueryState } from "nuqs";
import FulfillmentBoard from "../_components/fulfillment/fulfillment-board";

type SalesOrdersPageProps = {
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	canEditSales: boolean;
	canDeleteSales: boolean;
	// Alimenta o popover fiscal dos cards (CTA de perfil fiscal, etc.) sem atravessar o quadro por props.
	fiscalPermissions: TFiscalUiPermissions;
};

export default function SalesOrdersPage({ organization, canEditSales, canDeleteSales, fiscalPermissions }: SalesOrdersPageProps) {
	const [selectedSaleId, setSelectedSaleId] = useQueryState("saleId", parseAsString.withOptions({ shallow: true }));

	function closeSaleDetails() {
		const triggerId = selectedSaleId ? `sale-details-trigger-${selectedSaleId}` : null;
		void setSelectedSaleId(null, { history: "replace" }).then(() => {
			if (!triggerId) return;
			requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
		});
	}

	return (
		<FiscalPermissionsProvider value={fiscalPermissions}>
			<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
				<FulfillmentBoard
					organizationId={organization.id}
					organizationConfig={organization.configuracao}
					canEditSales={canEditSales}
					onViewDetails={(saleId) => void setSelectedSaleId(saleId, { history: "push" })}
				/>
				{selectedSaleId ? (
					<SaleFulfillmentDetailsMenu saleId={selectedSaleId} closeMenu={closeSaleDetails} canEditSales={canEditSales} canDeleteSales={canDeleteSales} />
				) : null}
			</div>
		</FiscalPermissionsProvider>
	);
}
