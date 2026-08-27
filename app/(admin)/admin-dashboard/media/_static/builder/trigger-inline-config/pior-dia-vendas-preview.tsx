"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/trigger-inline-config/pior-dia-vendas-preview.tsx (commit 19d8578).
 *
 * Mesmo JSX do ramo de sucesso, sem `useCampaignUtilPreviewWorstSalesDay` e sem os
 * estados de loading/erro. O dia vem da constante abaixo.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */
import type { TCampaignState } from "@/schemas/campaigns";

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/** Terça-feira — o pior dia "calculado" da organização fictícia. */
const STATIC_WORST_SALES_DAY = 2;

type Props = { campaign: TCampaignState["campaign"] };
export default function PiorDiaVendasPreview({ campaign }: Props) {
	const worstSalesDay = STATIC_WORST_SALES_DAY;

	const delayLabel = (() => {
		const valor = campaign.execucaoAgendadaValor;
		const medida = campaign.execucaoAgendadaMedida;
		const direcao = campaign.execucaoAgendadaDirecao;
		if (!valor || !medida) return null;
		const dir = direcao === "ANTES" ? "antes" : "depois";
		return `${valor} ${valor > 1 ? medida.toLowerCase() : medida.toLowerCase().slice(0, -1)} ${dir}`;
	})();

	return (
		<div className="w-full rounded-md border border-amber-300 bg-amber-100 px-3 py-2.5">
			<p className="text-center text-sm font-medium tracking-tight text-amber-600">
				O pior dia previsto de vendas é{" "}
				<strong className="rounded-lg bg-amber-600 px-2 py-1 text-amber-100">{DAY_NAMES[worstSalesDay].toUpperCase()}</strong>
				.{delayLabel ? ` A mensagem será enviada ${delayLabel}, às ${campaign.execucaoAgendadaBloco}.` : ""}
			</p>
		</div>
	);
}
