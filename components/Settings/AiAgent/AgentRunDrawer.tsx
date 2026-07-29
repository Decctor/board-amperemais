import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { useAiAgentRunById } from "@/lib/queries/ai-agents";
import { cn } from "@/lib/utils";
import { formatDateAsLocale } from "@/lib/formatting";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type AgentRunDrawerProps = {
	runId: string;
	closeModal: () => void;
};

const TOOL_CALL_STATUS_STYLES = {
	CONCLUIDO: { icon: CheckCircle2, className: "text-emerald-600" },
	FALHA: { icon: XCircle, className: "text-destructive" },
	EXECUTANDO: { icon: AlertTriangle, className: "text-amber-600" },
} as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
	return <h3 className="text-xs font-medium uppercase tracking-tight text-muted-foreground">{children}</h3>;
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
	if (value === null || value === undefined) return null;
	return (
		<details className="w-full">
			<summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">{label}</summary>
			<pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted px-3 py-2 text-[11px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>
		</details>
	);
}

/**
 * Timeline de uma execução: o que o agente consultou, com quais argumentos, o que voltou e o
 * que ele respondeu. É a ferramenta para entender por que o agente disse o que disse.
 */
export default function AgentRunDrawer({ runId, closeModal }: AgentRunDrawerProps) {
	const { data: run, isLoading, isError, error } = useAiAgentRunById({ runId });

	return (
		<ResponsiveMenu
			mode="read-only"
			menuTitle="EXECUÇÃO DO AGENTE"
			menuDescription="Detalhe do que o agente consultou e respondeu."
			closeMenu={closeModal}
			menuCancelButtonText="FECHAR"
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			dialogVariant="lg"
			drawerVariant="lg"
		>
			{run ? (
				<div className="flex w-full flex-col gap-5">
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						<div className="flex flex-col">
							<SectionLabel>STATUS</SectionLabel>
							<span className={cn("text-sm font-bold", run.status === "CONCLUIDO" && "text-emerald-600", run.status === "FALHA" && "text-destructive")}>
								{run.status}
							</span>
						</div>
						<div className="flex flex-col">
							<SectionLabel>ORIGEM</SectionLabel>
							<span className="text-sm font-bold">{run.gatilho === "PLAYGROUND" ? "TESTE" : "WHATSAPP"}</span>
						</div>
						<div className="flex flex-col">
							<SectionLabel>QUANDO</SectionLabel>
							<span className="text-sm font-bold">{formatDateAsLocale(run.dataInsercao, true)}</span>
						</div>
						<div className="flex flex-col">
							<SectionLabel>TOKENS</SectionLabel>
							<span className="text-sm font-bold">{run.uso?.tokensTotal ?? "—"}</span>
						</div>
					</div>

					{run.erro ? (
						<div className="flex w-full flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
							<SectionLabel>ERRO</SectionLabel>
							<p className="text-sm font-medium text-destructive">{run.erro}</p>
							<p className="text-xs text-muted-foreground">
								Nada foi enviado ao cliente. Verifique as ferramentas habilitadas e os limites do agente; se o erro persistir, reproduza o cenário na aba
								Playground.
							</p>
						</div>
					) : null}

					{run.mensagemEnviada ? (
						<div className="flex w-full flex-col gap-1">
							<SectionLabel>MENSAGEM ENVIADA</SectionLabel>
							<p className="rounded-lg bg-muted px-3 py-2 text-sm">{run.mensagemEnviada.conteudoTexto}</p>
							<span className="text-xs text-muted-foreground">Entrega: {run.mensagemEnviada.statusEntrega}</span>
						</div>
					) : null}

					{run.outputResumo ? (
						<div className="flex w-full flex-col gap-1">
							<SectionLabel>RESUMO DO ATENDIMENTO</SectionLabel>
							<p className="text-sm">{run.outputResumo}</p>
						</div>
					) : null}

					<div className="flex w-full flex-col gap-2">
						<SectionLabel>CONSULTAS FEITAS ({run.chamadasFerramentas.length})</SectionLabel>
						{run.chamadasFerramentas.length === 0 ? (
							<p className="text-sm text-muted-foreground">O agente respondeu sem consultar nada.</p>
						) : (
							run.chamadasFerramentas.map((toolCall) => {
								const style = TOOL_CALL_STATUS_STYLES[toolCall.status] ?? TOOL_CALL_STATUS_STYLES.EXECUTANDO;
								const Icon = style.icon;
								return (
									<div key={toolCall.id} className="flex w-full flex-col gap-2 rounded-lg border border-border px-3 py-2">
										<div className="flex items-center gap-2">
											<Icon className={cn("h-4 w-4 shrink-0", style.className)} />
											<span className="font-mono text-xs font-bold">{toolCall.ferramentaNome}</span>
										</div>
										{toolCall.erro ? <p className="text-xs text-destructive">{toolCall.erro}</p> : null}
										<JsonBlock label="Argumentos" value={toolCall.input} />
										<JsonBlock label="Resultado" value={toolCall.output} />
									</div>
								);
							})
						)}
					</div>

					<div className="flex w-full flex-col gap-2 border-t pt-3">
						<JsonBlock label="Configuração usada nesta execução" value={run.configSnapshot} />
						<JsonBlock label="Contexto enviado ao agente" value={run.contextoEntradaSnapshot} />
					</div>
				</div>
			) : null}
		</ResponsiveMenu>
	);
}
