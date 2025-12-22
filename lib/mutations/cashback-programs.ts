import type {
	TCreateCashbackProgramInput,
	TCreateCashbackProgramOutput,
	TUpdateCashbackProgramInput,
	TUpdateCashbackProgramOutput,
} from "@/app/api/cashback-programs/route";
import axios from "axios";

export async function createCashbackProgram(input: TCreateCashbackProgramInput) {
	const { data } = await axios.post<TCreateCashbackProgramOutput>("/api/cashback-programs", input);
	return data;
}

export async function updateCashbackProgram(input: TUpdateCashbackProgramInput) {
	const { data } = await axios.put<TUpdateCashbackProgramOutput>("/api/cashback-programs", input);
	return data;
}
