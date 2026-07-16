import type {
	TCreateIfoodInterruptionInput,
	TCreateIfoodInterruptionOutput,
	TDeleteIfoodInterruptionInput,
	TDeleteIfoodInterruptionOutput,
} from "@/app/api/integrations/ifood/merchants/interruptions/route";
import type { TCatalogActionInput, TCatalogActionOutput } from "@/app/api/integrations/ifood/catalog/route";
import type {
	TUpdateIfoodOpeningHoursInput,
	TUpdateIfoodOpeningHoursOutput,
} from "@/app/api/integrations/ifood/merchants/opening-hours/route";
import axios from "axios";

export async function createIfoodInterruption(input: TCreateIfoodInterruptionInput) {
	const { data } = await axios.post<TCreateIfoodInterruptionOutput>("/api/integrations/ifood/merchants/interruptions", input);
	return data;
}

export async function deleteIfoodInterruption(input: TDeleteIfoodInterruptionInput) {
	const { data } = await axios.delete<TDeleteIfoodInterruptionOutput>(
		`/api/integrations/ifood/merchants/interruptions?merchantId=${input.merchantId}&interruptionId=${input.interruptionId}`,
	);
	return data;
}

export async function updateIfoodOpeningHours(input: TUpdateIfoodOpeningHoursInput) {
	const { data } = await axios.put<TUpdateIfoodOpeningHoursOutput>("/api/integrations/ifood/merchants/opening-hours", input);
	return data;
}

export async function upgradeIfoodCatalog(input: TCatalogActionInput) {
	const { data } = await axios.post<TCatalogActionOutput>("/api/integrations/ifood/catalog", input);
	return data;
}
