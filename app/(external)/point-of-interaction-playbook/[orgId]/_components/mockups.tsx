"use client";

import { cn } from "@/lib/utils";
import {
	ArrowRight,
	BadgeDollarSign,
	BadgePercent,
	Check,
	CheckCheck,
	Delete,
	Gift,
	Loader2,
	Phone,
	ShieldCheck,
	ShoppingCart,
	UserPlus,
	X,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Réplicas estáticas (não-interativas) das telas reais do Ponto de Interação.
 * Servem apenas como ilustração dentro do playbook — usam dados de exemplo e
 * imitam o visual das telas de produção (mesmas cores de marca via `bg-brand`).
 */

const SAMPLE = {
	orgName: "Sua Empresa",
	clientName: "Maria Silva",
	clientPhone: "(11) 98888-7777",
	balance: "R$ 42,00",
	saleValue: "R$ 120,00",
	cashbackUsed: "R$ 20,00",
	finalValue: "R$ 100,00",
	cashbackGenerated: "R$ 6,00",
	newBalance: "R$ 28,00",
};

// ----------------------------------------------------------------------------
// Device frames
// ----------------------------------------------------------------------------

export function TabletFrame({ label, children }: { label?: string; children: ReactNode }) {
	return (
		<div className="flex flex-col items-center gap-1.5">
			<div className="rounded-[1.25rem] border-[6px] border-neutral-800 bg-neutral-800 p-1 shadow-lg">
				<div className="overflow-hidden rounded-[0.75rem] bg-background">{children}</div>
			</div>
			{label ? <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{label}</span> : null}
		</div>
	);
}

export function PhoneFrame({ label, children }: { label?: string; children: ReactNode }) {
	return (
		<div className="flex flex-col items-center gap-1.5">
			<div className="relative w-[180px] rounded-[1.5rem] border-[6px] border-neutral-800 bg-neutral-800 p-1 shadow-lg">
				<div className="absolute left-1/2 top-1.5 z-10 h-1 w-12 -translate-x-1/2 rounded-full bg-neutral-700" />
				<div className="overflow-hidden rounded-[1rem] bg-background pt-3">{children}</div>
			</div>
			{label ? <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{label}</span> : null}
		</div>
	);
}

export function PanelFrame({ label, children }: { label?: string; children: ReactNode }) {
	return (
		<div className="flex flex-col items-center gap-1.5">
			<div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
				<div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-1.5">
					<span className="h-2 w-2 rounded-full bg-red-400" />
					<span className="h-2 w-2 rounded-full bg-amber-400" />
					<span className="h-2 w-2 rounded-full bg-green-400" />
					<span className="ml-2 text-[0.6rem] font-medium text-muted-foreground">Painel da loja · Ponto de Interação</span>
				</div>
				<div className="p-3">{children}</div>
			</div>
			{label ? <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{label}</span> : null}
		</div>
	);
}

// ----------------------------------------------------------------------------
// Shared bits
// ----------------------------------------------------------------------------

function OtpSlots({ filled = 5 }: { filled?: number }) {
	return (
		<div className="flex items-center justify-center gap-1.5">
			{Array.from({ length: 5 }).map((_, i) => (
				<div
					key={i}
					className={cn(
						"flex h-9 w-7 items-center justify-center rounded-md border-2 text-lg font-black",
						i < filled ? "border-brand bg-brand/5 text-foreground" : "border-border bg-background text-muted-foreground",
					)}
				>
					{i < filled ? "•" : ""}
				</div>
			))}
		</div>
	);
}

function MockButton({ children, variant = "brand", className }: { children: ReactNode; variant?: "brand" | "green" | "outline" | "danger"; className?: string }) {
	return (
		<div
			className={cn(
				"flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider",
				variant === "brand" && "bg-brand text-brand-foreground",
				variant === "green" && "bg-green-600 text-white",
				variant === "outline" && "border-2 border-border bg-background text-foreground",
				variant === "danger" && "text-red-600",
				className,
			)}
		>
			{children}
		</div>
	);
}

function StepHeader({ steps, current }: { steps: string[]; current: number }) {
	return (
		<div className="flex items-center justify-center gap-1 border-b border-border bg-muted/40 px-3 py-2">
			{steps.map((s, i) => (
				<div key={s} className="flex items-center gap-1">
					<div
						className={cn(
							"flex h-4 w-4 items-center justify-center rounded-full text-[0.55rem] font-black",
							i + 1 <= current ? "bg-brand text-brand-foreground" : "bg-border text-muted-foreground",
						)}
					>
						{i + 1}
					</div>
					<span className={cn("text-[0.55rem] font-bold uppercase tracking-wide", i + 1 <= current ? "text-foreground" : "text-muted-foreground")}>{s}</span>
					{i < steps.length - 1 ? <span className="mx-0.5 h-px w-3 bg-border" /> : null}
				</div>
			))}
		</div>
	);
}

// ----------------------------------------------------------------------------
// Kiosk hub — keypad
// ----------------------------------------------------------------------------

export function KioskHubMockup({ logoUrl }: { logoUrl?: string | null }) {
	return (
		<div className="flex w-[420px] gap-3 p-3">
			{/* Org card */}
			<div className="flex w-[42%] flex-col overflow-hidden rounded-xl border border-border bg-card">
				<div className="flex items-center gap-2 bg-brand px-3 py-3">
					<div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white">
						{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain p-0.5" /> : <ShoppingCart className="h-4 w-4 text-brand" />}
					</div>
					<span className="truncate text-sm font-black text-brand-foreground">{SAMPLE.orgName}</span>
				</div>
				<div className="flex flex-col gap-2 px-3 py-3">
					<div className="flex items-center gap-2">
						<div className="rounded-md bg-green-100 p-1.5">
							<BadgePercent className="h-3.5 w-3.5 text-green-700" />
						</div>
						<div className="flex flex-col">
							<span className="text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground">Acúmulo</span>
							<span className="text-[0.6rem] font-extrabold leading-tight">5% a cada R$ 1,00</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<div className="rounded-md bg-purple-100 p-1.5">
							<Gift className="h-3.5 w-3.5 text-purple-700" />
						</div>
						<div className="flex flex-col">
							<span className="text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground">Recompensas</span>
							<span className="text-[0.6rem] font-extrabold leading-tight">Troque por prêmios</span>
						</div>
					</div>
				</div>
			</div>
			{/* Keypad */}
			<div className="flex w-[58%] flex-col gap-2">
				<div className="rounded-lg border border-border bg-card px-2 py-2 text-center">
					<p className="text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground">Número de Telefone</p>
					<p className="text-lg font-black tracking-wider">{SAMPLE.clientPhone}</p>
				</div>
				<div className="grid grid-cols-3 gap-1.5">
					{[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => (
						<div key={d} className="flex h-7 items-center justify-center rounded-lg bg-brand text-sm font-black text-brand-foreground">
							{d}
						</div>
					))}
					<div className="col-span-2 flex h-7 items-center justify-center rounded-lg bg-brand text-sm font-black text-brand-foreground">0</div>
					<div className="flex h-7 items-center justify-center rounded-lg bg-red-500 text-white">
						<Delete className="h-3.5 w-3.5" />
					</div>
				</div>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Mobile hub — phone identification
// ----------------------------------------------------------------------------

export function MobileHubMockup({ logoUrl }: { logoUrl?: string | null }) {
	return (
		<div className="flex flex-col gap-3 px-3 pb-4 pt-2">
			<div className="flex items-center gap-2">
				<div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-brand">
					{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain p-0.5" /> : <ShoppingCart className="h-4 w-4 text-brand-foreground" />}
				</div>
				<span className="truncate text-xs font-black">{SAMPLE.orgName}</span>
			</div>
			<div className="text-center">
				<h4 className="text-sm font-black uppercase tracking-tight">Identifique-se</h4>
				<p className="text-[0.6rem] text-muted-foreground">Digite seu telefone para começar</p>
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground">Telefone</span>
				<div className="rounded-lg border border-border bg-background px-2 py-2 text-sm font-bold">{SAMPLE.clientPhone}</div>
			</div>
			<MockButton variant="brand" className="mt-1">
				Avançar <ArrowRight className="h-3.5 w-3.5" />
			</MockButton>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Found client / New client
// ----------------------------------------------------------------------------

export function FoundClientMockup() {
	return (
		<div className="flex w-[300px] flex-col items-center gap-2 p-3">
			<div className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 p-3">
				<p className="text-[0.55rem] font-bold uppercase tracking-widest text-green-600">✓ Perfil Encontrado</p>
				<p className="text-lg font-black uppercase italic leading-none text-green-900">{SAMPLE.clientName}</p>
				<p className="text-xs font-bold text-green-600">{SAMPLE.clientPhone}</p>
				<div className="w-full rounded-lg bg-green-600 px-3 py-2 text-center text-white">
					<p className="text-[0.5rem] font-bold uppercase tracking-widest opacity-80">Saldo Disponível</p>
					<p className="text-2xl font-black">{SAMPLE.balance}</p>
				</div>
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-green-200">
					<div className="h-full w-2/3 bg-green-600" />
				</div>
				<p className="text-[0.55rem] font-medium text-green-700">Avançando em 2 segundos...</p>
			</div>
		</div>
	);
}

export function NewClientMockup() {
	return (
		<div className="flex w-[300px] flex-col gap-2 p-3">
			<div className="flex flex-col gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 p-3">
				<div className="flex items-center gap-2">
					<div className="rounded-md bg-blue-600 p-1.5 text-white">
						<UserPlus className="h-4 w-4" />
					</div>
					<div>
						<h4 className="text-xs font-black uppercase text-blue-900">Novo Cliente</h4>
						<p className="text-[0.55rem] text-blue-600">Complete os dados para criar o cadastro</p>
					</div>
				</div>
				<div className="flex w-fit items-center gap-1 self-center rounded-md bg-blue-600 px-2.5 py-1 text-white">
					<Phone className="h-3 w-3" />
					<span className="text-[0.6rem] font-bold">{SAMPLE.clientPhone}</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-[0.5rem] font-bold uppercase tracking-wider text-muted-foreground">Nome Completo</span>
					<div className="rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium">{SAMPLE.clientName}</div>
				</div>
				<MockButton variant="brand" className="mt-0.5 bg-blue-600 text-white">
					<UserPlus className="h-3.5 w-3.5" /> Avançar
				</MockButton>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Mode selection
// ----------------------------------------------------------------------------

export function ModeSelectionMockup({ phone = false }: { phone?: boolean }) {
	return (
		<div className={cn("flex flex-col gap-2 p-3", phone ? "w-full" : "w-[360px]")}>
			<div className="text-center">
				<h4 className="text-xs font-black uppercase tracking-tight">O que deseja fazer?</h4>
				<p className="text-[0.6rem] text-muted-foreground">Escolha entre desconto ou resgatar uma recompensa</p>
			</div>
			<div className={cn("grid gap-2", phone ? "grid-cols-1" : "grid-cols-2")}>
				<div className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-brand/20 bg-brand/5 p-3 text-center">
					<div className="rounded-lg bg-brand/10 p-2 text-brand">
						<BadgePercent className="h-5 w-5" />
					</div>
					<span className="text-[0.6rem] font-black uppercase leading-tight">Pontuar e obter descontos</span>
				</div>
				<div className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-center">
					<div className="rounded-lg bg-amber-100 p-2 text-amber-600">
						<Gift className="h-5 w-5" />
					</div>
					<span className="text-[0.6rem] font-black uppercase leading-tight">Pontuar e resgatar recompensa</span>
				</div>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Sale value + Cashback step
// ----------------------------------------------------------------------------

export function CashbackStepMockup() {
	return (
		<div className="w-[320px]">
			<StepHeader steps={["VENDA", "CASHBACK", "CONF."]} current={2} />
			<div className="flex flex-col gap-2 p-3">
				<div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
					<span className="text-[0.6rem] font-bold uppercase text-muted-foreground">Valor da venda</span>
					<span className="text-base font-black">{SAMPLE.saleValue}</span>
				</div>
				<div className="flex items-center justify-between rounded-lg border-2 border-green-200 bg-green-50 px-3 py-2">
					<div className="flex flex-col">
						<span className="text-[0.55rem] font-bold uppercase text-green-700">Usar saldo como desconto</span>
						<span className="text-[0.55rem] text-green-600">Disponível: {SAMPLE.balance}</span>
					</div>
					<div className="flex h-4 w-7 items-center rounded-full bg-green-600 px-0.5">
						<div className="ml-auto h-3 w-3 rounded-full bg-white" />
					</div>
				</div>
				<div className="flex items-center justify-between rounded-lg bg-brand/10 px-3 py-2">
					<span className="text-[0.6rem] font-black uppercase">Valor final</span>
					<span className="text-base font-black text-brand">{SAMPLE.finalValue}</span>
				</div>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Kiosk confirmation — operator password inline
// ----------------------------------------------------------------------------

export function KioskConfirmationMockup() {
	return (
		<div className="w-[320px]">
			<StepHeader steps={["VENDA", "CASHBACK", "CONF."]} current={3} />
			<div className="flex flex-col gap-2 p-3">
				<div className="rounded-lg bg-brand/10 px-3 py-2 text-center">
					<p className="text-[0.55rem] font-bold uppercase tracking-widest text-muted-foreground">Cliente</p>
					<p className="text-sm font-black">{SAMPLE.clientName}</p>
					<p className="mt-1 text-[0.55rem] font-bold uppercase tracking-widest text-muted-foreground">Total a pagar</p>
					<p className="text-xl font-black text-brand">{SAMPLE.finalValue}</p>
				</div>
				<div className="flex flex-col gap-1.5 rounded-lg border-2 border-amber-200 bg-amber-50 p-2.5">
					<span className="text-center text-[0.55rem] font-bold uppercase tracking-wider text-amber-700">Senha do operador (5 dígitos)</span>
					<OtpSlots filled={5} />
					<p className="text-center text-[0.5rem] text-amber-600">O vendedor confirma a operação no próprio totem</p>
				</div>
				<MockButton variant="green">
					Finalizar <Check className="h-3.5 w-3.5" />
				</MockButton>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Mobile waiting step
// ----------------------------------------------------------------------------

export function MobileWaitingMockup() {
	return (
		<div className="flex flex-col items-center gap-3 px-3 pb-5 pt-3 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
			<div>
				<p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-brand/70">Solicitação enviada</p>
				<h4 className="text-sm font-black tracking-tight">Aguardando aprovação</h4>
				<p className="mt-1 text-[0.6rem] text-muted-foreground">Aguarde enquanto a loja confirma</p>
			</div>
			<div className="w-full rounded-xl border border-brand/15 bg-card p-2.5 text-left">
				<p className="text-[0.6rem]">
					Status atual: <strong>PENDENTE</strong>
				</p>
				<p className="text-[0.6rem] text-muted-foreground">
					Cliente: <strong>{SAMPLE.clientName}</strong>
				</p>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Dashboard request queue (panel)
// ----------------------------------------------------------------------------

export function DashboardQueueMockup() {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-[0.6rem] font-medium uppercase tracking-tight">Solicitações</span>
				<span className="flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[0.5rem] font-bold text-brand">
					<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> tempo real
				</span>
			</div>
			<div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 shadow-2xs">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<span className="text-[0.65rem] font-bold">{SAMPLE.clientName}</span>
						<span className="flex items-center gap-0.5 text-[0.5rem] italic text-muted-foreground">
							<Phone className="h-2.5 w-2.5" />
							{SAMPLE.clientPhone}
						</span>
					</div>
					<span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[0.5rem] font-medium uppercase text-amber-700">Pendente</span>
				</div>
				<div className="flex items-center gap-2 text-[0.55rem] font-medium uppercase text-foreground">
					<span className="flex items-center gap-0.5">
						<BadgeDollarSign className="h-2.5 w-2.5" />
						Bruto: {SAMPLE.saleValue}
					</span>
					<span className="flex items-center gap-0.5">
						<BadgePercent className="h-2.5 w-2.5" />
						Resgate: {SAMPLE.cashbackUsed}
					</span>
					<span className="flex items-center gap-0.5">
						<BadgeDollarSign className="h-2.5 w-2.5" />
						Final: {SAMPLE.finalValue}
					</span>
				</div>
				<div className="flex items-center justify-end gap-1.5">
					<MockButton variant="danger" className="px-2 py-1">
						<X className="h-3 w-3" /> Rejeitar
					</MockButton>
					<MockButton variant="brand" className="px-2 py-1">
						<CheckCheck className="h-3 w-3" /> Aprovar
					</MockButton>
				</div>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Approve modal (panel) — operator password
// ----------------------------------------------------------------------------

export function ApproveModalMockup() {
	return (
		<div className="w-[280px] rounded-xl border border-border bg-card p-3 shadow-xl">
			<h4 className="text-xs font-black uppercase tracking-tight">Aprovar solicitação</h4>
			<p className="mt-0.5 text-[0.55rem] text-muted-foreground">
				Informe os 5 dígitos da senha do vendedor que receberá a venda. Cliente: {SAMPLE.clientName}.
			</p>
			<div className="mt-2.5 flex flex-col gap-1.5">
				<span className="text-[0.55rem] font-medium tracking-tight text-foreground/80">
					Senha do operador (5 dígitos) <span className="text-red-500">*</span>
				</span>
				<OtpSlots filled={5} />
			</div>
			<div className="mt-3 flex items-center justify-end gap-1.5">
				<MockButton variant="outline" className="px-2.5 py-1">
					Cancelar
				</MockButton>
				<MockButton variant="brand" className="px-2.5 py-1">
					<ShieldCheck className="h-3 w-3" /> Aprovar
				</MockButton>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Success celebration
// ----------------------------------------------------------------------------

export function SuccessMockup({ kind = "sale", phone = false }: { kind?: "sale" | "prize"; phone?: boolean }) {
	return (
		<div className={cn("flex flex-col items-center gap-2 p-3 text-center", phone ? "w-full" : "w-[300px]")}>
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
				{kind === "prize" ? <Gift className="h-6 w-6" /> : <Check className="h-6 w-6" />}
			</div>
			<h4 className="text-sm font-black uppercase tracking-tight">{kind === "prize" ? "Resgate realizado!" : "Venda realizada!"}</h4>
			<div className="grid w-full grid-cols-2 gap-1.5">
				<div className="rounded-lg bg-green-50 px-2 py-1.5">
					<p className="text-[0.5rem] font-bold uppercase tracking-widest text-green-600">Cashback gerado</p>
					<p className="text-sm font-black text-green-700">{SAMPLE.cashbackGenerated}</p>
				</div>
				<div className="rounded-lg bg-brand/10 px-2 py-1.5">
					<p className="text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground">Novo saldo</p>
					<p className="text-sm font-black text-brand">{SAMPLE.newBalance}</p>
				</div>
			</div>
		</div>
	);
}

export const SAMPLE_DATA = SAMPLE;
