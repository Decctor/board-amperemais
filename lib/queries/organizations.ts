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
