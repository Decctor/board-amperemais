"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip } from "@/components/ui/map";
import { useClientsByLocation } from "@/lib/queries/clients/geographic";
import { cn } from "@/lib/utils";
import { MapPin, Users } from "lucide-react";
import { useMemo } from "react";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";

// Centro geográfico aproximado do Brasil [longitude, latitude].
const BRAZIL_CENTER: [number, number] = [-53.5, -14.5];
const BRAZIL_ZOOM = 3.4;

// Faixa de diâmetro (px) das bolhas por cidade — escaladas por área (sqrt) para leitura proporcional.
const MIN_MARKER_SIZE = 16;
const MAX_MARKER_SIZE = 46;

type ClientsGeographicMapProps = {
	className?: string;
	/** Altura do mapa como classe utilitária. Ex.: "h-[420px]" (padrão). */
	height?: string;
};

/**
 * Mapa da distribuição geográfica de clientes, agregada por cidade.
 *
 * Consome `GET /api/clients/stats/by-location`, que já resolve as coordenadas de cada cidade
 * no servidor. Deve ser carregado com `next/dynamic` e `{ ssr: false }` — o MapLibre exige o browser.
 */
export function ClientsGeographicMap({ className, height = "h-[420px]" }: ClientsGeographicMapProps) {
	const { colors } = useOrgColors();
	const { data, isLoading, isError } = useClientsByLocation();

	const maxClientes = useMemo(() => {
		if (!data?.pontos.length) return 1;
		return Math.max(...data.pontos.map((ponto) => ponto.clientes), 1);
	}, [data?.pontos]);

	function markerSizeFor(clientes: number) {
		const ratio = Math.sqrt(clientes) / Math.sqrt(maxClientes);
		return Math.round(MIN_MARKER_SIZE + (MAX_MARKER_SIZE - MIN_MARKER_SIZE) * ratio);
	}

	if (isLoading) {
		return (
			<div className={cn("bg-card border-border flex w-full items-center justify-center rounded-xl border shadow-2xs", height, className)}>
				<LoadingComponent />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className={cn("bg-card border-border flex w-full items-center justify-center rounded-xl border shadow-2xs", height, className)}>
				<ErrorComponent msg="Não foi possível carregar a distribuição de clientes." />
			</div>
		);
	}

	const { pontos, resumo, cidadesNaoMapeadas } = data;
	const isEmpty = pontos.length === 0;

	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-3 rounded-xl border p-3 shadow-2xs", className)}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-col">
					<h1 className="flex items-center gap-1.5 text-xs font-medium tracking-tight uppercase">
						<MapPin className="h-3.5 w-3.5" style={{ color: colors.secondary }} />
						DISTRIBUIÇÃO GEOGRÁFICA
					</h1>
					<p className="text-[0.65rem] text-muted-foreground">
						{resumo.cidadesMapeadas} {resumo.cidadesMapeadas === 1 ? "cidade mapeada" : "cidades mapeadas"} · {resumo.clientesComCidade}{" "}
						{resumo.clientesComCidade === 1 ? "cliente com cidade" : "clientes com cidade"}
					</p>
				</div>
			</div>

			<div className={cn("relative w-full overflow-hidden rounded-lg", height)}>
				{isEmpty ? (
					<div className="bg-muted/40 flex h-full w-full flex-col items-center justify-center gap-2 text-center">
						<MapPin className="text-muted-foreground h-8 w-8" />
						<p className="text-muted-foreground max-w-xs text-xs">
							Nenhuma cidade com coordenadas para exibir. Cadastre cidade e estado dos clientes para vê-los no mapa.
						</p>
					</div>
				) : (
					<Map center={BRAZIL_CENTER} zoom={BRAZIL_ZOOM} className="h-full w-full">
						<MapControls showZoom showFullscreen />
						{pontos.map((ponto) => {
							const size = markerSizeFor(ponto.clientes);
							const showCount = size >= 26;
							return (
								<MapMarker key={`${ponto.cidade}-${ponto.estado}`} longitude={ponto.longitude} latitude={ponto.latitude}>
									<MarkerContent>
										<div
											className="flex items-center justify-center rounded-full font-bold text-[10px] shadow-md ring-2 ring-white/70 transition-transform hover:scale-110"
											style={{
												width: size,
												height: size,
												backgroundColor: colors.primary,
												color: colors.primaryForeground,
											}}
										>
											{showCount ? ponto.clientes : null}
										</div>
									</MarkerContent>
									<MarkerTooltip>
										{ponto.cidade}/{ponto.estado} — {ponto.clientes} {ponto.clientes === 1 ? "cliente" : "clientes"}
									</MarkerTooltip>
									<MarkerPopup className="w-56 p-0">
										<div className="flex flex-col gap-1 p-3">
											<p className="text-sm font-bold tracking-tight">
												{ponto.cidade}/{ponto.estado}
											</p>
											<p className="text-muted-foreground flex items-center gap-1.5 text-xs">
												<Users className="h-3.5 w-3.5" />
												{ponto.clientes} {ponto.clientes === 1 ? "cliente" : "clientes"}
											</p>
										</div>
									</MarkerPopup>
								</MapMarker>
							);
						})}
					</Map>
				)}
			</div>

			{(resumo.clientesSemCidade > 0 || resumo.cidadesSemCoordenadas > 0) && (
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.65rem] text-muted-foreground">
					{resumo.clientesSemCidade > 0 && (
						<span>
							{resumo.clientesSemCidade} {resumo.clientesSemCidade === 1 ? "cliente sem cidade" : "clientes sem cidade"}
						</span>
					)}
					{resumo.cidadesSemCoordenadas > 0 && (
						<span title={cidadesNaoMapeadas.map((cidade) => `${cidade.cidade}/${cidade.estado}`).join(", ")}>
							{resumo.cidadesSemCoordenadas} {resumo.cidadesSemCoordenadas === 1 ? "cidade sem coordenadas" : "cidades sem coordenadas"}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
