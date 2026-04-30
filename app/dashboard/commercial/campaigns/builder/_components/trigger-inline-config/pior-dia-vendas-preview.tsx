"use client";

import { useCampaignUtilPreviewWorstSalesDay } from "@/lib/queries/campaigns";
import { useMemo } from "react";
import type { TCampaignState } from "@/schemas/campaigns";

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

type Props = { campaign: TCampaignState["campaign"] };
export default function PiorDiaVendasPreview({ campaign }: Props) {
	const { data: worstSalesDay, isLoading, isError, isSuccess } = useCampaignUtilPreviewWorstSalesDay();

	const delayLabel = useMemo(() => {
		const valor = campaign.execucaoAgendadaValor;
		const medida = campaign.execucaoAgendadaMedida;
		const direcao = campaign.execucaoAgendadaDirecao;
		if (!valor || !medida) return null;
		const dir = direcao === "ANTES" ? "antes" : "depois";
		return `${valor} ${valor > 1 ? medida.toLowerCase() : medida.toLowerCase().slice(0, -1)} ${dir}`;
	}, [campaign.execucaoAgendadaValor, campaign.execucaoAgendadaMedida, campaign.execucaoAgendadaDirecao]);

	if (isLoading)
		return (
			<div className="w-full rounded-md border border-amber-300 bg-amber-100 px-3 py-2.5">
				<p className="animate-pulse text-center text-sm font-medium tracking-tight text-amber-600">
					Carregando informações do pior dia de vendas...
				</p>
			</div>
		);
	if (isError)
		return (
			<div className="w-full rounded-md border border-red-300 bg-red-100 px-3 py-2.5">
				<p className="text-center text-sm font-medium tracking-tight text-red-600">
					Erro ao carregar informações do pior dia de vendas.
				</p>
			</div>
		);
	if (isSuccess && worstSalesDay != null)
		return (
			<div className="w-full rounded-md border border-amber-300 bg-amber-100 px-3 py-2.5">
				<p className="text-center text-sm font-medium tracking-tight text-amber-600">
					O pior dia previsto de vendas é{" "}
					<strong className="rounded-lg bg-amber-600 px-2 py-1 text-amber-100">{DAY_NAMES[worstSalesDay].toUpperCase()}</strong>
					.{delayLabel ? ` A mensagem será enviada ${delayLabel}, às ${campaign.execucaoAgendadaBloco}.` : ""}
				</p>
			</div>
		);

	if (isSuccess && worstSalesDay == null)
		return (
			<div className="w-full rounded-md border border-red-300 bg-red-100 px-3 py-2.5">
				<p className="text-center text-sm font-medium tracking-tight text-red-600">
					Não foi possível carregar informações do pior dia de vendas.
				</p>
			</div>
		);
	return null;
}
