import type { TGetUsersInput, TGetUsersOutput } from "@/app/api/users/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

async function fetchUsers(input: Omit<TGetUsersInput, "id">) {
	const searchParams = new URLSearchParams();
	if (input.search) searchParams.set("search", input.search);
	const { data } = await axios.get<TGetUsersOutput>(`/api/users?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Usuários não encontrados.");
	return result;
}
async function fetchUserById(id: string) {
	const { data } = await axios.get<TGetUsersOutput>(`/api/users?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Usuário não encontrado.");
	return result;
}

type UseUsersParams = {
	initialFilters?: Partial<Omit<TGetUsersInput, "id">>;
	enabled?: boolean;
};
export function useUsers({ initialFilters, enabled = true }: UseUsersParams) {
	const [filters, setFilters] = useState<Omit<TGetUsersInput, "id">>({
		search: initialFilters?.search || "",
	});
	function updateFilters(newParams: Partial<Omit<TGetUsersInput, "id">>) {
		setFilters((prevFilters) => ({ ...prevFilters, ...newParams }));
	}
	const debouncedFilters = useDebounceMemo(filters, 500);
	return {
		...useQuery({
			queryKey: ["users"],
			queryFn: async () => await fetchUsers(debouncedFilters),
			enabled,
		}),
		queryKey: ["users", debouncedFilters],
		filters,
		updateFilters,
	};
}

export function useUserById(id: string) {
	return {
		...useQuery({
			queryKey: ["user-by-id", id],
			queryFn: async () => await fetchUserById(id),
			refetchOnWindowFocus: false,
		}),
		queryKey: ["user-by-id", id],
	};
}
