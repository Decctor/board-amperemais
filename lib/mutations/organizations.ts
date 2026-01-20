import type { TSwitchOrganizationInput, TSwitchOrganizationOutput } from "@/app/api/organizations/memberships/route";
import type { TCreateOrganizationInputSchema, TCreateOrganizationOutput } from "@/app/api/organizations/route";
import axios from "axios";

export async function createOrganization(input: TCreateOrganizationInputSchema) {
	const { data } = await axios.post<TCreateOrganizationOutput>("/api/organizations", input);
	return data;
}

export async function switchOrganization(input: TSwitchOrganizationInput) {
	const { data } = await axios.put<TSwitchOrganizationOutput>("/api/organizations/memberships", input);
	return data;
}
