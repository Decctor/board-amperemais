"use client";

import { Button } from "@/components/ui/button";
import { usePoiTransactionRequestStatus } from "@/lib/queries/poi-transaction-requests";
import { Loader2, RefreshCcw, ShieldAlert, ShieldCheck, TimerReset } from "lucide-react";
import { useEffect } from "react";

type MobileWaitingStepProps = {
	token: string;
	onApproved: (result: NonNullable<ReturnType<typeof usePoiTransactionRequestStatus>["data"]>) => void;
	onRejected: () => void;
	onErrored: () => void;
	onReset: () => void;
};

export function MobileWaitingStep({ token, onApproved, onRejected, onErrored, onReset }: MobileWaitingStepProps) {
	const { data, isLoading, refetch } = usePoiTransactionRequestStatus({ token });

	useEffect(() => {
		if (!data) return;
		if (data.status === "APROVADO") onApproved(data);
		if (data.status === "REJEITADO") onRejected();
		if (data.status === "ERRO") onErrored();
	}, [data, onApproved, onRejected, onErrored]);

	if (isLoading || !data) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
				<Loader2 className="h-10 w-10 animate-spin text-brand" />
				<p className="text-sm text-muted-foreground">Criando sua solicitação e conectando com o painel da loja...</p>
			</div>
		);
	}

	const icon = data.status === "REJEITADO" ? ShieldAlert : data.status === "ERRO" ? RefreshCcw : ShieldCheck;
	const Icon = icon;

	return (
		<div className="space-y-5 text-center animate-in fade-in slide-in-from-bottom-4">
			<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
				{data.status === "PENDENTE" || data.status === "PROCESSANDO" ? <Loader2 className="h-8 w-8 animate-spin" /> : <Icon className="h-8 w-8" />}
			</div>
			<div className="space-y-2">
				<p className="text-xs font-bold uppercase tracking-[0.25em] text-brand/70">Solicitação enviada</p>
				<h2 className="text-2xl font-black tracking-tight">{data.mensagemPublica}</h2>
				<p className="text-sm text-muted-foreground">Você pode aguardar nesta tela enquanto a loja responde.</p>
			</div>
			<div className="rounded-3xl border border-brand/15 bg-card p-5 text-left shadow-sm space-y-3">
				<div className="flex items-center gap-3 text-sm">
					<TimerReset className="h-4 w-4 text-brand" />
					<span>
						Status atual: <strong>{data.status}</strong>
					</span>
				</div>
				{data.cliente?.nome ? (
					<p className="text-sm text-muted-foreground">
						Cliente: <strong>{data.cliente.nome}</strong>
					</p>
				) : null}
			</div>
			<div className="flex flex-col gap-3">
				<Button variant="outline" onClick={() => refetch()} className="h-11 rounded-2xl font-bold">
					Atualizar status
				</Button>
				{data.status === "REJEITADO" || data.status === "ERRO" ? (
					<Button onClick={onReset} className="h-12 rounded-2xl font-bold">
						Nova tentativa
					</Button>
				) : null}
			</div>
		</div>
	);
}
