import type { TGetGoalsByIdInput, TGetGoalsOutput } from "@/pages/api/goals";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function fetchGoals() {
	const { data } = await axios.get<TGetGoalsOutput>("/api/goals");
	if (!data.data.default) throw new Error("Não foi possível buscar as metas.");
	return data.data.default;
}
async function fetchGoalById(input: TGetGoalsByIdInput) {
	const { data } = await axios.get<TGetGoalsOutput>(`/api/goals?id=${input.id}`);
	if (!data.data.byId) throw new Error("Não foi possível buscar a meta.");
	return data.data.byId;
}

export function useGoals() {
	return {
		...useQuery({
			queryKey: ["goals"],
			queryFn: async () => await fetchGoals(),
		}),
		queryKey: ["goals"],
	};
}

export function useGoalById({ id }: TGetGoalsByIdInput) {
	return {
		...useQuery({
			queryKey: ["goal-by-id", id],
			queryFn: async () => await fetchGoalById({ id }),
		}),
		queryKey: ["goal-by-id", id],
	};
}
