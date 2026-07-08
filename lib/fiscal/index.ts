import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { SpedyFiscalProvider } from "./providers/spedy";
import { ManualFiscalProvider } from "./providers/manual";
import type { IFiscalProvider } from "./types";

export function getFiscalProvider(organization: Pick<TOrganizationEntity, "fiscalProvedor">): IFiscalProvider {
	switch (organization.fiscalProvedor) {
		case "SPEDY":
			return new SpedyFiscalProvider();
		case "MANUAL":
		case null:
		case undefined:
		default:
			return new ManualFiscalProvider();
	}
}

export * from "./types";
export * from "./documents";
export * from "./settings";
