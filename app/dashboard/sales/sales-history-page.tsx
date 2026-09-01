"use client";

import type { TAuthUserSession } from "@/lib/authentication/types";
import { SalesHistoryView, SalesModuleActions } from "./sales-page";

type SalesHistoryPageProps = {
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	canEditSales: boolean;
	canEmitFiscal: boolean;
};

export default function SalesHistoryPage({ organization, canEditSales, canEmitFiscal }: SalesHistoryPageProps) {
	return (
		<div className="flex h-full w-full flex-col gap-3">
			<div className="flex items-center justify-end">
				<SalesModuleActions orgHasERPAccess={organization.configuracao.recursos.erp.acesso} />
			</div>
			<SalesHistoryView canEditSales={canEditSales} canEmitFiscal={canEmitFiscal} orgHasERPAccess={organization.configuracao.recursos.erp.acesso} />
		</div>
	);
}
