import type { TCreateOrganizationInput, TCreateOrganizationOutput } from "@/app/api/admin/organizations/route";
import type { TJoinAsMemberAdminInput, TJoinAsMemberAdminOutput } from "@/app/api/admin/organizations/join-as-member/route";
import axios from "axios";

export async function createOrganization(input: TCreateOrganizationInput) {
	const response = await axios.post<TCreateOrganizationOutput>("/api/admin/organizations", input);
	return response.data;
}

export async function joinAsMember(input: TJoinAsMemberAdminInput) {
	const response = await axios.post<TJoinAsMemberAdminOutput>("/api/admin/organizations/join-as-member", input);
	return response.data;
}
