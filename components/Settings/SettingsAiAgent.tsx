"use client";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { Bot, ListChecks, MessageSquare } from "lucide-react";
import { useState } from "react";
import AgentConfigForm from "./AiAgent/AgentConfigForm";
import AgentPlayground from "./AiAgent/AgentPlayground";
import AgentRunsList from "./AiAgent/AgentRunsList";

type SettingsAiAgentProps = {
	membership: NonNullable<TAuthUserSession["membership"]>;
};

type TAiAgentTab = "configuracao" | "execucoes" | "playground";

const TABS: Array<{ value: TAiAgentTab; label: string; icon: typeof Bot }> = [
	{ value: "configuracao", label: "CONFIGURAÇÃO", icon: Bot },
	{ value: "execucoes", label: "EXECUÇÕES", icon: ListChecks },
	{ value: "playground", label: "TESTAR", icon: MessageSquare },
];

export default function SettingsAiAgent({ membership }: SettingsAiAgentProps) {
	const [tab, setTab] = useState<TAiAgentTab>("configuracao");

	// Mesma capability que os webhooks checam antes de executar o agente: configurar um
	// recurso que não vai rodar seria uma promessa vazia.
	const hasAccess = membership.organizacao.configuracao?.recursos?.iaAtendimento?.acesso === true;
	if (!hasAccess) {
		return (
			<div className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-12 text-center">
				<Bot className="h-8 w-8 text-muted-foreground" />
				<p className="text-sm font-medium">Atendimento com IA não está no seu plano</p>
				<p className="max-w-md text-xs text-muted-foreground">
					Com o agente de IA ativo, seus clientes recebem resposta imediata no WhatsApp — sobre produtos, compras anteriores, saldo de cashback e cupons —
					e a conversa é passada para a equipe quando precisa de uma pessoa. Fale com a gente para habilitar.
				</p>
			</div>
		);
	}

	if (!membership.permissoes.empresa.visualizar) {
		return (
			<div className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-12 text-center">
				<p className="text-sm font-medium">Você não tem permissão para ver o agente de IA</p>
				<p className="text-xs text-muted-foreground">Peça a um administrador da organização o acesso de visualização da empresa.</p>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex items-center gap-2 border-b pb-3">
				{TABS.map((item) => {
					const Icon = item.icon;
					return (
						<Button
							key={item.value}
							size="sm"
							variant={tab === item.value ? "secondary" : "ghost"}
							className="flex items-center gap-2"
							onClick={() => setTab(item.value)}
						>
							<Icon className="h-4 w-4" />
							{item.label}
						</Button>
					);
				})}
			</div>

			{tab === "configuracao" ? <AgentConfigForm /> : null}
			{tab === "execucoes" ? <AgentRunsList /> : null}
			{tab === "playground" ? <AgentPlayground /> : null}
		</div>
	);
}
