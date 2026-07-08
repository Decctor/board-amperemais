"use client";

import type { TGetAudiencesOutputDefault } from "@/app/api/audiences/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { connectAudienceDestination, deleteAudience, disconnectAudienceDestination, syncAudienceDestination } from "@/lib/mutations/audiences";
import { useAudiences } from "@/lib/queries/audiences";
import { useIntegrations } from "@/lib/queries/integrations";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Pencil, Plus, RefreshCw, Trash2, Unlink, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AudienceFormModal } from "./_components/AudienceFormModal";

type AudiencesPageProps = { user: TAuthUserSession["user"] };
type TAudience = TGetAudiencesOutputDefault[number];

export default function AudiencesPage({ user: _user }: AudiencesPageProps) {
	const queryClient = useQueryClient();
	const { data: audiences, isLoading, isError, error, queryKey } = useAudiences();
	const { data: metaAccounts } = useIntegrations({ tipo: "META_ADS" });

	const [modalOpen, setModalOpen] = useState<boolean>(false);
	const [editing, setEditing] = useState<TAudience | null>(null);

	const invalidate = () => queryClient.invalidateQueries({ queryKey });

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	const list = audiences ?? [];
	const accounts = metaAccounts ?? [];

	return (
		<div className="flex w-full flex-col gap-4 p-2 lg:p-4">
			<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
						<Users className="h-5 w-5 text-primary" /> Públicos
					</h1>
					<p className="text-sm text-muted-foreground">Transforme suas segmentações em públicos (Custom Audiences) na Meta.</p>
				</div>
				<Button
					onClick={() => {
						setEditing(null);
						setModalOpen(true);
					}}
				>
					<Plus className="h-4 w-4" /> Novo público
				</Button>
			</div>

			{list.length === 0 ? (
				<div className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
					<Users className="h-8 w-8 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Nenhum público ainda. Crie o primeiro a partir das suas segmentações RFM.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
					{list.map((audience) => (
						<AudienceCard
							key={audience.id}
							audience={audience}
							accounts={accounts}
							onEdit={() => {
								setEditing(audience);
								setModalOpen(true);
							}}
							onChanged={invalidate}
						/>
					))}
				</div>
			)}

			{modalOpen ? <AudienceFormModal audience={editing ?? undefined} closeModal={() => setModalOpen(false)} onSaved={invalidate} /> : null}
		</div>
	);
}

const STATUS_CHIP_VARIANT: Record<string, "success" | "muted" | "destructive"> = {
	SINCRONIZADO: "success",
	PENDENTE: "muted",
	ERRO: "destructive",
};

function AudienceCard({
	audience,
	accounts,
	onEdit,
	onChanged,
}: {
	audience: TAudience;
	accounts: NonNullable<ReturnType<typeof useIntegrations>["data"]>;
	onEdit: () => void;
	onChanged: () => void;
}) {
	const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
	const connectedIntegrationIds = new Set(audience.destinos.map((destino) => destino.integracaoId));
	const availableAccounts = accounts.filter((account) => !connectedIntegrationIds.has(account.id));

	const accountName = (integracaoId: string) => {
		const account = accounts.find((item) => item.id === integracaoId);
		return account?.apelido ?? (account?.configuracao?.tipo === "META_ADS" ? account.configuracao.adAccountName : "Conta Meta");
	};

	const settle = {
		onSuccess: (data: { message: string }) => toast.success(data.message),
		onError: (err: Error) => toast.error(getErrorMessage(err)),
		onSettled: onChanged,
	};
	const connectMutation = useMutation({ mutationFn: connectAudienceDestination, ...settle });
	const syncMutation = useMutation({ mutationFn: syncAudienceDestination, ...settle });
	const disconnectMutation = useMutation({ mutationFn: disconnectAudienceDestination, ...settle });
	const deleteMutation = useMutation({ mutationFn: deleteAudience, ...settle });

	const busy = connectMutation.isPending || syncMutation.isPending || disconnectMutation.isPending || deleteMutation.isPending;

	return (
		<div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col">
					<h2 className="truncate text-base font-bold text-foreground">{audience.nome}</h2>
					{audience.descricao ? <p className="truncate text-xs text-muted-foreground">{audience.descricao}</p> : null}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button variant="ghost" size="icon" onClick={onEdit} disabled={busy} title="Editar">
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							if (confirm(`Remover o público "${audience.nome}"?`)) deleteMutation.mutate({ id: audience.id });
						}}
						disabled={busy}
						title="Remover"
					>
						<Trash2 className="h-4 w-4 text-destructive" />
					</Button>
				</div>
			</div>

			{audience.segmentacoes.length > 0 ? (
				<div className="flex flex-wrap gap-1">
					{audience.segmentacoes.map((segment) => (
						<Chip.Root key={segment} variant="muted" size="xs" shape="pill">
							<Chip.Label caps weight="bold">
								{segment}
							</Chip.Label>
						</Chip.Root>
					))}
				</div>
			) : null}

			<div className="flex flex-col border-t border-border">
				{audience.destinos.map((destino) => (
					<div key={destino.id} className="flex flex-col gap-1 border-b border-border py-2.5 last:border-b-0">
						<div className="flex items-center justify-between gap-2">
							<span className="truncate text-xs font-bold text-foreground">{accountName(destino.integracaoId)}</span>
							<Chip.Root variant={STATUS_CHIP_VARIANT[destino.status] ?? "muted"} size="xs" shape="pill">
								<Chip.Label caps weight="bold">
									{destino.status}
								</Chip.Label>
							</Chip.Root>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-[0.65rem] tabular-nums text-muted-foreground">
								{new Intl.NumberFormat("pt-BR").format(destino.qtdeEnviada)} enviados
								{destino.ultimaSincronizacao ? ` · ${formatDateAsLocale(destino.ultimaSincronizacao)}` : ""}
							</span>
							<div className="flex items-center gap-1">
								<Button variant="ghost" size="icon" onClick={() => syncMutation.mutate({ id: destino.id })} disabled={busy} title="Sincronizar">
									<RefreshCw className={cn("h-3.5 w-3.5", syncMutation.isPending && "animate-spin")} />
								</Button>
								<Button variant="ghost" size="icon" onClick={() => disconnectMutation.mutate({ id: destino.id })} disabled={busy} title="Desconectar">
									<Unlink className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
						{destino.ultimoErro ? <span className="text-[0.6rem] italic text-destructive">{destino.ultimoErro}</span> : null}
					</div>
				))}

				{availableAccounts.length > 0 ? (
					<div className="flex items-center gap-2 pt-2.5">
						<Select value={selectedAccountId ?? undefined} onValueChange={setSelectedAccountId}>
							<SelectTrigger className="h-8 flex-1 text-xs">
								<SelectValue placeholder="Conectar ao Meta Ads..." />
							</SelectTrigger>
							<SelectContent>
								{availableAccounts.map((account) => (
									<SelectItem key={account.id} value={account.id}>
										{account.apelido ?? (account.configuracao?.tipo === "META_ADS" ? account.configuracao.adAccountName : account.id)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							size="sm"
							variant="outline"
							disabled={!selectedAccountId || busy}
							onClick={() => {
								if (selectedAccountId) connectMutation.mutate({ audienciaId: audience.id, integracaoId: selectedAccountId });
							}}
						>
							<Link2 className="h-3.5 w-3.5" /> Conectar
						</Button>
					</div>
				) : accounts.length === 0 ? (
					<span className="pt-2.5 text-[0.65rem] italic text-muted-foreground">Conecte uma conta do Meta Ads para publicar este público.</span>
				) : null}
			</div>
		</div>
	);
}
