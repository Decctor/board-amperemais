import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import type { TClientByLookupOutput } from "@/pages/api/clients/lookup";
import type { LucideIcon } from "lucide-react";

export type TPrize = {
	id: string;
	titulo: string;
	descricao: string | null;
	imagemCapaUrl: string | null;
	valor: number;
	valorVenda: number;
	produto: { grupo: string } | null;
};

export type TStepDefinition = {
	id: number;
	label: string;
	icon: LucideIcon;
};

export type TRedemptionLimit = {
	terminologia: TCashbackProgramTerminologyEnum;
	tipo: string | null;
	valor: number | null;
};

export type TClientData = TClientByLookupOutput["data"];

export type TNewClientFormData = {
	id?: string | null;
	nome: string;
	cpfCnpj?: string | null;
	telefone: string;
};
