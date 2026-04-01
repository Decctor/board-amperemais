import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { NuvemFiscalProvider } from "./providers/nuvem-fiscal";
import { ManualFiscalProvider } from "./providers/manual";
import type { IFiscalProvider } from "./types";

export function getFiscalProvider(organization: Pick<TOrganizationEntity, "fiscalProvedor">): IFiscalProvider {
	switch (organization.fiscalProvedor) {
		case "NUVEM_FISCAL":
			return new NuvemFiscalProvider();
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
