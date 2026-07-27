"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { publishAgentVersion } from "@/lib/mutations/desktop-agent";
import { useAgentVersions } from "@/lib/queries/desktop-agent";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, MonitorDown } from "lucide-react";
import { toast } from "sonner";

// Promoção de versões do agente desktop.
//
// Não há upload aqui de propósito. Quem sobe o binário é o CI do repo
// recompra-local-agent, que já tem o artefato e o SHA256 na mão; um campo de
// arquivo nesta tela reintroduziria justamente o que o CI elimina — subir o
// arquivo errado, a versão errada ou um build de debug. O que sobra para o
// humano é a decisão que só ele pode tomar: QUANDO uma versão vai ao ar.
export default function DesktopAgentVersionsPage() {
	const queryClient = useQueryClient();
	const { data: versions, queryKey, isLoading, isError, isSuccess, error } = useAgentVersions();

	const { mutate: publish, isPending } = useMutation({
		mutationKey: ["publish-agent-version"],
		mutationFn: publishAgentVersion,
		onMutate: async () => await queryClient.cancelQueries({ queryKey }),
		onSuccess: (data) => toast.success(data.message),
		onError: (e) => toast.error(getErrorMessage(e)),
		onSettled: async () => await queryClient.invalidateQueries({ queryKey }),
	});

	return (
		<div className="flex w-full flex-col gap-4 p-4 pb-28 md:p-6 md:pb-28">
			<div className="flex flex-col gap-1">
				<h1 className="text-lg font-black tracking-tight md:text-xl">AGENTE DESKTOP</h1>
				<p className="text-sm text-muted-foreground">
					Versões enviadas pelo CI. Publicar torna a versão o download oferecido em Configurações, DISPOSITIVOS, para todas as
					organizações — apenas uma fica publicada por vez.
				</p>
			</div>

			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}

			{isSuccess && versions.length === 0 ? (
				<div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-12 text-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<MonitorDown className="h-6 w-6" />
					</div>
					<div className="flex flex-col gap-1">
						<h2 className="text-base font-bold tracking-tight">Nenhuma versão enviada</h2>
						<p className="max-w-md text-sm text-muted-foreground">
							Versões aparecem aqui automaticamente quando o workflow de release do repositório recompra-local-agent roda numa tag.
						</p>
					</div>
				</div>
			) : null}

			{isSuccess && versions.length > 0 ? (
				<div className="flex w-full flex-col gap-2">
					{versions.map((version) => (
						<div
							key={version.id}
							className={cn(
								"flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between",
								version.publicada ? "border-primary/40 bg-primary/5" : "border-border",
							)}
						>
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-2">
									<h3 className="text-sm font-bold tracking-tight">Versão {version.versao}</h3>
									{version.publicada ? (
										<span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.6rem] font-bold text-primary">
											<CheckCircle2 className="h-3 w-3" />
											PUBLICADA
										</span>
									) : null}
								</div>
								<p className="text-xs text-muted-foreground">
									{(version.tamanhoBytes / 1024 / 1024).toFixed(1)} MB · enviada em {formatDateAsLocale(version.dataInsercao)}
									{version.publicada && version.dataPublicacao ? ` · publicada em ${formatDateAsLocale(version.dataPublicacao)}` : null}
									{version.publicadaPor ? ` por ${version.publicadaPor.nome}` : null}
								</p>
								{/* O mesmo hash anexado à Release do GitHub: é o que torna verificável
								    que o arquivo aqui e o arquivo arquivado lá são o mesmo binário. */}
								<p className="break-all font-mono text-[0.6rem] text-muted-foreground">sha256 {version.sha256}</p>
								{version.notas ? <p className="text-xs text-muted-foreground">{version.notas}</p> : null}
							</div>

							<div className="flex items-center gap-2">
								<Button asChild size="sm" variant="ghost" className="flex items-center gap-2 whitespace-nowrap">
									<a href={version.downloadUrl} download>
										<Download className="h-4 w-4 min-h-4 min-w-4" />
										BAIXAR
									</a>
								</Button>
								{!version.publicada ? (
									<Button
										size="sm"
										disabled={isPending}
										className="whitespace-nowrap"
										onClick={() => publish({ id: version.id })}
									>
										PUBLICAR
									</Button>
								) : null}
							</div>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}
