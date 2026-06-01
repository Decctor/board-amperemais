"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { getShopAvailability } from "@/lib/shop/availability";
import { copyToClipboard } from "@/lib/utils";
import { useShopSettings } from "@/lib/queries/shop";
import { Clock3, Copy, ExternalLink, QrCode } from "lucide-react";
import ShopSettingsPanel from "./components/ShopSettingsPanel";

export default function ShopPage({ organizationId }: { organizationId: string }) {
	const { data: settings, isLoading, isError, error } = useShopSettings();

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!settings) return <ErrorComponent msg="Configurações da loja digital não encontradas." />;

	const availability = getShopAvailability({ ativo: settings.ativo, configuracoes: settings.configuracoes });
	const shopUrl = `/shop/${organizationId}`;

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap items-center gap-2">
					<AvailabilityBadge status={availability.status} motivo={availability.motivo} />
					{availability.proximaAbertura ? (
						<span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<Clock3 className="size-3.5" />
							Próxima abertura: {formatOpening(availability.proximaAbertura)}
						</span>
					) : null}
				</div>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" size="sm" className="gap-2" onClick={() => copyToClipboard(`${window.location.origin}${shopUrl}`)}>
						<Copy className="size-4" />
						Copiar link
					</Button>
					<Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(shopUrl, "_blank")} disabled={!settings.ativo}>
						<ExternalLink className="size-4" />
						Ver loja
					</Button>
					<Button variant="secondary" size="sm" className="gap-2" onClick={() => copyToClipboard(`${window.location.origin}${shopUrl}`)}>
						<QrCode className="size-4" />
						Compartilhar
					</Button>
				</div>
			</div>

			<ShopSettingsPanel settings={settings} />
		</div>
	);
}

function AvailabilityBadge({ status, motivo }: { status: "ABERTA" | "FECHADA" | "INDISPONIVEL"; motivo: string }) {
	const label =
		status === "ABERTA"
			? "Aberta agora"
			: status === "INDISPONIVEL"
				? "Inativa"
				: motivo === "SEM_HORARIO"
					? "Configuração incompleta"
					: "Fechada agora";
	return (
		<Badge variant={status === "ABERTA" ? "default" : "outline"} className="gap-1.5">
			<span className={`size-1.5 rounded-full ${status === "ABERTA" ? "bg-primary-foreground" : "bg-muted-foreground"}`} />
			{label}
		</Badge>
	);
}

function formatOpening(date: Date) {
	return new Intl.DateTimeFormat("pt-BR", {
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Sao_Paulo",
	}).format(date);
}
