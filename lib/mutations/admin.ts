import type {
	TCreateOrganizationInput,
	TCreateOrganizationOutput,
	TDeleteOrganizationInput,
	TDeleteOrganizationOutput,
	TUpdateOrganizationInput,
	TUpdateOrganizationOutput,
} from "@/app/api/admin/organizations/route";
import type { TJoinAsMemberAdminInput, TJoinAsMemberAdminOutput } from "@/app/api/admin/organizations/join-as-member/route";
import type { TUpdateUserAdminInput, TUpdateUserAdminOutput } from "@/app/api/admin/users/route";
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

export async function deleteOrganization(input: TDeleteOrganizationInput) {
	const response = await axios.delete<TDeleteOrganizationOutput>(`/api/admin/organizations?id=${input.organizationId}`);
	return response.data;
}

export async function updateUserAsAdmin(input: TUpdateUserAdminInput) {
	const response = await axios.put<TUpdateUserAdminOutput>("/api/admin/users", input);
	return response.data;
}
