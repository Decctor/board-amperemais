import type {
	TCreateOrganizationInput,
	TCreateOrganizationOutput,
	TUpdateOrganizationInput,
	TUpdateOrganizationOutput,
} from "@/app/api/admin/organizations/route";
import type { TJoinAsMemberAdminInput, TJoinAsMemberAdminOutput } from "@/app/api/admin/organizations/join-as-member/route";
import type { TExportMarketingContextInput, TExportMarketingContextOutput } from "@/app/api/admin/marketing-context/route";
import axios from "axios";

export async function createOrganization(input: TCreateOrganizationInput) {
	const response = await axios.post<TCreateOrganizationOutput>("/api/admin/organizations", input);
	return response.data;
}

export async function joinAsMember(input: TJoinAsMemberAdminInput) {
	const response = await axios.post<TJoinAsMemberAdminOutput>("/api/admin/organizations/join-as-member", input);
	return response.data;
}

export async function updateOrganization(input: TUpdateOrganizationInput) {
	const response = await axios.put<TUpdateOrganizationOutput>("/api/admin/organizations", input);
	return response.data;
}

export async function exportMarketingContext(input: TExportMarketingContextInput) {
	const response = await axios.post<TExportMarketingContextOutput>("/api/admin/marketing-context", input);
	return response.data;
}
