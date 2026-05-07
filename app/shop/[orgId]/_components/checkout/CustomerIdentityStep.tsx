"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatToPhone } from "@/lib/formatting";
import { useShopClientLookup } from "@/lib/queries/shop";
import { cn } from "@/lib/utils";
import { Check, Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "../ShopProvider";

type CustomerIdentityStepProps = {
	onNext: () => void;
};

export default function CustomerIdentityStep({ onNext }: CustomerIdentityStepProps) {
	const { orgId, orderState } = useShop();
	const { customer } = orderState.state;

	const [telefone, setTelefone] = useState(customer.telefone || "");
	const [nome, setNome] = useState(customer.nome || "");
	const [cpfCnpj, setCpfCnpj] = useState(customer.cpfCnpj || "");

	const normalizedPhone = telefone.replace(/\D/g, "");
	const { data: lookupData, isLoading: isLookingUp } = useShopClientLookup({
		orgId,
		telefone: normalizedPhone,
	});

	const foundClient = lookupData?.cliente;
	const needsName = normalizedPhone.length >= 10 && !isLookingUp && !foundClient;

	useEffect(() => {
		if (foundClient) {
			orderState.updateCustomer({
				id: foundClient.id,
				nome: foundClient.nome,
				telefone: foundClient.telefone,
			});
			setNome(foundClient.nome || "");
		} else if (normalizedPhone.length >= 10 && !isLookingUp) {
			orderState.updateCustomer({
				id: null,
				telefone: normalizedPhone,
			});
		}
	}, [foundClient, normalizedPhone, isLookingUp]);

	const handlePhoneChange = (value: string) => {
		const formatted = formatToPhone(value);
		setTelefone(formatted);
	};

	const handleSubmit = () => {
		orderState.updateCustomer({
			telefone: normalizedPhone,
			nome: nome.trim() || null,
			cpfCnpj: cpfCnpj.trim() || null,
		});
		onNext();
	};

	const canProceed =
		normalizedPhone.length >= 10 && !isLookingUp && (foundClient || nome.trim().length > 0);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3">
				<Label htmlFor="telefone" className="font-semibold">
					Telefone
				</Label>
				<div className="relative">
					<Input
						id="telefone"
						type="tel"
						inputMode="numeric"
						placeholder="(00) 00000-0000"
						value={telefone}
						onChange={(e) => handlePhoneChange(e.target.value)}
						className="h-12 text-base"
					/>
					{isLookingUp && (
						<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
					)}
					{foundClient && (
						<Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
					)}
				</div>
			</div>

			{foundClient && (
				<div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
					<div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
						<User className="w-6 h-6 text-green-600 dark:text-green-400" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-green-900 dark:text-green-100">{foundClient.nome}</p>
						<p className="text-sm text-green-700 dark:text-green-300">{formatToPhone(foundClient.telefone)}</p>
					</div>
				</div>
			)}

			{needsName && (
				<div className="flex flex-col gap-4 p-4 rounded-xl bg-muted/50 border">
					<p className="text-sm text-muted-foreground">
						Nao encontramos seu cadastro. Por favor, complete seus dados.
					</p>

					<div className="flex flex-col gap-3">
						<Label htmlFor="nome" className="font-semibold">
							Nome <span className="text-red-500">*</span>
						</Label>
						<Input
							id="nome"
							placeholder="Seu nome completo"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
							className="h-12 text-base"
						/>
					</div>

					<div className="flex flex-col gap-3">
						<Label htmlFor="cpfCnpj" className="font-semibold">
							CPF/CNPJ <span className="text-xs text-muted-foreground">(opcional)</span>
						</Label>
						<Input
							id="cpfCnpj"
							placeholder="000.000.000-00"
							value={cpfCnpj}
							onChange={(e) => setCpfCnpj(e.target.value)}
							className="h-12 text-base"
						/>
					</div>
				</div>
			)}

			<Button
				className={cn("w-full h-12 rounded-xl font-bold mt-auto", !canProceed && "opacity-50")}
				onClick={handleSubmit}
				disabled={!canProceed}
			>
				Continuar
			</Button>
		</div>
	);
}
