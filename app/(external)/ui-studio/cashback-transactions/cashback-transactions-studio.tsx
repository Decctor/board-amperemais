"use client";

import {
	CashbackTransaction,
	ClientCashbackTransactionRow,
	ProgramCashbackTransactionRow,
	type TCashbackTransactionCardData,
} from "@/components/CashbackPrograms/CashbackTransactionCard";
import type { ReactNode } from "react";

/**
 * Estúdio das transações de cashback: as mesmas transações em composições diferentes, lado a lado,
 * para decidir o layout do bloco do cliente (mobile) e da lista do programa (desktop).
 */

const TERMINOLOGY = "DINHEIRO" as const;

const CLIENT = { id: "client-1", nome: "Mariana Oliveira" };
const OPERATOR = { id: "seller-1", nome: "Carlos Mendes" };

const TRANSACTIONS: TCashbackTransactionCardData[] = [
	{
		id: "t-expiration-1",
		tipo: "EXPIRAÇÃO",
		status: "ATIVO",
		valor: -14.5,
		dataInsercao: new Date("2026-06-15T20:00:00-03:00"),
		expiracaoData: null,
		saldoValorPosterior: 67.9,
		cliente: CLIENT,
		operadorVendedor: null,
		resgateRecompensa: null,
		venda: null,
	},
	{
		id: "t-accumulation-expired",
		tipo: "ACÚMULO",
		status: "EXPIRADO",
		valor: 20,
		dataInsercao: new Date("2026-05-21T09:50:00-03:00"),
		expiracaoData: new Date("2026-06-10T09:50:00-03:00"),
		saldoValorPosterior: 82.4,
		cliente: CLIENT,
		operadorVendedor: OPERATOR,
		resgateRecompensa: null,
		venda: { id: "8f3a2c1d-venda", valorTotal: 189.9, canal: "Loja física", vendedor: OPERATOR },
	},
	{
		id: "t-redeem-prize",
		tipo: "RESGATE",
		status: "ATIVO",
		valor: -35,
		dataInsercao: new Date("2026-05-28T18:12:00-03:00"),
		expiracaoData: null,
		saldoValorPosterior: 62.4,
		cliente: CLIENT,
		operadorVendedor: OPERATOR,
		resgateRecompensa: { id: "prize-1", titulo: "Garrafa térmica 500ml", imagemCapaUrl: null },
		venda: { id: "1c9b7e2a-venda", valorTotal: 120, canal: "WhatsApp", vendedor: OPERATOR },
	},
	{
		id: "t-accumulation-consumed",
		tipo: "ACÚMULO",
		status: "CONSUMIDO",
		valor: 12.3,
		dataInsercao: new Date("2026-05-12T11:05:00-03:00"),
		expiracaoData: new Date("2026-07-11T11:05:00-03:00"),
		saldoValorPosterior: 97.4,
		cliente: CLIENT,
		operadorVendedor: OPERATOR,
		resgateRecompensa: null,
		venda: { id: "5d2e9f8b-venda", valorTotal: 82, canal: "Loja física", vendedor: OPERATOR },
	},
	{
		id: "t-accumulation-active",
		tipo: "ACÚMULO",
		status: "ATIVO",
		valor: 17.98,
		dataInsercao: new Date("2026-05-21T06:49:00-03:00"),
		expiracaoData: new Date("2026-07-20T09:50:00-03:00"),
		saldoValorPosterior: 85.1,
		cliente: CLIENT,
		operadorVendedor: null,
		resgateRecompensa: null,
		venda: { id: "7a1f4c3e-venda", valorTotal: 119.9, canal: "iFood", vendedor: null },
	},
	{
		id: "t-cancel",
		tipo: "CANCELAMENTO",
		status: "ATIVO",
		valor: -17.98,
		dataInsercao: new Date("2026-05-22T08:00:00-03:00"),
		expiracaoData: null,
		saldoValorPosterior: 67.12,
		cliente: CLIENT,
		operadorVendedor: OPERATOR,
		resgateRecompensa: null,
		venda: { id: "7a1f4c3e-venda", valorTotal: 119.9, canal: "iFood", vendedor: null },
	},
];

/** Réplica do bloco de saldo do cliente em 390px, como ele é montado em `ClientCashback`. */
function PhoneFrame({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-2" data-studio-frame={title}>
			<p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
			<div className="w-[390px] shrink-0 rounded-3xl border border-border bg-background p-3 shadow-sm">
				<div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-4">
					<div className="flex items-center justify-between">
						<h2 className="text-xs font-bold tracking-tight">ÚLTIMAS TRANSAÇÕES</h2>
						<p className="text-xs text-muted-foreground">23 total</p>
					</div>
					{children}
				</div>
			</div>
		</div>
	);
}

/** A: cada transação como card com borda, como está hoje (só compactado). Card dentro de card. */
function VariantCard({ transaction }: { transaction: TCashbackTransactionCardData }) {
	return (
		<CashbackTransaction.Provider transaction={transaction} terminology={TERMINOLOGY}>
			<CashbackTransaction.Row className="mx-0 rounded-xl border border-border px-3">
				<CashbackTransaction.Icon />
				<CashbackTransaction.Body>
					<CashbackTransaction.Header>
						<CashbackTransaction.Type />
						<CashbackTransaction.Lifecycle />
					</CashbackTransaction.Header>
					<CashbackTransaction.Meta>
						<CashbackTransaction.Date format="date" />
					</CashbackTransaction.Meta>
				</CashbackTransaction.Body>
				<CashbackTransaction.Trailing>
					<CashbackTransaction.Amount />
					<CashbackTransaction.Expiration />
				</CashbackTransaction.Trailing>
			</CashbackTransaction.Row>
		</CashbackTransaction.Provider>
	);
}

/** C: linhas sem chip — o tipo vira o título e o ícone carrega a cor. */
function VariantTitle({ transaction }: { transaction: TCashbackTransactionCardData }) {
	return (
		<CashbackTransaction.Provider transaction={transaction} terminology={TERMINOLOGY}>
			<CashbackTransaction.Details>
				<CashbackTransaction.Row>
					<CashbackTransaction.Icon />
					<CashbackTransaction.Body>
						<CashbackTransaction.Header>
							<CashbackTransaction.TypeLabel />
							<CashbackTransaction.Lifecycle />
						</CashbackTransaction.Header>
						<CashbackTransaction.Meta>
							<CashbackTransaction.Date format="date" />
						</CashbackTransaction.Meta>
					</CashbackTransaction.Body>
					<CashbackTransaction.Trailing>
						<CashbackTransaction.Amount />
						<CashbackTransaction.Expiration />
					</CashbackTransaction.Trailing>
				</CashbackTransaction.Row>
			</CashbackTransaction.Details>
		</CashbackTransaction.Provider>
	);
}

export function CashbackTransactionsStudio() {
	return (
		<div className="flex min-h-screen w-full flex-col gap-10 bg-muted/30 p-8">
			<header className="flex flex-col gap-1">
				<h1 className="text-xl font-black tracking-tight">Cashback · transações</h1>
				<p className="text-sm text-muted-foreground">
					Mesmas seis transações (expiração, acúmulo expirado, resgate de prêmio, acúmulo utilizado, acúmulo ativo, estorno) em cada composição.
				</p>
			</header>

			<section className="flex flex-wrap items-start gap-8" data-studio-section="client">
				<PhoneFrame title="A · Cards (como hoje)">
					<div className="flex flex-col gap-1.5">
						{TRANSACTIONS.map((transaction) => (
							<VariantCard key={transaction.id} transaction={transaction} />
						))}
					</div>
				</PhoneFrame>
				<PhoneFrame title="B · Linhas com chip">
					<CashbackTransaction.List>
						{TRANSACTIONS.map((transaction) => (
							<ClientCashbackTransactionRow key={transaction.id} transaction={transaction} terminology={TERMINOLOGY} />
						))}
					</CashbackTransaction.List>
				</PhoneFrame>
				<PhoneFrame title="C · Linhas sem chip">
					<CashbackTransaction.List>
						{TRANSACTIONS.map((transaction) => (
							<VariantTitle key={transaction.id} transaction={transaction} />
						))}
					</CashbackTransaction.List>
				</PhoneFrame>
			</section>

			<section className="flex flex-col gap-2" data-studio-section="program">
				<p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Lista do programa · desktop</p>
				<div className="w-[760px] rounded-3xl border border-border bg-background p-6 shadow-sm">
					<CashbackTransaction.List>
						{TRANSACTIONS.map((transaction) => (
							<ProgramCashbackTransactionRow key={transaction.id} transaction={transaction} terminology={TERMINOLOGY} />
						))}
					</CashbackTransaction.List>
				</div>
			</section>
		</div>
	);
}
