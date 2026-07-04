"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { usePlatformPartnerDashboard } from "@/lib/queries/platform-partnerships";
import { cn } from "@/lib/utils";
import { Building2, CalendarClock, Check, Clock3, Copy, ExternalLink, Inbox, Landmark, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

function centsToMoney(value: number) {
	return formatToMoney(value / 100);
}

type PillTone = "success" | "warning" | "info" | "neutral" | "danger";

const PILL_TONES: Record<PillTone, string> = {
	success: "bg-[#16a34a]/12 text-[#15803d] border-[#16a34a]/25",
	warning: "bg-[#ffb900]/18 text-[#a06a00] border-[#ffb900]/40",
	info: "bg-[#24549c]/10 text-[#24549c] border-[#24549c]/20",
	neutral: "bg-[#171717]/6 text-[#525252] border-[#171717]/10",
	danger: "bg-[#ef4444]/10 text-[#dc2626] border-[#ef4444]/25",
};

function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
	return (
		<span className={cn("inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-bold", PILL_TONES[tone])}>{children}</span>
	);
}

function organizationStatus(status: string): { tone: PillTone; label: string } {
	switch (status) {
		case "active":
			return { tone: "success", label: "Ativa" };
		case "trialing":
		case "trial":
			return { tone: "info", label: "Em teste" };
		case "past_due":
		case "unpaid":
			return { tone: "warning", label: "Pagamento pendente" };
		case "canceled":
			return { tone: "danger", label: "Cancelada" };
		case "sem_assinatura":
			return { tone: "neutral", label: "Sem assinatura" };
		default:
			return { tone: "neutral", label: status };
	}
}

function payoutStatus(status: string): { tone: PillTone; label: string } {
	switch (status) {
		case "PAGO":
			return { tone: "success", label: "Pago" };
		case "APROVADO":
			return { tone: "info", label: "Aprovado" };
		case "RASCUNHO":
			return { tone: "neutral", label: "Em apuração" };
		case "CANCELADO":
			return { tone: "danger", label: "Cancelado" };
		default:
			return { tone: "neutral", label: status };
	}
}

export default function PartnerDashboardPage() {
	const { data, isLoading, isError, error } = usePlatformPartnerDashboard();
	const [copied, setCopied] = useState(false);

	if (isLoading || !data) return <DashboardSkeleton />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!data.partner) return null;

	const { partner, stats, organizations, payouts } = data;
	const partnerLink = `${process.env.NEXT_PUBLIC_APP_URL}/r/${partner.codigo}`;

	if (partner.status !== "ATIVO") return <InactivePartner status={partner.status} />;

	const copyLink = () => {
		void navigator.clipboard.writeText(partnerLink);
		setCopied(true);
		toast.success("Link copiado.");
		setTimeout(() => setCopied(false), 1800);
	};

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
			{/* Cabeçalho */}
			<header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-1.5">
					<p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]">Programa de Parcerias</p>
					<h1 className="text-[28px] font-extrabold tracking-[-0.015em] text-[#171717] md:text-[34px]">Olá, {partner.nome.split(" ")[0]}</h1>
					<p className="max-w-2xl text-[14px] text-[#737373]">Acompanhe suas indicações, comissões e pagamentos.</p>
				</div>

				<div className="w-full rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:w-auto lg:min-w-[400px]">
					<p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#737373]">Seu link de indicação</p>
					<div className="flex items-center gap-2">
						<code className="tabular-nums min-w-0 flex-1 truncate rounded-xl bg-[#f5f5f5] px-3 py-2.5 text-[13px] font-semibold text-[#171717]">
							{partnerLink}
						</code>
						<Button size="icon" onClick={copyLink} aria-label="Copiar link" className="h-10 w-10 shrink-0 bg-[#24549c] hover:bg-[#1a3d7a]">
							{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
						</Button>
					</div>
				</div>
			</header>

			{/* KPIs */}
			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Metric icon={<Building2 className="h-4 w-4" />} label="Lojas indicadas" value={stats?.organizacoesIndicadas ?? 0} />
				<Metric icon={<TrendingUp className="h-4 w-4" />} label="Comissões totais" value={centsToMoney(stats?.comissoesTotalCentavos ?? 0)} />
				<Metric icon={<Clock3 className="h-4 w-4" />} label="A receber" value={centsToMoney(stats?.valorPendenteCentavos ?? 0)} />
				<Metric icon={<Wallet className="h-4 w-4" />} label="Já recebido" value={centsToMoney(stats?.valorPagoCentavos ?? 0)} accent />
			</section>

			<div className="flex items-center gap-2 rounded-xl border border-[#24549c]/15 bg-[#f7f9fc] px-4 py-3 text-[13px] text-[#171717]/70">
				<CalendarClock className="h-4 w-4 shrink-0 text-[#24549c]" strokeWidth={2.5} />
				As comissões são apuradas e pagas mensalmente via PIX, com comprovante anexado a cada pagamento.
			</div>

			{/* Tabelas */}
			<Tabs defaultValue="organizations" className="w-full">
				<TabsList variant="page">
					<TabsTrigger value="organizations">
						<Building2 className="h-4 w-4 min-h-4 min-w-4" />
						Lojas
					</TabsTrigger>
					<TabsTrigger value="payouts">
						<Wallet className="h-4 w-4 min-h-4 min-w-4" />
						Pagamentos
					</TabsTrigger>
				</TabsList>

				<TabsContent value="organizations" className="mt-4">
					<div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
						{organizations.length === 0 ? (
							<EmptyState
								icon={<Building2 className="h-5 w-5" />}
								title="Nenhuma loja indicada ainda"
								text="Compartilhe seu link acima. Assim que uma loja se cadastrar por ele, ela aparece aqui."
							/>
						) : (
							<>
								<TableHeader columns={["Loja", "Plano", "Situação", "Comissão"]} />
								{organizations.map((organization) => {
									const orgStatus = organizationStatus(organization.status);
									return (
										<div
											key={organization.id}
											className="grid grid-cols-2 items-center gap-3 border-t border-[#e5e5e5] px-4 py-4 first:border-t-0 sm:grid-cols-[2fr_1fr_1fr_1fr] sm:px-5"
										>
											<div className="col-span-2 sm:col-span-1">
												<p className="font-bold text-[#171717]">{organization.nome}</p>
												<p className="text-[12px] text-[#737373]">Desde {formatDateAsLocale(organization.dataEntrada)}</p>
											</div>
											<div>
												<StatusPill tone="neutral">{organization.plano ?? "Sem plano"}</StatusPill>
											</div>
											<div>
												<StatusPill tone={orgStatus.tone}>{orgStatus.label}</StatusPill>
											</div>
											<p className="tabular-nums text-right font-extrabold text-[#171717] sm:text-left">
												{centsToMoney(organization.valorComissionadoCentavos)}
											</p>
										</div>
									);
								})}
							</>
						)}
					</div>
				</TabsContent>

				<TabsContent value="payouts" className="mt-4">
					<div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
						{payouts.length === 0 ? (
							<EmptyState
								icon={<Landmark className="h-5 w-5" />}
								title="Nenhum pagamento gerado ainda"
								text="Quando o financeiro fechar a apuração do mês, seus pagamentos via PIX aparecem aqui com comprovante."
							/>
						) : (
							<>
								<TableHeader columns={["Valor", "Competência", "Situação", "Comprovante"]} />
								{payouts.map((payout) => {
									const status = payoutStatus(payout.status);
									return (
										<div
											key={payout.id}
											className="grid grid-cols-2 items-center gap-3 border-t border-[#e5e5e5] px-4 py-4 first:border-t-0 sm:grid-cols-[1.4fr_1.6fr_1fr_1fr] sm:px-5"
										>
											<p className="tabular-nums font-extrabold text-[#171717]">{centsToMoney(payout.valorTotalCentavos)}</p>
											<p className="text-[13px] text-[#737373]">
												{formatDateAsLocale(payout.competenciaInicio)} — {formatDateAsLocale(payout.competenciaFim)}
											</p>
											<div>
												<StatusPill tone={status.tone}>{status.label}</StatusPill>
											</div>
											<div className="text-right sm:text-left">
												{payout.comprovanteUrl ? (
													<Button asChild variant="outline" size="sm" className="gap-1.5">
														<Link href={payout.comprovanteUrl} target="_blank">
															Ver
															<ExternalLink className="h-3 w-3" />
														</Link>
													</Button>
												) : (
													<span className="text-[13px] text-[#a3a3a3]">{payout.dataPagamento ? "Sem comprovante" : "Aguardando"}</span>
												)}
											</div>
										</div>
									);
								})}
							</>
						)}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
	return (
		<div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
			<div
				className={cn(
					"mb-4 flex h-9 w-9 items-center justify-center rounded-xl",
					accent ? "bg-[#ffb900] text-[#171717]" : "bg-[#24549c]/10 text-[#24549c]",
				)}
			>
				{icon}
			</div>
			<p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#737373]">{label}</p>
			<p className="tabular-nums mt-1.5 text-[26px] font-extrabold tracking-[-0.01em] text-[#171717]">{value}</p>
		</div>
	);
}

function TableHeader({ columns }: { columns: string[] }) {
	return (
		<div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-3 bg-[#fafafa] px-5 py-3 sm:grid">
			{columns.map((column) => (
				<span key={column} className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#737373]">
					{column}
				</span>
			))}
		</div>
	);
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
			<span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24549c]/10 text-[#24549c]">{icon}</span>
			<p className="text-[15px] font-extrabold text-[#171717]">{title}</p>
			<p className="max-w-sm text-[13px] leading-[1.6] text-[#737373]">{text}</p>
		</div>
	);
}

function InactivePartner({ status }: { status: string }) {
	const content: Record<string, { tone: PillTone; title: string; text: string; icon: React.ReactNode }> = {
		PENDENTE_APROVACAO: {
			tone: "warning",
			icon: <Inbox className="h-6 w-6" />,
			title: "Cadastro em análise",
			text: "Recebemos seus dados. Nosso financeiro está validando seu cadastro e libera o painel completo assim que for aprovado.",
		},
		SUSPENSO: {
			tone: "warning",
			icon: <ShieldAlert className="h-6 w-6" />,
			title: "Acesso suspenso",
			text: "Seu acesso ao programa está temporariamente suspenso. Fale com o nosso time para regularizar seu cadastro.",
		},
		REJEITADO: {
			tone: "danger",
			icon: <ShieldAlert className="h-6 w-6" />,
			title: "Cadastro não aprovado",
			text: "Não foi possível aprovar seu cadastro no programa. Entre em contato com o nosso time para mais detalhes.",
		},
	};
	const state = content[status] ?? {
		tone: "neutral" as PillTone,
		icon: <ShieldAlert className="h-6 w-6" />,
		title: "Acesso indisponível",
		text: "Entre em contato com o nosso time para revisar seu cadastro.",
	};

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
			<section className="w-full rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-10">
				<div className="flex items-start gap-4">
					<span
						className={cn(
							"inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
							state.tone === "danger" ? "bg-[#ef4444]/10 text-[#dc2626]" : "bg-[#ffb900]/18 text-[#a06a00]",
						)}
					>
						{state.icon}
					</span>
					<div className="space-y-2.5">
						<StatusPill tone={state.tone}>{status.replace(/_/g, " ")}</StatusPill>
						<h1 className="text-[24px] font-extrabold tracking-[-0.015em] text-[#171717]">{state.title}</h1>
						<p className="max-w-xl text-[14px] leading-[1.6] text-[#737373]">{state.text}</p>
					</div>
				</div>
			</section>
		</div>
	);
}

function DashboardSkeleton() {
	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
			<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-2.5">
					<div className="h-3 w-40 animate-pulse rounded-full bg-[#ececec]" />
					<div className="h-8 w-56 animate-pulse rounded-lg bg-[#ececec]" />
				</div>
				<div className="h-[88px] w-full animate-pulse rounded-2xl bg-[#ececec] lg:w-[400px]" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[0, 1, 2, 3].map((index) => (
					<div key={index} className="h-[124px] animate-pulse rounded-2xl bg-[#ececec]" />
				))}
			</div>
			<div className="h-11 w-56 animate-pulse rounded-xl bg-[#ececec]" />
			<div className="h-64 w-full animate-pulse rounded-2xl bg-[#ececec]" />
		</div>
	);
}
