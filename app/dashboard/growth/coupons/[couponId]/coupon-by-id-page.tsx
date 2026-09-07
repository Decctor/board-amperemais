"use client";

import type { TGetCouponsOutputById } from "@/app/api/coupons/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlCoupon from "@/components/Modals/Coupons/ControlCoupon";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { deleteCoupon } from "@/lib/mutations/coupons";
import { useCouponById } from "@/lib/queries/coupons";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	BadgePercent,
	CalendarClock,
	Coins,
	Globe,
	Monitor,
	Pencil,
	Receipt,
	Store,
	Ticket,
	Trash2,
	TrendingUp,
	UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type TCoupon = TGetCouponsOutputById;

const REDEMPTION_SOURCE: Record<string, { label: string; icon: typeof Store }> = {
	POS: { label: "PDV", icon: Store },
	PONTO_INTERACAO: { label: "Ponto de interação", icon: Monitor },
	LOJA_DIGITAL: { label: "Loja digital", icon: Globe },
};

function formatCouponBenefit(coupon: TCoupon): string {
	if (coupon.beneficioTipo === "DESCONTO_FIXO") return `${formatToMoney(coupon.beneficioValor ?? 0)} de desconto`;
	if (coupon.beneficioTipo === "DESCONTO_PERCENTUAL")
		return `${coupon.beneficioValor ?? 0}% de desconto${coupon.beneficioDescontoMaximo ? ` (até ${formatToMoney(coupon.beneficioDescontoMaximo)})` : ""}`;
	if (coupon.beneficioTipo === "PRECO_FIXO") return `Preço fixo de ${formatToMoney(coupon.beneficioValor ?? 0)}`;
	if (coupon.beneficioTipo === "COMPRE_X_LEVE_Y") return `Leve ${coupon.beneficioLeveQuantidade ?? 0}, pague ${coupon.beneficioCompreQuantidade ?? 0}`;
	return "Brinde";
}

function StatCell({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "primary" | "brand" }) {
	return (
		<div className={cn("flex flex-col gap-1 rounded-lg px-4 py-3", tone === "brand" ? "bg-brand/10" : "bg-muted/40")}>
			<span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
			<span className={cn("text-2xl font-extrabold tracking-tight tabular-nums text-foreground", tone === "primary" && "text-primary")}>{value}</span>
			{sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
		</div>
	);
}

export default function CouponByIdPage({ couponId }: { couponId: string }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: coupon, isLoading, isError, error, queryKey } = useCouponById({ couponId });
	const [editModalOpen, setEditModalOpen] = useState(false);

	const { mutate: handleDeleteCoupon, isPending: deleteIsPending } = useMutation({
		mutationKey: ["delete-coupon", couponId],
		mutationFn: deleteCoupon,
		onSuccess: async (data) => {
			toast.success(data.message);
			await queryClient.invalidateQueries({ queryKey: ["coupons"] });
			router.push(appRoutes.growth.coupons());
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	if (isLoading) return <LoadingComponent />;
	if (isError || !coupon) return <ErrorComponent msg={getErrorMessage(error)} />;

	const { impacto, resgatesRecentes } = coupon;
	const taxaUso = coupon.limiteResgatesTotal ? Math.round((impacto.resgates / coupon.limiteResgatesTotal) * 100) : null;
	const hasActivity = impacto.resgates > 0;

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-1 py-2">
			<div className="flex w-full items-center justify-between gap-2">
				<Button type="button" variant="ghost" size="sm" className="flex items-center gap-1.5" asChild>
					<Link href={appRoutes.growth.coupons()}>
						<ArrowLeft className="h-3.5 w-3.5" />
						VOLTAR
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					<Button type="button" variant="outline" size="sm" className="flex items-center gap-1.5" onClick={() => setEditModalOpen(true)}>
						<Pencil className="h-3.5 w-3.5" />
						EDITAR
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="flex items-center gap-1.5 text-destructive"
						disabled={deleteIsPending}
						onClick={() => handleDeleteCoupon({ id: couponId })}
					>
						<Trash2 className="h-3.5 w-3.5" />
						EXCLUIR
					</Button>
				</div>
			</div>

			{/* Identidade do cupom */}
			<div className={cn("flex w-full flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm", !coupon.ativo && "opacity-80")}>
				<div className="flex flex-wrap items-center gap-2">
					<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<Ticket className="h-5 w-5" />
					</span>
					<h1 className="text-lg font-extrabold tracking-tight text-foreground">{coupon.titulo}</h1>
					<span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-tight text-primary">{coupon.codigo}</span>
					<span
						className={cn(
							"rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
							coupon.ativo ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-destructive/10 text-destructive",
						)}
					>
						{coupon.ativo ? "Ativo" : "Inativo"}
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<BadgePercent className="h-3.5 w-3.5" />
						{formatCouponBenefit(coupon)}
					</span>
					<span className="flex items-center gap-1.5">
						{coupon.escopo === "GLOBAL" ? <Globe className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
						{coupon.escopo === "GLOBAL" ? "Qualquer cliente" : "Clientes específicos"}
					</span>
					<span className="flex items-center gap-1.5">
						<CalendarClock className="h-3.5 w-3.5" />
						{coupon.vigenciaFim ? `Válido até ${formatDateAsLocale(coupon.vigenciaFim)}` : "Sem expiração"}
					</span>
					<span>{coupon.validacaoModo === "AUTOMATICA" ? "Validação automática" : "Validação manual"}</span>
				</div>
				{coupon.descricao ? <p className="text-sm text-foreground/80">{coupon.descricao}</p> : null}
			</div>

			{/* Impacto comercial */}
			<Section.Root>
				<Section.Header>
					<Section.Icon>
						<TrendingUp className="h-4 w-4" />
					</Section.Icon>
					<Section.Title>IMPACTO COMERCIAL</Section.Title>
				</Section.Header>
				<Section.Body>
					{hasActivity ? (
						<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
							<StatCell
								label="Resgates"
								value={String(impacto.resgates)}
								sub={taxaUso !== null ? `de ${coupon.limiteResgatesTotal} (${taxaUso}%)` : "utilizados"}
								tone="primary"
							/>
							<StatCell label="Clientes únicos" value={String(impacto.clientesUnicos)} />
							<StatCell label="Desconto concedido" value={formatToMoney(impacto.descontoConcedido)} sub="custo do benefício" />
							<StatCell label="Receita influenciada" value={formatToMoney(impacto.receitaInfluenciada)} sub="vendas com o cupom" tone="brand" />
						</div>
					) : (
						<div className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-muted/30 px-4 py-8 text-center">
							<Coins className="h-6 w-6 text-muted-foreground" />
							<p className="text-sm font-medium text-foreground">Ainda sem resgates</p>
							<p className="max-w-sm text-xs text-muted-foreground">
								Assim que este cupom for usado numa venda, o impacto comercial aparece aqui: resgates, desconto concedido e receita influenciada.
							</p>
						</div>
					)}
				</Section.Body>
			</Section.Root>

			{/* Atividade de resgates */}
			{hasActivity ? (
				<Section.Root>
					<Section.Header>
						<Section.Icon>
							<Receipt className="h-4 w-4" />
						</Section.Icon>
						<Section.Title>RESGATES RECENTES</Section.Title>
					</Section.Header>
					<Section.Body>
						<div className="flex w-full flex-col gap-1.5">
							{resgatesRecentes.map((redemption) => {
								const source = REDEMPTION_SOURCE[redemption.origemResgate] ?? { label: redemption.origemResgate, icon: Store };
								const SourceIcon = source.icon;
								const canceled = redemption.status === "CANCELADO";
								return (
									<div
										key={redemption.id}
										className={cn(
											"flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2",
											canceled && "opacity-55",
										)}
									>
										<div className="flex min-w-0 flex-col">
											<span className={cn("truncate text-sm font-semibold text-foreground", canceled && "line-through")}>
												{redemption.cliente?.nome ?? "Cliente não identificado"}
											</span>
											<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
												<SourceIcon className="h-3 w-3" />
												{source.label}
												{canceled ? " · cancelado" : ""}
												{redemption.dataInsercao ? ` · ${formatDateAsLocale(redemption.dataInsercao)}` : ""}
											</span>
										</div>
										<div className="flex items-center gap-4 text-right">
											<div className="flex flex-col">
												<span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Desconto</span>
												<span className="text-sm font-bold tabular-nums text-foreground">{formatToMoney(redemption.valorDesconto)}</span>
											</div>
											<div className="flex flex-col">
												<span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Venda</span>
												<span className="text-sm font-medium tabular-nums text-muted-foreground">
													{redemption.vendaValor != null ? formatToMoney(redemption.vendaValor) : "—"}
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</Section.Body>
				</Section.Root>
			) : null}

			{editModalOpen ? (
				<ControlCoupon
					couponId={couponId}
					closeModal={() => setEditModalOpen(false)}
					callbacks={{ onSettled: async () => await queryClient.invalidateQueries({ queryKey }) }}
				/>
			) : null}
		</div>
	);
}
