import type { TCreateManualPrintJobInput, TCreateManualPrintJobOutput } from "@/app/api/desktop-agent/print-jobs/management/route";
import type { TUpdateAgentPrinterInput, TUpdateAgentPrinterOutput } from "@/app/api/desktop-agent/printers/route";
import type { TPublishAgentVersionInput, TPublishAgentVersionOutput } from "@/app/api/desktop-agent/versions/route";
import axios from "axios";

export async function updateAgentPrinter(input: TUpdateAgentPrinterInput) {
	const { data } = await axios.patch<TUpdateAgentPrinterOutput>("/api/desktop-agent/printers", input);
	return data;
}

export async function createManualPrintJob(input: TCreateManualPrintJobInput) {
	const { data } = await axios.post<TCreateManualPrintJobOutput>("/api/desktop-agent/print-jobs/management", input);
	return data;
}

// Promove uma versão já enviada pelo CI. Não existe função de upload aqui de
// propósito — ver lib/files-storage/desktop-agent.ts.
export async function publishAgentVersion(input: TPublishAgentVersionInput) {
	const { data } = await axios.patch<TPublishAgentVersionOutput>("/api/desktop-agent/versions", input);
	return data;
}
