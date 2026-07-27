import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { type TAccessPrincipalListItem, useAccessPrincipals } from "@/lib/queries/access";
import { type TPrintJobListItem, useAgentPrintJobs } from "@/lib/queries/desktop-agent";
import { cn } from "@/lib/utils";
import type { TPrintJobStatusEnum } from "@/schemas/enums";
import { useQueryClient } from "@tanstack/react-query";
import { AppWindow, KeyRound, Monitor, Pencil, Plus, Printer, RefreshCw, TabletSmartphone } from "lucide-react";
import { useState } from "react";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import AccessStatusBadge from "../Modals/Internal/Access/AccessStatusBadge";
import ControlAccessPrincipal from "../Modals/Internal/Access/ControlAccessPrincipal";
import NewAccessEnrollment from "../Modals/Internal/Access/NewAccessEnrollment";
import { Button } from "../ui/button";
import DesktopAgentDownload from "./DesktopAgentDownload";

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
					Tablets, kiosks e agentes desktop vinculados à sua organização — Ponto de Interação e periféricos como impressoras.
				</p>
				{canManage ? (
					<Button size="sm" className="flex items-center gap-2 whitespace-nowrap" onClick={() => setNewEnrollmentModalIsOpen(true)}>
						<Plus className="h-4 w-4 min-h-4 min-w-4" />
						ATIVAR DISPOSITIVO
					</Button>
				) : null}
			</div>

			<DesktopAgentDownload />

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

			{/* Fila de impressão: só faz sentido quando há um agente desktop vinculado. */}
			{isSuccess && principals.some((principal) => principal.tipo === "AGENTE_DESKTOP") ? <PrintJobsPanel /> : null}

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
	NATIVO_DESKTOP: Monitor,
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

const PRINT_JOB_STATUS_META: Record<TPrintJobStatusEnum, { label: string; className: string }> = {
	PENDENTE: { label: "PENDENTE", className: "border-border bg-muted text-muted-foreground" },
	PROCESSANDO: { label: "PROCESSANDO", className: "border-blue-200 bg-blue-100 text-blue-800" },
	IMPRESSO: { label: "IMPRESSO", className: "border-green-200 bg-green-100 text-green-800" },
	ERRO: { label: "ERRO", className: "border-red-200 bg-red-100 text-red-800" },
	CANCELADO: { label: "CANCELADO", className: "border-border bg-muted text-muted-foreground" },
	EXPIRADO: { label: "EXPIRADO", className: "border-yellow-200 bg-yellow-100 text-yellow-800" },
};

const PRINT_JOB_FINALIDADE_LABELS: Record<string, string> = {
	CUPOM_VENDA: "CUPOM DE VENDA",
	ETIQUETA_LOTE: "ETIQUETA DE LOTE",
	DANFE_NFCE: "DANFE NFC-e",
	DANFE_NFE: "DANFE NF-e",
	TESTE: "TESTE",
};

const PRINT_JOB_STATUS_FILTERS: Array<{ value: TPrintJobStatusEnum | null; label: string }> = [
	{ value: null, label: "TODOS" },
	{ value: "PENDENTE", label: "PENDENTES" },
	{ value: "IMPRESSO", label: "IMPRESSOS" },
	{ value: "ERRO", label: "COM ERRO" },
];

// Troubleshooting da fila de impressão do agente desktop: últimos jobs, status e erros.
function PrintJobsPanel() {
	const [statusFilter, setStatusFilter] = useState<TPrintJobStatusEnum | null>(null);
	const { data: jobs, isLoading, isError, error, refetch, isRefetching } = useAgentPrintJobs({ status: statusFilter });

	return (
		<div className="mt-2 flex w-full flex-col gap-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Printer className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
					<h2 className="text-sm font-bold tracking-tight">FILA DE IMPRESSÃO</h2>
				</div>
				<div className="flex items-center gap-1.5">
					{PRINT_JOB_STATUS_FILTERS.map((filter) => (
						<button
							key={filter.label}
							type="button"
							aria-pressed={statusFilter === filter.value}
							onClick={() => setStatusFilter(filter.value)}
							className={cn(
								"rounded-full border px-2.5 py-1 text-[0.65rem] font-bold transition-colors",
								statusFilter === filter.value
									? "border-primary/20 bg-primary/10 text-primary"
									: "border-border bg-muted text-muted-foreground hover:bg-accent",
							)}
						>
							{filter.label}
						</button>
					))}
					<Button variant="ghost" size="icon" aria-label="Atualizar fila de impressão" disabled={isRefetching} onClick={() => refetch()}>
						<RefreshCw className={cn("h-3.5 w-3.5 min-h-3.5 min-w-3.5", isRefetching && "animate-spin")} />
					</Button>
				</div>
			</div>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{jobs && jobs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum job de impressão registrado.</p> : null}
			{jobs && jobs.length > 0 ? (
				<div className="flex w-full flex-col gap-1.5">
					{jobs.map((job) => (
						<PrintJobRow key={job.id} job={job} />
					))}
				</div>
			) : null}
		</div>
	);
}

function PrintJobRow({ job }: { job: TPrintJobListItem }) {
	const statusMeta = PRINT_JOB_STATUS_META[job.status];
	return (
		<div className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold">{PRINT_JOB_FINALIDADE_LABELS[job.finalidade] ?? job.finalidade}</span>
					<span className={cn("rounded-full border px-2 py-0.5 text-[0.6rem] font-bold tracking-widest", statusMeta.className)}>
						{statusMeta.label}
					</span>
				</div>
				<span className="truncate text-xs text-muted-foreground">
					{formatDateAsLocale(job.dataInsercao, true)}
					{job.impressora ? ` · ${job.impressora.apelido || job.impressora.nomeSistema}` : ""}
					{job.principal ? ` · ${job.principal.nome}` : ""}
					{job.solicitadoPor ? ` · por ${job.solicitadoPor.nome}` : ""}
					{job.numeroTentativas > 1 ? ` · ${job.numeroTentativas} tentativas` : ""}
				</span>
				{job.erro ? <span className="truncate text-xs text-destructive">{job.erro}</span> : null}
			</div>
		</div>
	);
}
