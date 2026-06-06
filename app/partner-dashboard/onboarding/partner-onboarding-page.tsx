"use client";

import TextInput from "@/components/Inputs/TextInput";
import CheckboxInput from "@/components/Inputs/CheckboxInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getErrorMessage } from "@/lib/errors";
import { formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { createPlatformPartnerOnboarding } from "@/lib/mutations/platform-partnerships";
import { usePlatformPartnerOnboardingState } from "@/state-hooks/use-platform-partner-onboarding-state";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, FileCheck2, Handshake, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PartnerOnboardingPage({ user }: { user: TAuthUserSession["user"] }) {
	const router = useRouter();
	const { state, updatePartner } = usePlatformPartnerOnboardingState({
		initialState: {
			partner: {
				nome: user.nome,
				email: user.email,
				telefone: user.telefone,
				cpfCnpj: "",
				chavePix: "",
				arquivos: {},
				aceiteTermos: false,
			},
		},
	});

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-platform-partner-onboarding"],
		mutationFn: createPlatformPartnerOnboarding,
		onSuccess: (data) => {
			toast.success(data.message);
			router.push("/partner-dashboard");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-8">
			<section className="grid w-full overflow-hidden rounded-lg border border-border bg-background lg:grid-cols-[0.85fr_1.15fr]">
				<div className="flex flex-col justify-between border-b border-border bg-brand p-8 text-brand-foreground lg:border-b-0 lg:border-r">
					<div className="space-y-4">
						<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-foreground text-brand">
							<Handshake className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.18em]">Programa de Parcerias</p>
							<h1 className="mt-2 text-3xl font-semibold tracking-tight">Complete seu cadastro.</h1>
						</div>
						<p className="text-sm leading-relaxed text-zinc-800">
							Depois do envio, nosso financeiro valida seus dados. Seu painel completo sera liberado quando o cadastro for aprovado.
						</p>
					</div>
					<div className="mt-10 grid gap-3 text-sm">
						<div className="flex items-center gap-2">
							<FileCheck2 className="h-4 w-4" />
							Documentos e aceite
						</div>
						<div className="flex items-center gap-2">
							<Landmark className="h-4 w-4" />
							Pagamento manual via PIX
						</div>
					</div>
				</div>
				<form
					className="grid gap-4 p-6 md:p-8"
					onSubmit={(event) => {
						event.preventDefault();
						mutate({ partner: state.partner });
					}}
				>
					<div className="grid gap-3 md:grid-cols-2">
						<TextInput value={state.partner.nome} label="NOME" placeholder="Seu nome" handleChange={(value) => updatePartner({ nome: value })} required />
						<TextInput
							value={state.partner.email}
							label="EMAIL"
							placeholder="seu@email.com"
							handleChange={(value) => updatePartner({ email: value })}
							required
						/>
						<TextInput
							value={state.partner.telefone}
							label="TELEFONE"
							placeholder="(00) 00000-0000"
							handleChange={(value) => updatePartner({ telefone: formatToPhone(value) })}
							required
						/>
						<TextInput
							value={state.partner.cpfCnpj}
							label="CPF OU CNPJ"
							placeholder="Documento"
							handleChange={(value) => updatePartner({ cpfCnpj: formatToCPForCNPJ(value) })}
							required
						/>
						<div className="md:col-span-2">
							<TextInput
								value={state.partner.chavePix}
								label="CHAVE PIX"
								placeholder="CPF, CNPJ, email, telefone ou chave aleatoria"
								handleChange={(value) => updatePartner({ chavePix: value })}
								required
							/>
						</div>
						<TextInput
							value={state.partner.arquivos.cpf ?? ""}
							label="URL DO CPF"
							placeholder="https://..."
							handleChange={(value) => updatePartner({ arquivos: { ...state.partner.arquivos, cpf: value || undefined } })}
						/>
						<TextInput
							value={state.partner.arquivos.cnpj ?? ""}
							label="URL DO CNPJ"
							placeholder="https://..."
							handleChange={(value) => updatePartner({ arquivos: { ...state.partner.arquivos, cnpj: value || undefined } })}
						/>
					</div>
					<CheckboxInput
						checked={state.partner.aceiteTermos}
						handleChange={(checked) => updatePartner({ aceiteTermos: checked === true })}
						labelTrue="Declaro que os dados informados são verdadeiros e aceito os termos do programa de parcerias."
						labelFalse="Declaro que os dados informados são verdadeiros e aceito os termos do programa de parcerias."
					/>
					<Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
						ENVIAR CADASTRO
						<ArrowRight className="h-4 w-4" />
					</Button>
				</form>
			</section>
		</main>
	);
}
