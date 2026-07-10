"use client";

import TextareaInput from "@/components/Inputs/TextareaInput";
import { formatDateAsLocale } from "@/lib/formatting";
import { CircleAlert } from "lucide-react";
import { buildBenefitLabel, buildCouponSummary } from "../../helpers/summary";
import { useBuilderCoupon } from "../builder-provider";

function ReviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			<span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
			<span className="text-sm font-medium text-foreground sm:text-right">{value}</span>
		</div>
	);
}

export default function StageReview() {
	const { state, updateCoupon } = useBuilderCoupon();
	const { coupon } = state;

	const channels = [
		coupon.resgatePermitirViaPos ? "PDV" : null,
		coupon.resgatePermitirViaPontoInteracao ? "Ponto de interação" : null,
		coupon.resgatePermitirViaLojaDigital ? "Loja digital" : null,
	].filter(Boolean);

	const audience =
		coupon.escopo === "INDIVIDUAL"
			? "Clientes específicos"
			: state.couponAudiences.filter((a) => !a.deletar).length > 0
				? state.couponAudiences
						.filter((a) => !a.deletar)
						.map((a) => a.clienteTagTitulo ?? a.segmentacaoRFM ?? "segmento")
						.join(", ")
				: "Qualquer cliente";

	const vigencia = coupon.vigenciaInicio || coupon.vigenciaFim
		? `${coupon.vigenciaInicio ? formatDateAsLocale(coupon.vigenciaInicio) : "hoje"} até ${coupon.vigenciaFim ? formatDateAsLocale(coupon.vigenciaFim) : "sem prazo"}`
		: "Sem prazo definido";

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full flex-col gap-1 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
				<span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Resumo</span>
				<p className="text-sm font-medium leading-snug text-foreground">{buildCouponSummary(state)}</p>
			</div>

			<TextareaInput
				value={coupon.descricao ?? ""}
				label="DESCRIÇÃO (VISÍVEL AO CLIENTE)"
				placeholder="Ex: Aproveite 10% de desconto na sua próxima compra..."
				handleChange={(value) => updateCoupon({ descricao: value })}
			/>

			<div className="flex w-full flex-col rounded-xl border border-border bg-card px-4 py-2">
				<ReviewRow label="Título" value={coupon.titulo?.trim() || "—"} />
				<ReviewRow label="Código" value={coupon.codigo?.trim() || "—"} />
				<ReviewRow label="Benefício" value={buildBenefitLabel(coupon)} />
				<ReviewRow label="Validação" value={coupon.validacaoModo === "AUTOMATICA" ? "Automática" : "Manual (no balcão)"} />
				<ReviewRow label="Quem pode usar" value={audience} />
				<ReviewRow label="Vigência" value={vigencia} />
				<ReviewRow
					label="Limites"
					value={`${coupon.limiteResgatesTotal ? `${coupon.limiteResgatesTotal} no total` : "Total ilimitado"} · ${coupon.limiteResgatesPorCliente ?? 1} por cliente`}
				/>
				<ReviewRow label="Resgate em" value={channels.length > 0 ? channels.join(", ") : "Nenhum canal ativo"} />
				<ReviewRow label="Situação" value={coupon.ativo ? "Ativo ao salvar" : "Inativo ao salvar"} />
			</div>

			{!coupon.ativo ? (
				<div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
					<CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<p className="text-xs text-muted-foreground">O cupom será criado inativo e não poderá ser resgatado até você ativá-lo.</p>
				</div>
			) : null}
		</div>
	);
}
