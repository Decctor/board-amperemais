import type {
	TCreateOrganizationMembershipInvitationInput,
	TCreateOrganizationMembershipInvitationOutput,
} from "@/app/api/organizations/memberships/invitations/route";
import type { TUpdateOrganizationMembershipInput, TUpdateOrganizationMembershipOutput } from "@/app/api/organizations/memberships/route";
import type {
	TCreateOrganizationInputSchema,
	TCreateOrganizationOutput,
	TUpdateOrganizationInput,
	TUpdateOrganizationOutput,
} from "@/app/api/organizations/route";
import type { TUpsertOnboardingCashbackInput, TUpsertOnboardingCashbackOutput } from "@/app/api/organizations/onboarding/cashback/route";
import type { TSeedOnboardingCampaignsInput, TSeedOnboardingCampaignsOutput } from "@/app/api/organizations/onboarding/campaigns/route";
import type { TCompleteOnboardingOutput } from "@/app/api/organizations/onboarding/route";
import type { TSwitchOrganizationInput, TSwitchOrganizationOutput } from "@/app/auth/switch-organization/route";
import axios from "axios";
export async function createOrganization(input: TCreateOrganizationInputSchema) {
	const { data } = await axios.post<TCreateOrganizationOutput>("/api/organizations", input);
	return data;
}

export async function completeOnboarding() {
	const { data } = await axios.post<TCompleteOnboardingOutput>("/api/organizations/onboarding", {});
	return data;
}

export async function upsertOnboardingCashback(input: TUpsertOnboardingCashbackInput) {
	const { data } = await axios.post<TUpsertOnboardingCashbackOutput>("/api/organizations/onboarding/cashback", input);
	return data;
}

export async function seedOnboardingCampaigns(input: TSeedOnboardingCampaignsInput) {
	const { data } = await axios.post<TSeedOnboardingCampaignsOutput>("/api/organizations/onboarding/campaigns", input);
	return data;
}

export async function switchOrganization(input: TSwitchOrganizationInput) {
	const { data } = await axios.put<TSwitchOrganizationOutput>("/auth/switch-organization", input);
	return data;
}

export async function updateOrganization(input: TUpdateOrganizationInput) {
	const { data } = await axios.put<TUpdateOrganizationOutput>("/api/organizations", input);
	return data;
}

export async function createOrganizationMembershipInvitation(input: TCreateOrganizationMembershipInvitationInput) {
	const { data } = await axios.post<TCreateOrganizationMembershipInvitationOutput>("/api/organizations/memberships/invitations", input);
	return data;
}

export async function updateOrganizationMembership(input: TUpdateOrganizationMembershipInput) {
	const { data } = await axios.put<TUpdateOrganizationMembershipOutput>("/api/organizations/memberships", input);
	return data;
}
