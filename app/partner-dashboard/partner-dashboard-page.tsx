"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { usePlatformPartnerDashboard } from "@/lib/queries/platform-partnerships";
import { ArrowRight, Banknote, Building2, Copy, ExternalLink, ReceiptText, ShieldAlert, Timer, TrendingUp } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { toast } from "sonner";

function centsToMoney(value: number) {
	return formatToMoney(value / 100);
}

export default function PartnerDashboardPage() {
	const { data, isLoading, isError, error } = usePlatformPartnerDashboard();

	if (isLoading || !data) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!data.partner) return null;

	const { partner, stats, organizations, payouts } = data;
	const partnerLink = `${process.env.NEXT_PUBLIC_APP_URL}/r/${partner.codigo}`;

	if (partner.status !== "ATIVO") {
		return (
			<main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
				<section className="w-full rounded-lg border border-red-400/20 bg-red-400/10 p-8">
					<div className="flex items-start gap-4">
						<ShieldAlert className="mt-1 h-6 w-6 text-red-300" />
						<div className="space-y-2">
							<Badge variant="destructive">{partner.status}</Badge>
							<h1 className="text-2xl font-semibold tracking-tight">Acesso ao programa indisponível.</h1>
							<p className="max-w-2xl text-sm text-zinc-300">Entre em contato com o nosso time para revisar seu cadastro.</p>
						</div>
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className="w-full h-full flex flex-col gap-3">
			<header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Programa de Parcerias</p>
					<h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Painel do parceiro</h1>
					<p className="max-w-2xl text-sm text-zinc-400">Acompanhe indicacoes, comissoes e pagamentos do seu programa.</p>
				</div>
				<div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:min-w-[420px]">
					<span className="text-xs uppercase text-zinc-500">Seu link</span>
					<div className="flex items-center gap-2">
						<code className="min-w-0 flex-1 truncate rounded-md bg-zinc-900 px-3 py-2 text-xs text-zinc-200">{partnerLink}</code>
						<Button
							size="icon"
							variant="secondary"
							onClick={() => {
								void navigator.clipboard.writeText(partnerLink);
								toast.success("Link copiado.");
							}}
						>
							<Copy className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</header>

			<section className="grid gap-3 md:grid-cols-4">
				<Metric icon={<Building2 className="h-4 w-4" />} label="Organizacoes" value={stats?.organizacoesIndicadas ?? 0} />
				<Metric icon={<TrendingUp className="h-4 w-4" />} label="Comissoes totais" value={centsToMoney(stats?.comissoesTotalCentavos ?? 0)} />
				<Metric icon={<ReceiptText className="h-4 w-4" />} label="A fazer" value={centsToMoney(stats?.valorPendenteCentavos ?? 0)} />
				<Metric icon={<Banknote className="h-4 w-4" />} label="Pago" value={centsToMoney(stats?.valorPagoCentavos ?? 0)} />
			</section>

			<Tabs defaultValue="organizations" className="w-full">
				<TabsList className="bg-white/10">
					<TabsTrigger value="organizations">Organizacoes</TabsTrigger>
					<TabsTrigger value="payouts">Payouts</TabsTrigger>
				</TabsList>
				<TabsContent value="organizations" className="mt-4">
					<div className="overflow-hidden rounded-lg border border-white/10">
						{organizations.length === 0 ? (
							<EmptyState text="Nenhuma organizacao indicada ainda." />
						) : (
							organizations.map((organization) => (
								<div key={organization.id} className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-5 md:items-center">
									<div className="md:col-span-2">
										<p className="font-medium">{organization.nome}</p>
										<p className="text-xs text-zinc-500">Entrada em {formatDateAsLocale(organization.dataEntrada)}</p>
									</div>
									<Badge className="w-fit bg-white/10 text-zinc-100 hover:bg-white/10">{organization.plano ?? "SEM PLANO"}</Badge>
									<span className="text-sm text-zinc-300">{organization.status}</span>
									<span className="font-semibold text-amber-300">{centsToMoney(organization.valorComissionadoCentavos)}</span>
								</div>
							))
						)}
					</div>
				</TabsContent>
				<TabsContent value="payouts" className="mt-4">
					<div className="overflow-hidden rounded-lg border border-white/10">
						{payouts.length === 0 ? (
							<EmptyState text="Nenhum payout gerado ainda." />
						) : (
							payouts.map((payout) => (
								<div key={payout.id} className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-5 md:items-center">
									<div className="md:col-span-2">
										<p className="font-medium">{centsToMoney(payout.valorTotalCentavos)}</p>
										<p className="text-xs text-zinc-500">
											{formatDateAsLocale(payout.competenciaInicio)} - {formatDateAsLocale(payout.competenciaFim)}
										</p>
									</div>
									<Badge className="w-fit bg-white/10 text-zinc-100 hover:bg-white/10">{payout.status}</Badge>
									<span className="text-sm text-zinc-300">{payout.dataPagamento ? formatDateAsLocale(payout.dataPagamento) : "A fazer"}</span>
									{payout.comprovanteUrl ? (
										<Button asChild variant="secondary" size="sm" className="gap-2">
											<Link href={payout.comprovanteUrl} target="_blank">
												Comprovante
												<ExternalLink className="h-3 w-3" />
											</Link>
										</Button>
									) : (
										<span className="text-sm text-zinc-500">Sem comprovante</span>
									)}
								</div>
							))
						)}
					</div>
				</TabsContent>
			</Tabs>
		</main>
	);
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
	return (
		<div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
			<div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-amber-300 text-zinc-950">{icon}</div>
			<p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
			<p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
		</div>
	);
}

function EmptyState({ text }: { text: string }) {
	return (
		<div className="flex items-center justify-center gap-2 p-10 text-sm text-zinc-500">
			{text}
			<ArrowRight className="h-4 w-4" />
		</div>
	);
}
