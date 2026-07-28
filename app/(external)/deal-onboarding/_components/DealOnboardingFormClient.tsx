"use client";

import { LoadingButton } from "@/components/loading-button";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import { getErrorMessage } from "@/lib/errors";
import { formatToCNPJ, formatToPhone } from "@/lib/formatting";
import { submitDealOnboarding } from "@/lib/mutations/deal-onboarding";
import { isValidCNPJ } from "@/lib/validation";
import type { TDealOnboardingField, TDealOnboardingFormAnswers, TDealOnboardingFormStructure } from "@/schemas/deal-onboarding";
import { useMutation } from "@tanstack/react-query";
import { Building2, ClipboardList, Save, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type DealOnboardingFormClientProps = {
	token: string;
	estrutura: TDealOnboardingFormStructure;
	respostasIniciais: TDealOnboardingFormAnswers;
	quantidadeLicencas: number;
};

// Reconcilia o rascunho salvo com a quantidade atual de licenças do deal: seções extras
// são descartadas e faltantes entram vazias (a contagem nunca fica congelada no JSONB).
function seedAnswers(respostasIniciais: TDealOnboardingFormAnswers, quantidadeLicencas: number): TDealOnboardingFormAnswers {
	const organizacoes = Array.from({ length: quantidadeLicencas }, (_, index) => respostasIniciais.organizacoes[index] ?? {});
	return { gerais: { ...respostasIniciais.gerais }, organizacoes };
}

function applyFieldMask(campo: TDealOnboardingField, value: string) {
	if (campo.tipo === "TELEFONE") return formatToPhone(value);
	if (campo.tipo === "CNPJ") return formatToCNPJ(value);
	return value;
}

export function DealOnboardingFormClient({ token, estrutura, respostasIniciais, quantidadeLicencas }: DealOnboardingFormClientProps) {
	const [answers, setAnswers] = useState<TDealOnboardingFormAnswers>(() => seedAnswers(respostasIniciais, quantidadeLicencas));

	const camposGerais = estrutura.campos.filter((campo) => campo.escopo === "GERAL");
	const camposOrganizacao = estrutura.campos.filter((campo) => campo.escopo === "ORGANIZACAO");

	const updateGeneralAnswer = useCallback((chave: string, value: string) => {
		setAnswers((prev) => ({ ...prev, gerais: { ...prev.gerais, [chave]: value } }));
	}, []);

	const updateOrganizationAnswer = useCallback((index: number, chave: string, value: string) => {
		setAnswers((prev) => ({
			...prev,
			organizacoes: prev.organizacoes.map((section, sectionIndex) => (sectionIndex === index ? { ...section, [chave]: value } : section)),
		}));
	}, []);

	const { mutate: saveDraft, isPending: isSavingDraft } = useMutation({
		mutationKey: ["deal-onboarding-draft", token],
		mutationFn: () => submitDealOnboarding({ acao: "SALVAR_RASCUNHO", token, respostas: answers }),
		onSuccess: (data) => toast.success(data.message),
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const { mutate: sendForm, isPending: isSending } = useMutation({
		mutationKey: ["deal-onboarding-submit", token],
		mutationFn: () => submitDealOnboarding({ acao: "ENVIAR", token, respostas: answers }),
		onSuccess: (data) => {
			toast.success(data.message);
			if (data.data.checkoutUrl) window.location.assign(data.data.checkoutUrl);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Checagem client-side antes do envio (o servidor continua sendo a autoridade).
	const handleSend = useCallback(() => {
		function sectionError(campos: TDealOnboardingField[], section: Record<string, string>, sectionLabel: string): string | null {
			for (const campo of campos) {
				const value = (section[campo.chave] ?? "").trim();
				if (campo.obrigatorio && value.length === 0) return `${sectionLabel}: preencha o campo "${campo.rotulo}".`;
				if (value.length > 0 && campo.tipo === "CNPJ" && !isValidCNPJ(value)) return `${sectionLabel}: o CNPJ informado é inválido.`;
			}
			return null;
		}

		const generalError = sectionError(camposGerais, answers.gerais, "Dados gerais");
		if (generalError) return toast.error(generalError);
		for (let index = 0; index < answers.organizacoes.length; index++) {
			const orgError = sectionError(camposOrganizacao, answers.organizacoes[index], `Empresa ${index + 1}`);
			if (orgError) return toast.error(orgError);
		}
		sendForm();
	}, [answers, camposGerais, camposOrganizacao, sendForm]);

	function renderField(campo: TDealOnboardingField, value: string, onChange: (value: string) => void) {
		if (campo.tipo === "TEXTO_LONGO") {
			return (
				<TextareaInput
					key={campo.chave}
					label={campo.rotulo}
					required={campo.obrigatorio}
					value={value}
					placeholder={campo.placeholder ?? campo.rotulo}
					handleChange={onChange}
				/>
			);
		}
		return (
			<TextInput
				key={campo.chave}
				label={campo.rotulo}
				required={campo.obrigatorio}
				value={value}
				placeholder={campo.placeholder ?? campo.rotulo}
				inputType={campo.tipo === "TELEFONE" ? "tel" : "text"}
				handleChange={(newValue) => onChange(applyFieldMask(campo, newValue))}
			/>
		);
	}

	const isBusy = isSavingDraft || isSending;

	return (
		<div className="flex flex-col gap-6 pb-24">
			{camposGerais.length > 0 ? (
				<section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4">
					<h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
						<ClipboardList className="h-3.5 w-3.5" />
						Dados gerais
					</h2>
					{camposGerais.map((campo) =>
						renderField(campo, answers.gerais[campo.chave] ?? "", (value) => updateGeneralAnswer(campo.chave, value)),
					)}
				</section>
			) : null}

			{answers.organizacoes.map((section, index) => (
				<section key={`organizacao-${index.toString()}`} className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4">
					<h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
						<Building2 className="h-3.5 w-3.5" />
						Empresa {index + 1} de {quantidadeLicencas}
					</h2>
					{camposOrganizacao.map((campo) =>
						renderField(campo, section[campo.chave] ?? "", (value) => updateOrganizationAnswer(index, campo.chave, value)),
					)}
				</section>
			))}

			<div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:justify-end">
					<LoadingButton variant="outline" loading={isSavingDraft} disabled={isBusy} onClick={() => saveDraft()}>
						<Save className="h-4 w-4 min-w-4 min-h-4" />
						SALVAR E CONTINUAR DEPOIS
					</LoadingButton>
					<LoadingButton loading={isSending} disabled={isBusy} onClick={handleSend}>
						<Send className="h-4 w-4 min-w-4 min-h-4" />
						ENVIAR E IR PARA O PAGAMENTO
					</LoadingButton>
				</div>
			</div>
		</div>
	);
}
