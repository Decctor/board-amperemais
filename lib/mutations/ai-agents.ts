import type { TCreatePlaygroundOutput } from "@/app/api/ai-agents/playground/route";
import type { TSendPlaygroundMessageInput, TSendPlaygroundMessageOutput } from "@/app/api/ai-agents/playground/messages/route";
import type { TUpdateAiAgentInput, TUpdateAiAgentOutput } from "@/app/api/ai-agents/route";
import axios from "axios";

export async function updateAiAgent(input: TUpdateAiAgentInput) {
	const response = await axios.put<TUpdateAiAgentOutput>("/api/ai-agents", input);
	return response.data;
}

export async function createPlaygroundChat() {
	const response = await axios.post<TCreatePlaygroundOutput>("/api/ai-agents/playground");
	return response.data;
}

export async function sendPlaygroundMessage(input: TSendPlaygroundMessageInput) {
	const response = await axios.post<TSendPlaygroundMessageOutput>("/api/ai-agents/playground/messages", input);
	return response.data;
}
