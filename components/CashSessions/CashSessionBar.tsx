"use client";

import type { TGetSalesSessionsOutputDefault } from "@/app/api/pos/sales-sessions/route";
import SelectInput from "@/components/Inputs/SelectInput";
import CloseSalesSession from "@/components/Modals/Internal/SalesSessions/CloseSalesSession";
import OpenSalesSession from "@/components/Modals/Internal/SalesSessions/OpenSalesSession";
import RegisterMovement from "@/components/Modals/Internal/SalesSessions/RegisterMovement";
import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { ArrowRightLeft, LockKeyhole, Wallet } from "lucide-react";
import { useState } from "react";

type Session = TGetSalesSessionsOutputDefault["sessions"][number];
type Props = {
	session: Session | null;
	sessions: Session[];
	activeSessionId: string | null;
	onSessionChange: (id: string | null) => void;
	isLoading: boolean;
	exigirFundoTroco: boolean;
	conferenciaCega: boolean;
	className?: string;
};
type ActiveModal = "open" | "movement" | "close" | null;

export default function CashSessionBar({
	session,
	sessions,
	activeSessionId,
	onSessionChange,
	isLoading,
	exigirFundoTroco,
	conferenciaCega,
	className,
}: Props) {
	const [modal, setModal] = useState<ActiveModal>(null);
	return (
		<div
			className={cn(
				"flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5",
				session ? "border-primary/25 bg-primary/[0.06]" : "border-border bg-muted/40",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-2.5">
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
					<Wallet className="h-4 w-4" />
				</span>
				{isLoading ? (
					<span className="text-sm text-muted-foreground">Verificando caixas...</span>
				) : session ? (
					<div className="flex min-w-0 flex-col leading-tight">
						<span className="truncate font-bold text-sm">
							CAIXA ABERTO{" "}
							<span className="font-medium text-muted-foreground">
								- {session.politica === "VENDEDOR_UNICO" ? "VENDEDOR ÚNICO" : "MÚLTIPLOS VENDEDORES"}
								{session.vendedorPadrao?.nome ? ` - ${session.vendedorPadrao.nome}` : ""}
							</span>
						</span>
						<span className="text-[11px] text-muted-foreground">
							Desde {dayjs(session.dataAbertura).format("DD/MM HH:mm")} - Fundo {formatToMoney(session.saldoInicial)}
						</span>
					</div>
				) : (
					<div className="flex flex-col leading-tight">
						<span className="font-bold text-sm">SELECIONE OU ABRA UM CAIXA</span>
						<span className="text-[11px] text-muted-foreground">A venda usa a sessão escolhida explicitamente.</span>
					</div>
				)}
			</div>
			<div className="flex items-center gap-2">
				{sessions.length > 1 ? (
					<div className="w-52">
						<SelectInput
							label="CAIXA"
							showLabel={false}
							value={activeSessionId}
							options={sessions.map((item) => ({
								id: item.id,
								value: item.id,
								label: `${item.id.slice(0, 6)}${item.vendedorPadrao?.nome ? ` - ${item.vendedorPadrao.nome}` : ""}`,
							}))}
							handleChange={onSessionChange}
							resetOptionLabel="Selecione o caixa"
							onReset={() => onSessionChange(null)}
						/>
					</div>
				) : null}
				{session ? (
					<>
						<Button variant="ghost" size="sm" onClick={() => setModal("movement")} className="gap-1.5">
							<ArrowRightLeft className="h-4 w-4" />
							MOVIMENTO
						</Button>
						<Button variant="outline" size="sm" onClick={() => setModal("close")} className="gap-1.5">
							<LockKeyhole className="h-4 w-4" />
							FECHAR CAIXA
						</Button>
					</>
				) : null}
				<Button size="sm" variant={session ? "ghost" : "default"} onClick={() => setModal("open")} className="gap-1.5">
					<Wallet className="h-4 w-4" />
					ABRIR CAIXA
				</Button>
			</div>
			{modal === "open" ? <OpenSalesSession closeModal={() => setModal(null)} exigirFundoTroco={exigirFundoTroco} /> : null}
			{modal === "movement" && session ? <RegisterMovement sessionId={session.id} closeModal={() => setModal(null)} /> : null}
			{modal === "close" && session ? (
				<CloseSalesSession sessionId={session.id} closeModal={() => setModal(null)} conferenciaCega={conferenciaCega} />
			) : null}
		</div>
	);
}
