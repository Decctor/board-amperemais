import type { TCreateUserInput, TCreateUserOutput, TUpdateUserInput, TUpdateUserOutput } from "@/app/api/users/route";
import axios from "axios";

export async function createUser(input: TCreateUserInput) {
	const { data } = await axios.post<TCreateUserOutput>("/api/users", input);
	return data;
}

export async function updateUser(input: TUpdateUserInput) {
	const { data } = await axios.put<TUpdateUserOutput>(`/api/users?id=${input.id}`, input);
	return data;
}
