import type { TCreateAgentConnectionInput, TCreateAgentConnectionOutput } from "@/app/api/access/agent-connections/route";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { describeAccessScope } from "@/lib/access/scope-catalog";
import { getErrorMessage } from "@/lib/errors";
import { createAgentConnection } from "@/lib/mutations/access";
import { useAgentConnectionOptions } from "@/lib/queries/access";
import { cn, copyToClipboard } from "@/lib/utils";
import type { TAccessScopeEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import { Bot, Copy, KeyRound, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";

const CONNECTABLE_APPS = [
	{ codigo: "AGENT_CLAUDE", titulo: "Claude", descricao: "Conector personalizado no Claude (web, desktop ou Claude Code)." },
	{ codigo: "AGENT_CHATGPT", titulo: "ChatGPT", descricao: "Conector personalizado no ChatGPT, com o modo desenvolvedor habilitado." },
] as const;

type NewAgentConnectionProps = {
	closeModal: () => void;
	callbacks?: {
		onMutate?: (variables: TCreateAgentConnectionInput) => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export function NewAgentConnection({ closeModal, callbacks }: NewAgentConnectionProps) {
	const { data: options, isLoading, isError, error } = useAgentConnectionOptions();
	const [accessClientCodigo, setAccessClientCodigo] = useState<(typeof CONNECTABLE_APPS)[number]["codigo"]>("AGENT_CLAUDE");
	const [nome, setNome] = useState("");
	const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
	const [created, setCreated] = useState<TCreateAgentConnectionOutput["data"] | null>(null);

	// Memoizado porque entra como dependência do efeito abaixo: `?? []` cria um array novo a cada
	// render, e um array novo por render faria o efeito rodar em laço com o próprio setState.
	const availableScopes = useMemo(
		() => options?.aplicacoes.find((app) => app.codigo === accessClientCodigo)?.escoposPermitidos ?? [],
		[options, accessClientCodigo],
	);

	// A pré-seleção é a leitura sugerida, e não o teto inteiro: PII de cliente, quando a aplicação
	// pode pedi-la, tem de ser uma escolha consciente de quem cria a conexão. Trocar de aplicação
	// re-seleciona, porque o teto de cada uma é diferente.
	useEffect(() => {
		if (!options) return;
		setSelectedScopes(options.escoposSugeridos.filter((scope) => availableScopes.includes(scope)));
	}, [options, availableScopes]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-agent-connection"],
		mutationFn: createAgentConnection,
		onMutate: (variables) => callbacks?.onMutate?.(variables),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			setCreated(data.data);
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	if (created) return <AgentConnectionCreated connection={created} closeModal={closeModal} />;

	return (
		<ResponsiveMenu
			menuTitle="NOVA CONEXÃO DE IA"
			menuDescription="Gere uma chave para conectar o RecompraCRM a um assistente de IA."
			menuActionButtonText="CRIAR CONEXÃO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate({ accessClientCodigo, nome, scopes: selectedScopes as TAccessScopeEnum[] })}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<ResponsiveMenuSection title="APLICAÇÃO" icon={<Sparkles className="h-4 w-4 min-h-4 min-w-4" />}>
				<div className="flex w-full flex-col gap-1.5">
					{CONNECTABLE_APPS.map((app) => {
						const isSelected = accessClientCodigo === app.codigo;
						const isAvailable = options?.aplicacoes.some((option) => option.codigo === app.codigo) ?? false;
						return (
							<button
								key={app.codigo}
								type="button"
								disabled={!isAvailable}
								onClick={() => setAccessClientCodigo(app.codigo)}
								className={cn(
									"flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
									isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
									!isAvailable && "cursor-not-allowed opacity-50",
								)}
							>
								<div className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Sparkles className="h-5 w-5" />
								</div>
								<div className="flex min-w-0 flex-col gap-0.5">
									<span className="text-sm font-semibold">{app.titulo}</span>
									<span className="text-xs text-muted-foreground">{app.descricao}</span>
								</div>
							</button>
						);
					})}
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="IDENTIFICAÇÃO" icon={<Bot className="h-4 w-4 min-h-4 min-w-4" />}>
				<TextInput label="NOME DA CONEXÃO" value={nome} handleChange={setNome} placeholder="Ex.: Claude do João" />
				<p className="text-xs text-muted-foreground">
					Este nome aparece na auditoria de acessos. Use algo que diga de quem é a conexão — é assim que você vai saber qual revogar.
				</p>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="PERMISSÕES" icon={<KeyRound className="h-4 w-4 min-h-4 min-w-4" />}>
				<p className="max-w-[52ch] text-xs text-muted-foreground">
					O assistente só consegue consultar o que estiver ligado aqui, e nunca altera nada. Você pode mudar depois, com efeito imediato.
				</p>
				<div className="flex w-full flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
					{availableScopes.map((scope) => (
						<ScopeToggleRow
							key={scope}
							scope={scope}
							isActive={selectedScopes.includes(scope)}
							onToggle={(isActive) => setSelectedScopes((current) => (isActive ? current.filter((item) => item !== scope) : [...current, scope]))}
						/>
					))}
				</div>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}

type ScopeToggleRowProps = {
	scope: string;
	isActive: boolean;
	onToggle: (isActive: boolean) => void;
};
// htmlFor em vez de <label> envolvendo o Switch: o Switch da Radix é um <button>, e aninhá-lo num
// label dispararia o clique duas vezes.
function ScopeToggleRow({ scope, isActive, onToggle }: ScopeToggleRowProps) {
	const switchId = useId();
	const { label, description } = describeAccessScope(scope);

	return (
		<div className="flex w-full items-center justify-between gap-3 p-3" title={scope}>
			<label htmlFor={switchId} className="flex min-w-0 cursor-pointer flex-col gap-0.5">
				<span className="text-sm font-semibold">{label}</span>
				<span className="text-xs text-muted-foreground">{description}</span>
			</label>
			<Switch id={switchId} className="shrink-0" checked={isActive} onCheckedChange={() => onToggle(isActive)} />
		</div>
	);
}

type AgentConnectionCreatedProps = {
	connection: TCreateAgentConnectionOutput["data"];
	closeModal: () => void;
};
/**
 * A chave aparece **uma única vez**: só o SHA-256 do segredo fica no banco, e não existe tela de
 * "ver chave" depois. O aviso é tão importante quanto a chave — sem ele o lojista fecha o modal
 * e volta procurando onde ela ficou guardada.
 */
function AgentConnectionCreated({ connection, closeModal }: AgentConnectionCreatedProps) {
	const endpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`;

	return (
		<ResponsiveMenu
			menuTitle="CONEXÃO CRIADA"
			menuDescription="Copie a chave agora — ela não será exibida novamente."
			mode="read-only"
			menuCancelButtonText="FECHAR"
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
		>
			<div className="flex w-full flex-col gap-4 py-2">
				<div className="flex w-full items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3">
					<TriangleAlert className="h-4 w-4 min-h-4 min-w-4 text-amber-600" />
					<p className="text-xs text-amber-700 dark:text-amber-400">
						Guarde a chave em local seguro. Ao fechar esta janela ela deixa de ser recuperável — se perder, gere uma nova pela conexão.
					</p>
				</div>

				<div className="flex w-full flex-col gap-2">
					<span className="text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground">CHAVE DE ACESSO</span>
					<div className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3">
						<code className="min-w-0 grow select-all break-all font-mono text-xs">{connection.token}</code>
						<Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => copyToClipboard(connection.token)}>
							<Copy className="h-4 w-4 min-h-4 min-w-4" />
							COPIAR
						</Button>
					</div>
				</div>

				<div className="flex w-full flex-col gap-2">
					<span className="text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground">ENDEREÇO DO SERVIDOR</span>
					<div className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3">
						<code className="min-w-0 grow select-all break-all font-mono text-xs">{endpoint}</code>
						<Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => copyToClipboard(endpoint)}>
							<Copy className="h-4 w-4 min-h-4 min-w-4" />
							COPIAR
						</Button>
					</div>
				</div>

				<div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3">
					<div className="flex items-center gap-2">
						<Bot className="h-4 w-4 min-h-4 min-w-4 text-primary" />
						<span className="text-sm font-semibold">Como conectar</span>
					</div>
					<ol className="flex list-decimal flex-col gap-1 pl-4 text-xs text-muted-foreground">
						<li>No assistente, abra as configurações de conectores e escolha adicionar um conector personalizado.</li>
						<li>Cole o endereço do servidor acima.</li>
						<li>Informe a chave como autenticação por token (Bearer).</li>
					</ol>
				</div>
			</div>
		</ResponsiveMenu>
	);
}

export default NewAgentConnection;
