import type { TGetUtilsInput, TGetUtilsOutput } from "@/app/api/utils/route";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function getUtils(input: Exclude<TGetUtilsInput, "id">) {
	const searchParams = new URLSearchParams();
	if (input.identifier) searchParams.set("identifier", input.identifier);
	const { data } = await axios.get<TGetUtilsOutput>(`/api/utils?${searchParams.toString()}`);
	const result = data.data.default;
	if (!result) throw new Error("Utils não encontradas.");
	return result;
}

export function useUtilsByIdentifier({ identifier }: Exclude<TGetUtilsInput, "id">) {
	return {
		...useQuery({
			queryKey: ["utils", identifier],
			queryFn: () => getUtils({ identifier }),
		}),
		queryKey: ["utils", identifier],
	};
}

async function getUtilsById(id: string) {
	const { data } = await axios.get<TGetUtilsOutput>(`/api/utils?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("Util não encontrada.");
	return result;
}

export function useUtilsById({ id }: { id: string }) {
	return {
		...useQuery({
			queryKey: ["utils-by-id", id],
			queryFn: () => getUtilsById(id),
		}),
		queryKey: ["utils-by-id", id],
	};
}
