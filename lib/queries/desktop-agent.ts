import type { TGetPrintJobsManagementOutput } from "@/app/api/desktop-agent/print-jobs/management/route";
import type { TGetAgentPrintersOutput } from "@/app/api/desktop-agent/printers/route";
import type { TGetCurrentAgentVersionOutput } from "@/app/api/desktop-agent/versions/current/route";
import type { TGetAgentVersionsOutput } from "@/app/api/desktop-agent/versions/route";
import type { TPrintJobFinalidadeEnum, TPrintJobStatusEnum } from "@/schemas/enums";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export type TAgentPrinterListItem = TGetAgentPrintersOutput["data"]["impressoras"][number];
export type TPrintJobListItem = TGetPrintJobsManagementOutput["data"]["jobs"][number];
export type TAgentVersionListItem = TGetAgentVersionsOutput["data"]["versoes"][number];

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

async function fetchCurrentAgentVersion() {
	const { data } = await axios.get<TGetCurrentAgentVersionOutput>("/api/desktop-agent/versions/current");
	return data.data.versao;
}

// A versão publicada, para o botão de download em DISPOSITIVOS. Devolve null
// quando nada foi publicado ainda — estado legítimo, não erro.
export function useCurrentAgentVersion() {
	const queryKey = ["agent-version-current"] as const;
	return {
		...useQuery({ queryKey, queryFn: fetchCurrentAgentVersion }),
		queryKey,
	};
}

async function fetchAgentVersions() {
	const { data } = await axios.get<TGetAgentVersionsOutput>("/api/desktop-agent/versions");
	return data.data.versoes;
}

// Lista completa, só para superusuário: é a tela de promover versão.
export function useAgentVersions() {
	const queryKey = ["agent-versions"] as const;
	return {
		...useQuery({ queryKey, queryFn: fetchAgentVersions }),
		queryKey,
	};
}
