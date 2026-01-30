import type {
	TGetOrganizationMembershipInvitationsInput,
	TGetOrganizationMembershipInvitationsOutput,
} from "@/app/api/organizations/memberships/invitations/route";
import type { TGetUserMembershipsOutput } from "@/app/api/organizations/memberships/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchUserMemberships() {
	const { data } = await axios.get<TGetUserMembershipsOutput>("/api/organizations/memberships");
	return data.data;
}

export function useUserMemberships() {
	return {
		...useQuery({
			queryKey: ["user-memberships"],
			queryFn: fetchUserMemberships,
		}),
		queryKey: ["user-memberships"],
	};
}

async function fetchOrganizationMembershipInvitations(input: TGetOrganizationMembershipInvitationsInput) {
	const searchParams = new URLSearchParams();
	if (input.pendingOnly) searchParams.set("pendingOnly", "true");
	const { data } = await axios.get<TGetOrganizationMembershipInvitationsOutput>(
		`/api/organizations/memberships/invitations?${searchParams.toString()}`,
	);
	return data.data.default;
}

export function useOrganizationMembershipInvitations(input: TGetOrganizationMembershipInvitationsInput) {
	return useQuery({
		queryKey: ["organization-membership-invitations", input],
		queryFn: () => fetchOrganizationMembershipInvitations(input),
	});
}
