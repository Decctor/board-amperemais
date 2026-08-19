import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { revokeAccessCredential, rotateAccessCredential } from "@/lib/mutations/access";
import type { TAccessPrincipalById } from "@/lib/queries/access";
import { cn, copyToClipboard } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Copy, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusPill, type TStatusTone } from "../AccessStatusBadge";

type TCredential = TAccessPrincipalById["credenciais"][number];

type DeviceCredentialsBlockProps = {
	principalId: string;
	credenciais: TCredential[];
	readOnly: boolean;
	onChanged: () => Promise<unknown>;
};

export function DeviceCredentialsBlock({ principalId, credenciais, readOnly, onChanged }: DeviceCredentialsBlockProps) {
	// Token exibido uma única vez após a rotação — nunca persiste além desta sessão do modal.
	const [rotatedToken, setRotatedToken] = useState<string | null>(null);

	const { mutate: mutateRotate, isPending: isRotating } = useMutation({
		mutationKey: ["rotate-access-credential", principalId],
		mutationFn: rotateAccessCredential,
		onSuccess: async (data) => {
			toast.success(data.message);
			setRotatedToken(data.data.token);
			await onChanged();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const { mutate: mutateRevoke, isPending: isRevoking, variables: revokingVariables } = useMutation({
		mutationKey: ["revoke-access-credential", principalId],
		mutationFn: revokeAccessCredential,
		onSuccess: async (data) => {
			toast.success(data.message);
			await onChanged();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full flex-wrap items-start justify-between gap-3">
				<p className="max-w-[46ch] text-xs text-muted-foreground">
					A credencial é a senha que o aparelho usa para falar com o sistema. Rotacione se suspeitar que ela vazou.
				</p>
				{!readOnly ? (
					<Button variant="outline" size="sm" className="flex shrink-0 items-center gap-2" disabled={isRotating} onClick={() => mutateRotate({ principalId })}>
						<RefreshCw className={cn("h-3.5 w-3.5 min-h-3.5 min-w-3.5", isRotating && "animate-spin")} />
						ROTACIONAR
					</Button>
				) : null}
			</div>

			{rotatedToken ? (
				<div className="flex w-full flex-col gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
					<span className="text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground">NOVA CREDENCIAL</span>
					<span className="select-all break-all text-sm font-bold text-primary">{rotatedToken}</span>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
							<TriangleAlert className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
							Aparece uma vez só. Informe no aparelho agora.
						</p>
						<Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => copyToClipboard(rotatedToken)}>
							<Copy className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
							COPIAR
						</Button>
					</div>
				</div>
			) : null}

			{credenciais.length === 0 ? (
				<p className="text-sm text-muted-foreground">Nenhuma credencial registrada.</p>
			) : (
				<div className="flex w-full flex-col gap-2">
					{credenciais.map((credential) => (
						<CredentialRow
							key={credential.id}
							credential={credential}
							readOnly={readOnly}
							isRevoking={isRevoking && revokingVariables?.credencialId === credential.id}
							onRevoke={() => mutateRevoke({ credencialId: credential.id })}
						/>
					))}
				</div>
			)}
		</div>
	);
}

const CREDENTIAL_STATUS_TONES: Record<string, TStatusTone> = { ATIVA: "success", EXPIRADA: "warning", REVOGADA: "danger" };

type CredentialRowProps = {
	credential: TCredential;
	readOnly: boolean;
	isRevoking: boolean;
	onRevoke: () => void;
};
function CredentialRow({ credential, readOnly, isRevoking, onRevoke }: CredentialRowProps) {
	const isExpired = !!credential.expiraEm && dayjs(credential.expiraEm).isBefore(dayjs());
	const status = credential.dataRevogacao ? "REVOGADA" : isExpired ? "EXPIRADA" : "ATIVA";
	const isActive = status === "ATIVA";

	return (
		<div className={cn("flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3", !isActive && "opacity-70")}>
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-sm font-bold tabular-nums">{credential.prefixoExibicao}…</span>
				<span className="text-xs text-muted-foreground">
					Criada em {formatDateAsLocale(credential.dataInsercao)} · Último uso: {credential.ultimoUso ? formatDateAsLocale(credential.ultimoUso, true) : "nunca"}
					{credential.expiraEm && isActive ? ` · Expira em ${formatDateAsLocale(credential.expiraEm, true)}` : ""}
				</span>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<StatusPill tone={CREDENTIAL_STATUS_TONES[status] ?? "neutral"}>{status}</StatusPill>
				{!readOnly && isActive ? (
					<Button
						variant="ghost"
						size="sm"
						className="text-destructive hover:bg-destructive/10 hover:text-destructive"
						disabled={isRevoking}
						onClick={onRevoke}
					>
						REVOGAR
					</Button>
				) : null}
			</div>
		</div>
	);
}

export default DeviceCredentialsBlock;
