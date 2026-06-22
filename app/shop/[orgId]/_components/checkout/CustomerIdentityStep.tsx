"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { useClientByLookup } from "@/lib/queries/clients";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "../ShopProvider";

type CustomerIdentityStepProps = {
	onNext: () => void;
};

export default function CustomerIdentityStep({ onNext }: CustomerIdentityStepProps) {
	const { orgId, orderState } = useShop();
	const { customer } = orderState.state;

	const [nome, setNome] = useState(customer.nome || "");
	const [cpfCnpj, setCpfCnpj] = useState(customer.cpfCnpj || "");

	const {
		data: client,
		isLoading: isLookingUp,
		isSuccess,
		params,
		updateParams,
	} = useClientByLookup({
		initialParams: {
			orgId,
			phone: customer.telefone ? formatToPhone(customer.telefone) : "",
			clientId: null,
		},
	});

	useEffect(() => {
		if (isSuccess && client) {
			orderState.updateCustomer({
				id: client.id,
				nome: client.nome,
				telefone: client.telefone,
			});
		} else if (isSuccess && !client && params.phone.length === 15) {
			orderState.updateCustomer({
				id: null,
				telefone: params.phone.replace(/\D/g, ""),
			});
		}
	}, [isSuccess, client, params.phone]);

	const showFoundCard = isSuccess && !!client;
	const showNewClientForm = isSuccess && !client && params.phone.length === 15;

	const handleSubmitExisting = () => {
		onNext();
	};

	const handleSubmitNew = () => {
		orderState.updateCustomer({
			telefone: params.phone.replace(/\D/g, ""),
			nome: nome.trim() || null,
			cpfCnpj: cpfCnpj.trim() || null,
		});
		onNext();
	};

	return (
		<AnimatePresence mode="wait">
			{showFoundCard ? (
				<motion.div
					key="profile-card"
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.9 }}
					transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
					className="flex w-full flex-col items-center gap-5 rounded-3xl border-2 border-brand/20 bg-brand/5 p-6"
				>
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }} className="text-center">
						<motion.p
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.15, type: "spring", stiffness: 500, damping: 25 }}
							className="mb-1 text-xs font-bold uppercase tracking-widest text-brand"
						>
							✓ PERFIL ENCONTRADO
						</motion.p>
						<p className="font-black text-2xl uppercase italic text-brand">{client!.nome}</p>
						<p className="font-bold text-brand">{formatToPhone(client!.telefone)}</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.25, duration: 0.3 }}
						className="flex w-full flex-col gap-2"
					>
						<Button variant="brand" className="h-12 w-full rounded-2xl font-black text-base" onClick={handleSubmitExisting}>
							CONTINUAR
							<ArrowRight className="ml-1 h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							className="w-full text-brand hover:bg-brand/10 hover:text-brand/80"
							onClick={() => updateParams({ phone: "", clientId: null })}
						>
							USAR OUTRO TELEFONE
						</Button>
					</motion.div>
				</motion.div>
			) : (
				<motion.div
					key="input-form"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: 20 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="flex w-full flex-col gap-5"
				>
					<div className="flex flex-col gap-2">
						<Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Número do WhatsApp</Label>
						<div className="relative">
							<Input
								type="tel"
								inputMode="numeric"
								placeholder="(00) 00000-0000"
								value={params.phone}
								onChange={(e) => updateParams({ phone: formatToPhone(e.target.value) })}
								className="h-12 pr-10 text-base"
								onFocus={(e) => {
									setTimeout(() => {
										e.target.scrollIntoView({ behavior: "smooth", block: "center" });
									}, 300);
								}}
							/>
							<AnimatePresence>
								{isLookingUp && (
									<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute right-3 top-1/2 -translate-y-1/2">
										<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>

					<AnimatePresence>
						{isLookingUp && (
							<motion.div
								initial={{ opacity: 0, y: -8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
							>
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Buscando registros...</span>
							</motion.div>
						)}
					</AnimatePresence>

					<AnimatePresence>
						{showNewClientForm && (
							<motion.div
								key="new-client-form"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 10 }}
								transition={{ duration: 0.3, ease: "easeOut" }}
								className="flex flex-col gap-4 rounded-2xl border bg-muted/50 p-4"
							>
								<p className="text-pretty text-sm text-muted-foreground">Parece que você ainda não tem um cadastro. Preencha seus dados para continuar.</p>

								<div className="flex flex-col gap-2">
									<Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
										Nome <span className="text-red-500">*</span>
									</Label>
									<Input
										placeholder="Seu nome completo"
										value={nome}
										onChange={(e) => setNome(e.target.value)}
										className="h-12 text-base"
										onFocus={(e) => {
											setTimeout(() => {
												e.target.scrollIntoView({ behavior: "smooth", block: "center" });
											}, 300);
										}}
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
										CPF/CNPJ <span className="text-xs font-normal normal-case text-muted-foreground">(opcional)</span>
									</Label>
									<Input
										placeholder="000.000.000-00"
										value={cpfCnpj}
										onChange={(e) => setCpfCnpj(formatToCPForCNPJ(e.target.value))}
										inputMode="numeric"
										className="h-12 text-base"
										onFocus={(e) => {
											setTimeout(() => {
												e.target.scrollIntoView({ behavior: "smooth", block: "center" });
											}, 300);
										}}
									/>
								</div>

								<Button variant="brand" className="h-12 w-full rounded-2xl font-black" onClick={handleSubmitNew} disabled={!nome.trim()}>
									CONTINUAR
									<ArrowRight className="ml-1 h-4 w-4" />
								</Button>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
