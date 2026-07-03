"use client";

import type { TGetSalesSessionsOutputDefault } from "@/app/api/pos/sales-sessions/route";
import SelectInput from "@/components/Inputs/SelectInput";
import CloseSalesSession from "@/components/Modals/Internal/SalesSessions/CloseSalesSession";
import OpenSalesSession from "@/components/Modals/Internal/SalesSessions/OpenSalesSession";
import RegisterMovement from "@/components/Modals/Internal/SalesSessions/RegisterMovement";
import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { useSellersSimplified } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { ArrowRightLeft, LockKeyhole, Wallet } from "lucide-react";
import { useState } from "react";

type ActiveSession = TGetSalesSessionsOutputDefault["sessions"][number];

type CashSessionBarProps = {
	session: ActiveSession | null;
	isLoading: boolean;
	vendedorId: string | null;
	onVendedorChange?: (id: string | null, nome: string | null) => void;
	exigirFundoTroco: boolean;
	conferenciaCega: boolean;
	className?: string;
};

type ActiveModal = "open" | "movement" | "close" | null;

export default function CashSessionBar({ session, isLoading, vendedorId, onVendedorChange, exigirFundoTroco, conferenciaCega, className }: CashSessionBarProps) {
	const [modal, setModal] = useState<ActiveModal>(null);
	const { data: sellers } = useSellersSimplified();
	const sellerOptions = (sellers ?? []).map((seller) => ({ id: seller.id, value: seller.id, label: seller.nome }));

	const isOpen = !!session;

	return (
		<div
			className={cn(
				"flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5",
				isOpen ? "border-primary/25 bg-primary/[0.06]" : "border-border bg-muted/40",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-2.5">
				<span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", isOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
					<Wallet className="h-4 w-4" />
				</span>
				{isLoading ? (
					<span className="text-sm text-muted-foreground">Verificando caixa...</span>
				) : isOpen ? (
					<div className="flex min-w-0 flex-col leading-tight">
						<span className="truncate font-bold text-sm">
							Caixa aberto
							{session.responsavelVendedor?.nome ? <span className="font-medium text-muted-foreground"> • {session.responsavelVendedor.nome}</span> : null}
						</span>
						<span className="text-[11px] text-muted-foreground">
							Desde {dayjs(session.dataAbertura).format("DD/MM HH:mm")} • Fundo {formatToMoney(session.saldoInicial)}
						</span>
					</div>
				) : (
					<div className="flex flex-col leading-tight">
						<span className="font-bold text-sm">Nenhum caixa aberto</span>
						<span className="text-[11px] text-muted-foreground">Abra o caixa para registrar as vendas do turno.</span>
					</div>
				)}
			</div>

			<div className="flex items-center gap-2">
				{!isOpen && onVendedorChange ? (
					<div className="w-44">
						<SelectInput
							label="Responsavel"
							showLabel={false}
							value={vendedorId}
							options={sellerOptions}
							handleChange={(value) => {
								const seller = sellers?.find((item) => item.id === value);
								onVendedorChange(value, seller?.nome ?? null);
							}}
							resetOptionLabel="Selecione o responsavel"
							onReset={() => onVendedorChange(null, null)}
						/>
					</div>
				) : null}

				{isOpen ? (
					<>
						<Button variant="outline" size="sm" onClick={() => setModal("movement")} className="gap-1.5">
							<ArrowRightLeft className="h-4 w-4" />
							Movimento
						</Button>
						<Button variant="outline" size="sm" onClick={() => setModal("close")} className="gap-1.5">
							<LockKeyhole className="h-4 w-4" />
							Fechar caixa
						</Button>
					</>
				) : (
					<Button size="sm" onClick={() => setModal("open")} disabled={!vendedorId} className="gap-1.5">
						<Wallet className="h-4 w-4" />
						Abrir caixa
					</Button>
				)}
			</div>

			{modal === "open" ? (
				<OpenSalesSession closeModal={() => setModal(null)} exigirFundoTroco={exigirFundoTroco} initialResponsavelVendedorId={vendedorId} />
			) : null}
			{modal === "movement" && session ? <RegisterMovement sessionId={session.id} closeModal={() => setModal(null)} /> : null}
			{modal === "close" && session ? <CloseSalesSession sessionId={session.id} closeModal={() => setModal(null)} conferenciaCega={conferenciaCega} /> : null}
		</div>
	);
}
