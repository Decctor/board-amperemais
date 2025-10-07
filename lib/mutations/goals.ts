import type { TCreateGoalInput, TCreateGoalOutput, TUpdateGoalInput, TUpdateGoalOutput } from "@/pages/api/goals";
import axios from "axios";

export async function createGoal(input: TCreateGoalInput) {
	const { data } = await axios.post<TCreateGoalOutput>("/api/goals", input);
	return data;
}

export async function updateGoal(input: TUpdateGoalInput) {
	const { data } = await axios.put<TUpdateGoalOutput>(`/api/goals?id=${input.goalId}`, input);
	return data;
}
