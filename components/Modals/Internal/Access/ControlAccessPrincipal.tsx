import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { revokeAccessCredential, rotateAccessCredential, updateAccessGrant, updateAccessPrincipal } from "@/lib/mutations/access";
import { createManualPrintJob, updateAgentPrinter } from "@/lib/mutations/desktop-agent";
import { type TAgentPrinterListItem, useAgentPrinters } from "@/lib/queries/desktop-agent";
import type { TAccessScopeEnum, TPrintJobFinalidadeEnum } from "@/schemas/enums";
import { useAccessPrincipalById } from "@/lib/queries/access";
import { cn, copyToClipboard } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Copy, Info, KeyRound, Printer, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AccessStatusBadge from "./AccessStatusBadge";

type ControlAccessPrincipalProps = {
	principalId: string;
	canManage: boolean;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export function ControlAccessPrincipal({ principalId, canManage, closeModal, callbacks }: ControlAccessPrincipalProps) {
	const queryClient = useQueryClient();
	const { data: principal, queryKey, isLoading, error } = useAccessPrincipalById({ principalId });

	const [nome, setNome] = useState("");
	const [revokeArmed, setRevokeArmed] = useState(false);
	// Token exibido uma única vez após rotação — nunca persiste além desta sessão do modal.
	const [rotatedToken, setRotatedToken] = useState<string | null>(null);

	useEffect(() => {
		if (principal) setNome(principal.nome);
	}, [principal]);

	const refetchPrincipal = async () => await queryClient.invalidateQueries({ queryKey });

	const { mutate: mutateUpdate, isPending: isUpdating } = useMutation({
		mutationKey: ["update-access-principal", principalId],
		mutationFn: updateAccessPrincipal,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: async (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			await refetchPrincipal();
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const { mutate: mutateRevokeDevice, isPending: isRevokingDevice } = useMutation({
		mutationKey: ["revoke-access-principal", principalId],
		mutationFn: updateAccessPrincipal,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: async (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			await refetchPrincipal();
			setRevokeArmed(false);
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const { mutate: mutateRotate, isPending: isRotating } = useMutation({
		mutationKey: ["rotate-access-credential", principalId],
		mutationFn: rotateAccessCredential,
		onSuccess: async (data) => {
			toast.success(data.message);
			setRotatedToken(data.data.token);
			await refetchPrincipal();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const { mutate: mutateRevokeCredential, isPending: isRevokingCredential } = useMutation({
		mutationKey: ["revoke-access-credential", principalId],
		mutationFn: revokeAccessCredential,
		onSuccess: async (data) => {
			toast.success(data.message);
			await refetchPrincipal();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const { mutate: mutateGrant, isPending: isUpdatingGrant } = useMutation({
		mutationKey: ["update-access-grant", principalId],
		mutationFn: updateAccessGrant,
		onSuccess: async (data) => {
			toast.success(data.message);
			await refetchPrincipal();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	// Impressoras sincronizadas por este agente (só relevante para principals AGENTE_DESKTOP).
	const { data: printers, queryKey: printersQueryKey } = useAgentPrinters();
	const principalPrinters = printers?.filter((printer) => printer.principalId === principalId) ?? [];
	const refetchPrinters = async () => await queryClient.invalidateQueries({ queryKey: printersQueryKey });

	const isRevoked = principal?.status === "REVOGADO" || !!principal?.dataRevogacao;
	const activeScopes = principal?.grants.filter((grant) => !grant.dataRevogacao) ?? [];
	const activeScopeSet = new Set(activeScopes.map((grant) => grant.scope));
	// Teto do cliente + grants ativos fora do teto (teto pode ter encolhido — ainda precisam ser revogáveis).
	const manageableScopes = Array.from(new Set([...(principal?.cliente.escoposPermitidos ?? []), ...activeScopeSet]));
	const metadados = (principal?.metadados ?? {}) as { plataforma?: string; versaoApp?: string; modelo?: string; fabricante?: string };
	const nameChanged = !!principal && nome.trim().length > 0 && nome.trim() !== principal.nome;

	const readOnly = !canManage || isRevoked;

	return (
		<ResponsiveMenu
			menuTitle="DISPOSITIVO"
			menuDescription="Gerencie o vínculo, as credenciais e as permissões deste dispositivo."
			dialogVariant="md"
			drawerVariant="lg"
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			{...(readOnly
				? { mode: "read-only" as const, menuCancelButtonText: "FECHAR" }
				: {
						menuActionButtonText: "SALVAR",
						menuActionButtonDisabled: !nameChanged,
						menuCancelButtonText: "CANCELAR",
						actionFunction: () => mutateUpdate({ id: principalId, nome: nome.trim() }),
						actionIsLoading: isUpdating,
						menuSecondaryActionButtonText: revokeArmed ? "CONFIRMAR REVOGAÇÃO" : "REVOGAR DISPOSITIVO",
						menuSecondaryActionButtonClassName: revokeArmed
							? "bg-destructive text-white hover:bg-destructive/90"
							: "border-destructive/40 text-destructive hover:bg-destructive/10",
						menuSecondaryActionButtonDisabled: isRevokingDevice,
						secondaryActionFunction: () => {
							if (!revokeArmed) {
								setRevokeArmed(true);
								return;
							}
							mutateRevokeDevice({ id: principalId, status: "REVOGADO" });
						},
					})}
		>
			{principal ? (
				<div className="flex w-full flex-col gap-4">
					<ResponsiveMenuSection title="GERAL" icon={<Info className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />}>
						<div className="flex w-full items-center justify-between gap-2">
							<div className="flex flex-col gap-0.5">
								<span className="text-xs text-muted-foreground">{principal.cliente.nome}</span>
								<span className="text-xs text-muted-foreground">
									Ativado em {formatDateAsLocale(principal.dataInsercao, true)} · Último contato:{" "}
									{principal.ultimoAcesso ? formatDateAsLocale(principal.ultimoAcesso, true) : "nunca"}
								</span>
							</div>
							<AccessStatusBadge status={principal.status} />
						</div>
						<TextInput
							label="NOME DO DISPOSITIVO"
							value={nome}
							placeholder="Ex: Tablet do balcão principal"
							editable={!readOnly}
							handleChange={(value) => setNome(value)}
						/>
						{metadados.plataforma || metadados.versaoApp || metadados.modelo ? (
							<div className="flex flex-wrap items-center gap-1.5">
								{metadados.plataforma ? <MetadataPill label={metadados.plataforma} /> : null}
								{metadados.versaoApp ? <MetadataPill label={`v${metadados.versaoApp}`} /> : null}
								{metadados.fabricante || metadados.modelo ? (
									<MetadataPill label={[metadados.fabricante, metadados.modelo].filter(Boolean).join(" ")} />
								) : null}
							</div>
						) : null}
					</ResponsiveMenuSection>

					<ResponsiveMenuSection
						title="CREDENCIAIS"
						icon={<KeyRound className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />}
						action={
							!readOnly ? (
								<Button
									variant="outline"
									size="sm"
									className="flex items-center gap-2"
									disabled={isRotating}
									onClick={() => mutateRotate({ principalId })}
								>
									<RefreshCw className={cn("h-3.5 w-3.5 min-h-3.5 min-w-3.5", isRotating && "animate-spin")} />
									ROTACIONAR
								</Button>
							) : null
						}
					>
						{rotatedToken ? (
							<div className="flex w-full flex-col gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3">
								<span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Nova credencial</span>
								<span className="select-all break-all text-sm font-semibold text-primary">{rotatedToken}</span>
								<div className="flex items-center justify-between gap-2">
									<p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
										<TriangleAlert className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
										Exibida uma única vez. Informe-a no dispositivo agora.
									</p>
									<Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => copyToClipboard(rotatedToken)}>
										<Copy className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
										COPIAR
									</Button>
								</div>
							</div>
						) : null}
						{principal.credenciais.length === 0 ? (
							<p className="text-sm text-muted-foreground">Nenhuma credencial registrada.</p>
						) : (
							principal.credenciais.map((credential) => {
								const isExpired = !!credential.expiraEm && dayjs(credential.expiraEm).isBefore(dayjs());
								const credentialStatus = credential.dataRevogacao ? "REVOGADA" : isExpired ? "EXPIRADA" : "ATIVA";
								return (
									<div key={credential.id} className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
										<div className="flex flex-col gap-0.5">
											<span className="text-sm font-semibold tabular-nums">{credential.prefixoExibicao}…</span>
											<span className="text-xs text-muted-foreground">
												Criada em {formatDateAsLocale(credential.dataInsercao)} · Último uso:{" "}
												{credential.ultimoUso ? formatDateAsLocale(credential.ultimoUso, true) : "nunca"}
												{credential.expiraEm && credentialStatus === "ATIVA"
													? ` · Expira em ${formatDateAsLocale(credential.expiraEm, true)}`
													: ""}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<span
												className={cn(
													"rounded-full border px-2 py-1 text-[0.6rem] font-bold tracking-widest",
													credentialStatus === "ATIVA"
														? "bg-green-100 text-green-800 border-green-200"
														: credentialStatus === "EXPIRADA"
															? "bg-yellow-100 text-yellow-800 border-yellow-200"
															: "bg-red-100 text-red-800 border-red-200",
												)}
											>
												{credentialStatus}
											</span>
											{!readOnly && credentialStatus === "ATIVA" ? (
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive hover:bg-destructive/10 hover:text-destructive"
													disabled={isRevokingCredential}
													onClick={() => mutateRevokeCredential({ credencialId: credential.id })}
												>
													REVOGAR
												</Button>
											) : null}
										</div>
									</div>
								);
							})
						)}
					</ResponsiveMenuSection>

					<ResponsiveMenuSection title="PERMISSÕES" icon={<ShieldCheck className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />}>
						{manageableScopes.length === 0 ? (
							<p className="text-sm text-muted-foreground">Nenhuma permissão disponível para este tipo de dispositivo.</p>
						) : (
							<div className="flex w-full flex-col gap-1.5">
								{manageableScopes.map((scope) => {
									const isActive = activeScopeSet.has(scope);
									return (
										<div key={scope} className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card p-2.5">
											<span
												className={cn(
													"rounded-full border px-2.5 py-1 text-[0.65rem] font-bold",
													isActive ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground",
												)}
											>
												{scope}
											</span>
											{!readOnly ? (
												<Button
													variant="ghost"
													size="sm"
													disabled={isUpdatingGrant}
													className={cn(
														isActive
															? "text-destructive hover:bg-destructive/10 hover:text-destructive"
															: "text-primary hover:bg-primary/10 hover:text-primary",
													)}
													onClick={() =>
														mutateGrant({ principalId, scope: scope as TAccessScopeEnum, acao: isActive ? "REVOGAR" : "CONCEDER" })
													}
												>
													{isActive ? "REVOGAR" : "CONCEDER"}
												</Button>
											) : null}
										</div>
									);
								})}
							</div>
						)}
					</ResponsiveMenuSection>

					{principal.tipo === "AGENTE_DESKTOP" ? (
						<ResponsiveMenuSection title="IMPRESSORAS" icon={<Printer className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />}>
							{principalPrinters.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhuma impressora sincronizada ainda. O agente reporta as impressoras da máquina automaticamente após a ativação.
								</p>
							) : (
								<div className="flex w-full flex-col gap-1.5">
									{principalPrinters.map((printer) => (
										<AgentPrinterRow key={printer.id} printer={printer} readOnly={readOnly} onChanged={refetchPrinters} />
									))}
								</div>
							)}
						</ResponsiveMenuSection>
					) : null}

					{isRevoked ? (
						<p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
							<TriangleAlert className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
							Dispositivo revogado em {formatDateAsLocale(principal.dataRevogacao, true)}. Para voltar a usá-lo, ative-o novamente com um novo
							código.
						</p>
					) : null}
				</div>
			) : null}
		</ResponsiveMenu>
	);
}

function MetadataPill({ label }: { label: string }) {
	return <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">{label}</span>;
}

// Finalidades roteáveis (TESTE fica de fora: sempre carrega impressoraId fixado).
const PRINTER_FINALIDADE_OPTIONS: Array<{ value: TPrintJobFinalidadeEnum; label: string }> = [
	{ value: "CUPOM_VENDA", label: "CUPONS" },
	{ value: "ETIQUETA_LOTE", label: "ETIQUETAS" },
	{ value: "DANFE_NFCE", label: "NFC-e" },
	{ value: "DANFE_NFE", label: "NF-e" },
];

type AgentPrinterRowProps = {
	printer: TAgentPrinterListItem;
	readOnly: boolean;
	onChanged: () => Promise<unknown>;
};
function AgentPrinterRow({ printer, readOnly, onChanged }: AgentPrinterRowProps) {
	const [apelido, setApelido] = useState(printer.apelido ?? "");
	const apelidoChanged = (printer.apelido ?? "") !== apelido.trim();

	const { mutate: mutatePrinter, isPending: isUpdatingPrinter } = useMutation({
		mutationKey: ["update-agent-printer", printer.id],
		mutationFn: updateAgentPrinter,
		onSuccess: async (data) => {
			toast.success(data.message);
			await onChanged();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const { mutate: mutateTestPrint, isPending: isTesting } = useMutation({
		mutationKey: ["test-agent-printer", printer.id],
		mutationFn: createManualPrintJob,
		onSuccess: (data) => toast.success(data.message),
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const toggleFinalidade = (finalidade: TPrintJobFinalidadeEnum) => {
		const current = printer.finalidades as TPrintJobFinalidadeEnum[];
		const next = current.includes(finalidade) ? current.filter((item) => item !== finalidade) : [...current, finalidade];
		mutatePrinter({ id: printer.id, finalidades: next });
	};

	return (
		<div className={cn("flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-3", !printer.ativa && "opacity-70")}>
			<div className="flex w-full items-center justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-sm font-semibold">{printer.apelido || printer.nomeSistema}</span>
					<span className="truncate text-xs text-muted-foreground">
						{printer.nomeSistema} · {printer.driver === "ZPL_REDE" ? "Térmica de rede (ZPL)" : "Driver do sistema"} · Sync:{" "}
						{printer.ultimaSincronizacao ? formatDateAsLocale(printer.ultimaSincronizacao, true) : "nunca"}
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<span
						className={cn(
							"rounded-full border px-2 py-1 text-[0.6rem] font-bold tracking-widest",
							printer.disponivel ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200",
						)}
					>
						{printer.disponivel ? "DISPONÍVEL" : "AUSENTE"}
					</span>
					<Button
						variant="outline"
						size="sm"
						className="flex items-center gap-1.5"
						disabled={isTesting || !printer.ativa || !printer.disponivel}
						onClick={() => mutateTestPrint({ finalidade: "TESTE", impressoraId: printer.id })}
					>
						<Printer className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
						TESTAR
					</Button>
				</div>
			</div>
			{!readOnly ? (
				<>
					<div className="flex w-full items-end gap-2">
						<div className="grow">
							<TextInput label="APELIDO" value={apelido} placeholder={printer.nomeSistema} handleChange={(value) => setApelido(value)} />
						</div>
						{apelidoChanged ? (
							<Button
								variant="outline"
								size="sm"
								disabled={isUpdatingPrinter}
								onClick={() => mutatePrinter({ id: printer.id, apelido: apelido.trim() || null })}
							>
								SALVAR
							</Button>
						) : null}
					</div>
					<div className="flex w-full flex-wrap items-center justify-between gap-2">
						<div className="flex flex-wrap items-center gap-1.5">
							{PRINTER_FINALIDADE_OPTIONS.map((option) => {
								const isAssigned = printer.finalidades.includes(option.value);
								return (
									<button
										key={option.value}
										type="button"
										aria-pressed={isAssigned}
										disabled={isUpdatingPrinter}
										onClick={() => toggleFinalidade(option.value)}
										className={cn(
											"rounded-full border px-2.5 py-1 text-[0.65rem] font-bold transition-colors",
											isAssigned
												? "border-primary/20 bg-primary/10 text-primary"
												: "border-border bg-muted text-muted-foreground hover:bg-accent",
										)}
									>
										{option.label}
									</button>
								);
							})}
						</div>
						<Button
							variant="ghost"
							size="sm"
							disabled={isUpdatingPrinter}
							className={cn(printer.ativa ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : "text-primary")}
							onClick={() => mutatePrinter({ id: printer.id, ativa: !printer.ativa })}
						>
							{printer.ativa ? "DESATIVAR" : "ATIVAR"}
						</Button>
					</div>
				</>
			) : null}
		</div>
	);
}

export default ControlAccessPrincipal;
