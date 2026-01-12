"use client";

import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatToMoney, formatToPhone } from "@/lib/formatting";
import { createSale } from "@/lib/mutations/sales";
import { useClientByLookup } from "@/lib/queries/clients";
import { cn } from "@/lib/utils";
import type { TClientByLookupOutput } from "@/pages/api/clients/lookup";
import type { TCreateSaleInput } from "@/pages/api/sales";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgePercent, Check, CreditCard, Lock, Minus, Plus, ShoppingCart, Tag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type NewSaleContentProps = {
	org: {
		id: TOrganizationEntity["id"];
		cnpj: TOrganizationEntity["cnpj"];
		nome: TOrganizationEntity["nome"];
		logoUrl: TOrganizationEntity["logoUrl"];
		telefone: TOrganizationEntity["telefone"];
	};
	clientId?: string;
};
export default function NewSaleContent({ org, clientId }: NewSaleContentProps) {
	const router = useRouter();
	const [newSaleHolder, setNewSaleHolder] = useState<TCreateSaleInput>({
		orgId: org.id,
		clientId: clientId ?? "",
		saleValue: 0,
		password: "",
		cashbackApplied: false,
		cashbackAppliedAmount: 0,
	});

	const [currentStep, setCurrentStep] = useState(1);
	const { data: client, params, updateParams } = useClientByLookup({ initialParams: { orgId: org.id, phone: "", clientId: clientId } });

	useEffect(() => {
		if (client) setNewSaleHolder((prev) => ({ ...prev, clientId: client.id }));
	}, [client]);

	const updateNewSaleHolder = (changes: Partial<TCreateSaleInput>) => {
		setNewSaleHolder((prev) => ({ ...prev, ...changes }));
	};

	const handleNextStep = () => {
		if (currentStep === 1 && !client) return toast.error("Selecione um cliente.");
		if (currentStep === 2 && newSaleHolder.saleValue <= 0) return toast.error("Digite o valor da venda.");
		setCurrentStep((prev) => Math.min(prev + 1, 4));
	};

	const getAvailableCashback = () => client?.saldos?.[0]?.saldoValorDisponivel ?? 0;
	const getMaxCashbackToUse = () => Math.min(getAvailableCashback(), newSaleHolder.saleValue);
	const getFinalValue = () => Math.max(0, newSaleHolder.saleValue - (newSaleHolder.cashbackApplied ? newSaleHolder.cashbackAppliedAmount : 0));

	const { mutate: createSaleMutation, isPending: isCreatingSale } = useMutation({
		mutationFn: createSale,
		onSuccess: (data) => {
			toast.success(`Venda finalizada! Saldo: ${formatToMoney(data.data.cashbackAcumulado)}`);
			router.push(`/point-of-interaction/${org.id}/client-profile/${client?.id}`);
		},
	});

	return (
		<div className="w-full min-h-screen bg-secondary p-6 md:p-10 flex flex-col items-center">
			<div className="w-full max-w-4xl flex flex-col gap-6">
				{/* Header com Navegação */}
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild className="rounded-full">
						<Link href={`/point-of-interaction/${org.id}`}>
							<ArrowLeft className="w-6 h-6" />
						</Link>
					</Button>
					<div className="flex items-center gap-3">
						<div className="p-3 bg-brand rounded-2xl text-brand-foreground shadow-lg">
							<ShoppingCart className="w-6 h-6 md:w-8 md:h-8" />
						</div>
						<div>
							<h1 className="text-2xl md:text-3xl font-black tracking-tighter">NOVA VENDA</h1>
							<p className="text-[0.6rem] md:text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-70">Passo {currentStep} de 4</p>
						</div>
					</div>
				</div>

				{/* Wrapper de Estágios (Mantido conforme preferência) */}
				<div className="bg-card rounded-3xl shadow-xl overflow-hidden border border-brand/20">
					<div className="flex border-b">
						{[
							{ id: 1, label: "CLIENTE", icon: UserRound },
							{ id: 2, label: "VENDA", icon: Tag },
							{ id: 3, label: "CASHBACK", icon: BadgePercent },
							{ id: 4, label: "CONFIRMAÇÃO", icon: Lock },
						].map((step) => (
							<div
								key={step.id}
								className={cn(
									"flex-1 flex flex-col lg:flex-row items-center justify-center gap-2 py-4 transition-all border-b-4",
									currentStep === step.id ? "border-brand text-brand bg-brand/5" : "border-transparent text-muted-foreground",
								)}
							>
								<step.icon className="w-4 h-4" />
								<span className="text-[0.6rem] lg:text-xs font-black tracking-widest">{step.label}</span>
							</div>
						))}
					</div>

					<div className="p-6 md:p-10">
						{currentStep === 1 && <ClientStep client={client ?? null} phone={params.phone} onPhoneChange={(v) => updateParams({ phone: v })} />}
						{currentStep === 2 && <SaleValueStep value={newSaleHolder.saleValue} onChange={(v) => updateNewSaleHolder({ saleValue: v })} />}
						{currentStep === 3 && (
							<CashbackStep
								available={getAvailableCashback()}
								maxAllowed={getMaxCashbackToUse()}
								saleValue={newSaleHolder.saleValue}
								applied={newSaleHolder.cashbackApplied}
								amount={newSaleHolder.cashbackAppliedAmount}
								finalValue={getFinalValue()}
								onToggle={(v) => updateNewSaleHolder({ cashbackApplied: v, cashbackAppliedAmount: v ? getMaxCashbackToUse() : 0 })}
								onAmountChange={(v) => updateNewSaleHolder({ cashbackAppliedAmount: v })}
							/>
						)}
						{currentStep === 4 && client && (
							<ConfirmationStep
								holder={newSaleHolder}
								client={client}
								finalValue={getFinalValue()}
								onPasswordChange={(v) => updateNewSaleHolder({ password: v })}
							/>
						)}

						{/* Botões de Ação */}
						<div className="flex gap-4 mt-10">
							{currentStep > 1 && (
								<Button onClick={() => setCurrentStep((p) => p - 1)} variant="outline" size="lg" className="flex-1 rounded-2xl h-16 text-lg font-bold">
									VOLTAR
								</Button>
							)}
							<Button
								onClick={currentStep === 4 ? () => createSaleMutation(newSaleHolder) : handleNextStep}
								size="lg"
								disabled={isCreatingSale}
								className={cn(
									"flex-1 rounded-2xl h-16 text-lg font-bold shadow-lg shadow-brand/20 uppercase tracking-widest",
									currentStep === 4 && "bg-green-600 hover:bg-green-700",
								)}
							>
								{currentStep === 4 ? (isCreatingSale ? "PROCESSANDO..." : "FINALIZAR") : "PRÓXIMO"}
								{currentStep === 4 ? <Check className="ml-2 w-6 h-6" /> : <ArrowRight className="ml-2 w-6 h-6" />}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// --- Sub-componentes Refatorados ---

function ClientStep({
	client,
	phone,
	onPhoneChange,
}: { client: TClientByLookupOutput["data"]; phone: string; onPhoneChange: (phone: string) => void }) {
	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
			<div className="text-center space-y-2">
				<h2 className="text-xl font-black uppercase tracking-tight">Quem é o cliente?</h2>
				<p className="text-muted-foreground">Digite o número de telefone para localizar o perfil.</p>
			</div>
			<div className="max-w-md mx-auto">
				<TextInput label="TELEFONE" placeholder="(00) 00000-0000" value={formatToPhone(phone)} handleChange={onPhoneChange} />
			</div>
			{client && (
				<div className="bg-green-50 border-2 border-green-200 rounded-3xl p-6 flex flex-col items-center gap-4 animate-in zoom-in">
					<div className="text-center">
						<p className="text-green-900 font-black text-2xl uppercase italic">{client.nome}</p>
						<p className="text-green-600 font-bold">{formatToPhone(client.telefone)}</p>
					</div>
					<div className="bg-green-600 w-full rounded-2xl p-4 text-center text-white shadow-md">
						<p className="text-[0.6rem] font-bold opacity-80 uppercase tracking-widest">Saldo Disponível</p>
						<p className="text-3xl font-black">{formatToMoney(client.saldos[0]?.saldoValorDisponivel ?? 0)}</p>
					</div>
				</div>
			)}
		</div>
	);
}

function SaleValueStep({ value, onChange }: { value: number; onChange: (value: number) => void }) {
	const helpers = [10, 25, 50, 100];
	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
			<div className="text-center space-y-2">
				<h2 className="text-xl font-black uppercase tracking-tight">Qual o valor da compra?</h2>
			</div>
			<div className="relative max-w-md mx-auto">
				<span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">R$</span>
				<Input
					type="number"
					value={value || ""}
					onChange={(e) => onChange(Number(e.target.value))}
					className="h-24 text-5xl font-black text-center rounded-3xl border-4 border-brand/20 focus:border-brand px-12"
				/>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
				{helpers.map((h) => (
					<Button key={h} variant="secondary" onClick={() => onChange(value + h)} className="h-14 rounded-xl font-black text-lg">
						<Plus className="w-4 h-4 mr-1 text-brand" /> {h}
					</Button>
				))}
				<Button variant="ghost" onClick={() => onChange(0)} className="h-14 rounded-xl font-bold text-muted-foreground col-span-2 md:col-span-4 italic">
					<X className="w-4 h-4 mr-1" /> LIMPAR VALOR
				</Button>
			</div>
		</div>
	);
}

function CashbackStep({
	available,
	maxAllowed,
	applied,
	amount,
	onToggle,
	onAmountChange,
	saleValue,
	finalValue,
}: {
	available: number;
	maxAllowed: number;
	applied: boolean;
	amount: number;
	onToggle: (applied: boolean) => void;
	onAmountChange: (amount: number) => void;
	saleValue: number;
	finalValue: number;
}) {
	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
			<div className="bg-brand/5 rounded-3xl p-6 border-2 border-dashed border-brand/20">
				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-green-100 rounded-lg text-green-600">
							<CreditCard className="w-5 h-5" />
						</div>
						<h3 className="font-black uppercase italic">Usar Cashback?</h3>
					</div>
					<Switch checked={applied} onCheckedChange={onToggle} disabled={available === 0} className="scale-125" />
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="bg-white p-4 rounded-2xl shadow-sm border border-brand/20">
						<p className="text-[0.6rem] font-bold text-muted-foreground uppercase">Seu Saldo</p>
						<p className="text-xl font-black text-green-600">{formatToMoney(available)}</p>
					</div>
					<div className="bg-white p-4 rounded-2xl shadow-sm border border-brand/20">
						<p className="text-[0.6rem] font-bold text-muted-foreground uppercase">Limite p/ esta compra</p>
						<p className="text-xl font-black text-brand">{formatToMoney(maxAllowed)}</p>
					</div>
				</div>
			</div>

			{applied && (
				<div className="space-y-2 max-w-xs mx-auto text-center animate-in zoom-in">
					<Label className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Valor a Resgatar</Label>
					<Input
						type="number"
						max={maxAllowed}
						value={amount}
						onChange={(e) => onAmountChange(Number(e.target.value))}
						className="h-16 text-3xl font-black text-center rounded-2xl border-2 border-green-200 bg-green-50/30"
					/>
				</div>
			)}

			<div className="bg-brand rounded-3xl p-8 text-brand-foreground shadow-2xl relative overflow-hidden">
				<div className="relative z-10 flex flex-col gap-4">
					<div className="flex justify-between items-center opacity-60">
						<span className="text-sm font-bold uppercase tracking-widest">Subtotal</span>
						<span className="font-bold">{formatToMoney(saleValue)}</span>
					</div>
					{applied && (
						<div className="flex justify-between items-center text-green-400">
							<span className="text-sm font-bold uppercase tracking-widest">Desconto Cashback</span>
							<span className="font-bold">- {formatToMoney(amount)}</span>
						</div>
					)}
					<div className="h-px bg-background my-2" />
					<div className="flex justify-between items-end">
						<span className="text-lg font-black uppercase italic">Total a Pagar</span>
						<span className="text-4xl font-black text-brand-foreground">{formatToMoney(finalValue)}</span>
					</div>
				</div>
				<BadgePercent className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12" />
			</div>
		</div>
	);
}

function ConfirmationStep({
	holder,
	client,
	finalValue,
	onPasswordChange,
}: { holder: TCreateSaleInput; client: TClientByLookupOutput["data"]; finalValue: number; onPasswordChange: (password: string) => void }) {
	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
			<div className="text-center space-y-2">
				<h2 className="text-xl font-black uppercase tracking-tight">Finalizar Operação</h2>
				<p className="text-muted-foreground">Confira os dados e digite a senha do operador.</p>
			</div>

			<div className="bg-brand/5 rounded-3xl p-6 space-y-3 border border-brand/20">
				<div className="flex justify-between">
					<span className="text-muted-foreground font-bold text-xs uppercase">Cliente</span>
					<span className="font-black text-brand">{client?.nome}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground font-bold text-xs uppercase">Valor Final</span>
					<span className="font-black text-brand text-xl">{formatToMoney(finalValue)}</span>
				</div>
			</div>

			<div className="space-y-4 max-w-xs mx-auto">
				<Label className="block text-center font-black text-xs text-muted-foreground uppercase tracking-widest italic">
					Senha do Operador (4 dígitos)
				</Label>
				<Input
					type="password"
					maxLength={4}
					inputMode="numeric"
					placeholder="••••"
					onChange={(e) => onPasswordChange(e.target.value.replace(/\D/g, ""))}
					className="h-20 text-4xl text-center tracking-[1.5rem] rounded-2xl border-4 border-brand/20 focus:border-green-500 transition-all font-black"
				/>
			</div>
		</div>
	);
}
