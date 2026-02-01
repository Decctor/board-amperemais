import type { TGetOnboardingQualityOutput } from "@/app/api/organizations/onboarding-quality/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchOnboardingQuality() {
	const { data } = await axios.get<TGetOnboardingQualityOutput>("/api/organizations/onboarding-quality");
	return data.data;
}

export function useOnboardingQuality() {
	return {
		...useQuery({
			queryKey: ["onboarding-quality"],
			queryFn: fetchOnboardingQuality,
			staleTime: 1000 * 60 * 5, // 5 minutes
		}),
		queryKey: ["onboarding-quality"],
	};
}
