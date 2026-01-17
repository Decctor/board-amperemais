import type { TCreateOrganizationInputSchema, TCreateOrganizationOutput } from "@/app/api/organizations/route";
import axios from "axios";

export async function createOrganization(input: TCreateOrganizationInputSchema) {
	const { data } = await axios.post<TCreateOrganizationOutput>("/api/organizations", input);
	return data;
}
