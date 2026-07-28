import type { TSubmitDealOnboardingInput, TSubmitDealOnboardingOutput } from "@/app/api/public/deal-onboarding/route";
import axios from "axios";

export async function submitDealOnboarding(input: TSubmitDealOnboardingInput) {
	const response = await axios.post<TSubmitDealOnboardingOutput>("/api/public/deal-onboarding", input);
	return response.data;
}
