"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import OpenSalesSession from "@/components/Modals/Internal/SalesSessions/OpenSalesSession";
import { Button } from "@/components/ui/button";
import { useSellersSimplified } from "@/lib/queries/sellers";
import { Wallet } from "lucide-react";
import { useState } from "react";

type CashSessionGateProps = {
	vendedorId: string | null;
	onVendedorChange: (id: string | null, nome: string | null) => void;
	exigirFundoTroco: boolean;
};

/**
 * Bloqueio de entrada do fluxo de venda quando o caixa é obrigatório e não há sessão aberta.
 * O operador se identifica (responsável) e abre o caixa aqui — nunca monta um carrinho inteiro
 * para descobrir no fim que não pode confirmar.
 */
export default function CashSessionGate({ vendedorId, onVendedorChange, exigirFundoTroco }: CashSessionGateProps) {
	const [isOpening, setIsOpening] = useState(false);
	const { data: sellers } = useSellersSimplified();
	const sellerOptions = (sellers ?? []).map((seller) => ({ id: seller.id, value: seller.id, label: seller.nome }));

	return (
		<div className="flex w-full flex-1 items-center justify-center p-4">
			<div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
				<span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
					<Wallet className="h-7 w-7" />
				</span>
				<div className="flex flex-col gap-1.5">
					<h2 className="font-black text-xl">Abra o caixa para vender</h2>
					<p className="text-sm text-muted-foreground">
						Nesta organizacao as vendas so podem ser registradas com um caixa aberto. Selecione o responsável e abra a sessão para continuar.
					</p>
				</div>
				<div className="w-full">
					<SelectInput
						label="RESPONSÁVEL PELO CAIXA"
						value={vendedorId}
						options={sellerOptions}
						handleChange={(value) => {
							const seller = sellers?.find((item) => item.id === value);
							onVendedorChange(value, seller?.nome ?? null);
						}}
						resetOptionLabel="Selecione o responsável"
						onReset={() => onVendedorChange(null, null)}
						required
					/>
				</div>
				<Button className="w-full gap-1.5" disabled={!vendedorId} onClick={() => setIsOpening(true)}>
					<Wallet className="h-4 w-4" />
					ABRIR CAIXA
				</Button>
			</div>

			{isOpening ? (
				<OpenSalesSession closeModal={() => setIsOpening(false)} exigirFundoTroco={exigirFundoTroco} initialResponsavelVendedorId={vendedorId} />
			) : null}
		</div>
	);
}
