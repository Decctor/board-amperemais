import type { TGetPrintJobsManagementOutput } from "@/app/api/desktop-agent/print-jobs/management/route";
import type { TGetAgentPrintersOutput } from "@/app/api/desktop-agent/printers/route";
import type { TPrintJobFinalidadeEnum, TPrintJobStatusEnum } from "@/schemas/enums";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export type TAgentPrinterListItem = TGetAgentPrintersOutput["data"]["impressoras"][number];
export type TPrintJobListItem = TGetPrintJobsManagementOutput["data"]["jobs"][number];

async function fetchAgentPrinters() {
	const { data } = await axios.get<TGetAgentPrintersOutput>("/api/desktop-agent/printers");
	return data.data.impressoras;
}

// Query org-wide única: alimenta o estado dos botões de impressão em vendas/produções e a
// gestão em configurações — mesmo queryKey, um fetch por página.
export function useAgentPrinters() {
	const queryKey = ["agent-printers"] as const;
	return {
		...useQuery({ queryKey, queryFn: fetchAgentPrinters }),
		queryKey,
	};
}

// Há impressora apta (ativa + presente no último sync) atendendo esta finalidade?
// É o seletor que liga/desliga os botões de impressão nas telas operacionais.
export function organizationHasPrinterForFinalidade(printers: TAgentPrinterListItem[] | undefined, finalidade: TPrintJobFinalidadeEnum) {
	if (!printers) return false;
	return printers.some((printer) => printer.ativa && printer.disponivel && printer.finalidades.includes(finalidade));
}

async function fetchAgentPrintJobs(status?: TPrintJobStatusEnum | null) {
	const searchParams = new URLSearchParams();
	if (status) searchParams.set("status", status);
	const { data } = await axios.get<TGetPrintJobsManagementOutput>(`/api/desktop-agent/print-jobs/management?${searchParams.toString()}`);
	return data.data.jobs;
}

export function useAgentPrintJobs({ status }: { status?: TPrintJobStatusEnum | null } = {}) {
	const queryKey = ["agent-print-jobs", status ?? "all"] as const;
	return {
		...useQuery({ queryKey, queryFn: () => fetchAgentPrintJobs(status) }),
		queryKey,
	};
}
