import TextInput from "@/components/Inputs/TextInput";
import SelectInput from "@/components/Inputs/SelectInput";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { updateAccessPrincipal } from "@/lib/mutations/access";
import type { TAccessPrincipalById } from "@/lib/queries/access";
import { useMutation } from "@tanstack/react-query";
import { AppWindow, Check, KeyRound, Monitor, TabletSmartphone, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useUsers } from "@/lib/queries/users";
import { toast } from "sonner";
import AccessStatusBadge from "../AccessStatusBadge";

const CLIENT_CATEGORY_ICONS: Record<string, typeof TabletSmartphone> = {
	NATIVO_MOBILE: TabletSmartphone,
	NATIVO_WEB_KIOSK: AppWindow,
	NATIVO_DESKTOP: Monitor,
};

type TDeviceMetadata = { plataforma?: string; versaoApp?: string; modelo?: string; fabricante?: string };

type DeviceIdentityBlockProps = {
	principal: TAccessPrincipalById;
	readOnly: boolean;
	onChanged: () => Promise<unknown>;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export function DeviceIdentityBlock({ principal, readOnly, onChanged, callbacks }: DeviceIdentityBlockProps) {
	const [nome, setNome] = useState(principal.nome);
	const [revokeArmed, setRevokeArmed] = useState(false);
	const { data: organizationUsers } = useUsers({ initialFilters: {}, enabled: principal.tipo === "CONTA_SERVICO" && !readOnly });

	// O nome pode mudar por baixo (outra aba, outro operador): o campo segue a fonte da verdade.
	useEffect(() => setNome(principal.nome), [principal.nome]);

	const nameChanged = nome.trim().length > 0 && nome.trim() !== principal.nome;
	const metadados = (principal.metadados ?? {}) as TDeviceMetadata;
	const isRevoked = !!principal.dataRevogacao;
	const Icon = CLIENT_CATEGORY_ICONS[principal.cliente.categoria] ?? KeyRound;
	const isAiConnection = principal.tipo === "CONTA_SERVICO";

	const { mutate: mutateRename, isPending: isRenaming } = useMutation({
		mutationKey: ["update-access-principal", principal.id],
		mutationFn: updateAccessPrincipal,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: async (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			await onChanged();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const { mutate: mutateRevoke, isPending: isRevoking } = useMutation({
		mutationKey: ["revoke-access-principal", principal.id],
		mutationFn: updateAccessPrincipal,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: async (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			setRevokeArmed(false);
			await onChanged();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<div className="flex w-full flex-col gap-5">
			<div className="flex items-start gap-3">
				<div className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
					<Icon className="h-5 w-5" />
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="text-base font-bold tracking-tight">{principal.nome}</h3>
						<AccessStatusBadge status={principal.status} />
					</div>
					<span className="text-xs text-muted-foreground">{principal.cliente.nome}</span>
				</div>
			</div>

			{!readOnly ? (
				<div className="flex w-full items-end gap-2">
					<div className="grow">
						<TextInput label="NOME DO DISPOSITIVO" value={nome} placeholder="Ex: Tablet do balcão principal" handleChange={setNome} />
					</div>
					{nameChanged ? (
						<Button
							size="sm"
							className="flex shrink-0 items-center gap-1.5"
							disabled={isRenaming}
							onClick={() => mutateRename({ id: principal.id, nome: nome.trim() })}
						>
							<Check className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
							SALVAR
						</Button>
					) : null}
				</div>
			) : null}

			{isAiConnection ? (
				<div className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-4">
					<SelectInput
						label="USUÁRIO RESPONSÁVEL"
						value={principal.responsavelUsuarioId}
						editable={!readOnly && !isRenaming}
						options={(organizationUsers ?? []).map((user) => ({ id: user.id, value: user.id, label: user.nome }))}
						resetOptionLabel="Sem usuário responsável"
						handleChange={(responsavelUsuarioId) => mutateRename({ id: principal.id, responsavelUsuarioId })}
						onReset={() => mutateRename({ id: principal.id, responsavelUsuarioId: null })}
					/>
					<p className="text-xs text-muted-foreground">
						As mutações feitas por esta conexão usam esse usuário nos campos de autoria. A auditoria continua registrando a conexão MCP real.
					</p>
				</div>
			) : null}

			<dl className="grid grid-cols-2 gap-x-4 gap-y-3">
				<DeviceFact label="ATIVADO EM" value={formatDateAsLocale(principal.dataInsercao, true)} />
				<DeviceFact label="ÚLTIMO CONTATO" value={principal.ultimoAcesso ? formatDateAsLocale(principal.ultimoAcesso, true) : "Nunca"} />
				<DeviceFact label="PLATAFORMA" value={metadados.plataforma} />
				<DeviceFact label="VERSÃO DO APP" value={metadados.versaoApp ? `v${metadados.versaoApp}` : null} />
				<DeviceFact label="APARELHO" value={[metadados.fabricante, metadados.modelo].filter(Boolean).join(" ")} />
			</dl>

			{isRevoked ? (
				<div className="flex w-full items-start gap-2 rounded-2xl border border-border bg-muted/50 p-4">
					<TriangleAlert className="mt-0.5 h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
					<p className="text-xs text-muted-foreground">
						Revogado em {formatDateAsLocale(principal.dataRevogacao, true)}. Para voltar a usar este aparelho, ative-o de novo com um código novo.
					</p>
				</div>
			) : null}

			{!readOnly ? (
				<div className="flex w-full flex-col gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
					<div className="flex flex-col gap-1">
						<h4 className="text-sm font-bold tracking-tight text-destructive">Revogar dispositivo</h4>
						<p className="text-xs text-muted-foreground">
							As credenciais são invalidadas na hora e o aparelho para de operar. Para voltar a usá-lo, será preciso ativá-lo de novo com um código novo.
						</p>
					</div>
					{revokeArmed ? (
						<div className="flex flex-wrap items-center gap-2">
							<Button variant="destructive" size="sm" disabled={isRevoking} onClick={() => mutateRevoke({ id: principal.id, status: "REVOGADO" })}>
								SIM, REVOGAR AGORA
							</Button>
							<Button variant="ghost" size="sm" disabled={isRevoking} onClick={() => setRevokeArmed(false)}>
								CANCELAR
							</Button>
						</div>
					) : (
						<Button
							variant="outline"
							size="sm"
							className="w-fit border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
							onClick={() => setRevokeArmed(true)}
						>
							REVOGAR DISPOSITIVO
						</Button>
					)}
				</div>
			) : null}
		</div>
	);
}

function DeviceFact({ label, value }: { label: string; value?: string | null }) {
	if (!value) return null;
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<dt className="text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground">{label}</dt>
			<dd className="truncate text-xs font-semibold">{value}</dd>
		</div>
	);
}

export default DeviceIdentityBlock;
