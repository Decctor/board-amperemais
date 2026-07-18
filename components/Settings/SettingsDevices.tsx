import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { type TAccessPrincipalListItem, useAccessPrincipals } from "@/lib/queries/access";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { AppWindow, KeyRound, Pencil, Plus, TabletSmartphone } from "lucide-react";
import { useState } from "react";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import AccessStatusBadge from "../Modals/Internal/Access/AccessStatusBadge";
import ControlAccessPrincipal from "../Modals/Internal/Access/ControlAccessPrincipal";
import NewAccessEnrollment from "../Modals/Internal/Access/NewAccessEnrollment";
import { Button } from "../ui/button";

type SettingsDevicesProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function SettingsDevices({ user: _user, membership }: SettingsDevicesProps) {
	const queryClient = useQueryClient();
	const { data: principals, queryKey, isLoading, isError, isSuccess, error } = useAccessPrincipals();
	const [newEnrollmentModalIsOpen, setNewEnrollmentModalIsOpen] = useState(false);
	const [controlPrincipalId, setControlPrincipalId] = useState<string | null>(null);

	const canManage = membership.permissoes.empresa.editar;
	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm text-muted-foreground">
					Tablets e kiosks vinculados à sua organização para operar o Ponto de Interação.
				</p>
				{canManage ? (
					<Button size="sm" className="flex items-center gap-2 whitespace-nowrap" onClick={() => setNewEnrollmentModalIsOpen(true)}>
						<Plus className="h-4 w-4 min-h-4 min-w-4" />
						ATIVAR DISPOSITIVO
					</Button>
				) : null}
			</div>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && principals.length === 0 ? (
				<div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-12 text-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<TabletSmartphone className="h-6 w-6" />
					</div>
					<div className="flex flex-col gap-1">
						<h2 className="text-base font-bold tracking-tight">Nenhum dispositivo ativado</h2>
						<p className="max-w-md text-sm text-muted-foreground">
							Gere um código de ativação, digite-o no tablet ou kiosk e o dispositivo passa a operar o Ponto de Interação com credencial
							própria, que você pode revogar a qualquer momento.
						</p>
					</div>
					{canManage ? (
						<Button size="sm" className="flex items-center gap-2" onClick={() => setNewEnrollmentModalIsOpen(true)}>
							<Plus className="h-4 w-4 min-h-4 min-w-4" />
							ATIVAR PRIMEIRO DISPOSITIVO
						</Button>
					) : null}
				</div>
			) : null}
			{isSuccess && principals.length > 0 ? (
				<div className="flex w-full flex-col gap-1.5">
					{principals.map((principal) => (
						<DeviceCard key={principal.id} principal={principal} handleClick={setControlPrincipalId} />
					))}
				</div>
			) : null}

			{newEnrollmentModalIsOpen ? (
				<NewAccessEnrollment
					closeModal={() => setNewEnrollmentModalIsOpen(false)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
			{controlPrincipalId ? (
				<ControlAccessPrincipal
					principalId={controlPrincipalId}
					canManage={canManage}
					closeModal={() => setControlPrincipalId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

const CLIENT_CATEGORY_ICONS: Record<string, typeof TabletSmartphone> = {
	NATIVO_MOBILE: TabletSmartphone,
	NATIVO_WEB_KIOSK: AppWindow,
};

type DeviceCardProps = {
	principal: TAccessPrincipalListItem;
	handleClick: (id: string) => void;
};
function DeviceCard({ principal, handleClick }: DeviceCardProps) {
	const Icon = CLIENT_CATEGORY_ICONS[principal.cliente.categoria] ?? KeyRound;
	const activeCredentials = principal.credenciais.filter((credential) => !credential.dataRevogacao);
	const metadados = (principal.metadados ?? {}) as { versaoApp?: string; plataforma?: string };
	const isRevoked = principal.status === "REVOGADO";

	return (
		<div
			className={cn(
				"flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-4 shadow-2xs",
				isRevoked && "opacity-60",
			)}
		>
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Icon className="h-5 w-5" />
				</div>
				<div className="flex min-w-0 flex-col gap-0.5">
					<div className="flex items-center gap-2">
						<span className="truncate text-sm font-semibold">{principal.nome}</span>
						<AccessStatusBadge status={principal.status} />
					</div>
					<span className="truncate text-xs text-muted-foreground">
						{principal.cliente.nome}
						{metadados.versaoApp ? ` · v${metadados.versaoApp}` : ""}
						{` · Último contato: ${principal.ultimoAcesso ? formatDateAsLocale(principal.ultimoAcesso, true) : "nunca"}`}
					</span>
					{activeCredentials[0] ? (
						<span className="truncate text-xs text-muted-foreground tabular-nums">{activeCredentials[0].prefixoExibicao}…</span>
					) : null}
				</div>
			</div>
			<Button variant="ghost" size="icon" aria-label="Gerenciar dispositivo" onClick={() => handleClick(principal.id)}>
				<Pencil className="h-4 w-4 min-h-4 min-w-4" />
			</Button>
		</div>
	);
}
