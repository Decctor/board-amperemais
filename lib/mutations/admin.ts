import type { TCreateOrganizationInput, TCreateOrganizationOutput } from "@/app/api/admin/organizations/route";
import axios from "axios";

export async function createOrganization(input: TCreateOrganizationInput) {
	const response = await axios.post<TCreateOrganizationOutput>("/api/admin/organizations", input);
	return response.data;
}
