"use client";

import { resolveNativeCustomField } from "@/lib/custom-fields/native-catalog";
import type { TPoiRegistrationFieldDefinition } from "@/lib/point-of-interaction/registration";
import type { TCustomFieldOption } from "@/schemas/custom-fields";
import { AlertCircle } from "lucide-react";
import { ChoiceGroup, DateEntry, HouseholdSelector, MultiChoiceGrid, NumberEntry, TextEntry } from "./field-inputs";
import type { TRegistrationAnswerDraft } from "./registration-answers";

/**
 * Completa `icone` e `legenda` das opções com o que o catálogo nativo diz sobre aquele `valor`.
 *
 * As opções de um campo são copiadas do catálogo para `custom_fields.opcoes` no momento em que a
 * organização ativa o campo — e ficam congeladas ali. Sem esta costura, melhorar a iconografia de um
 * campo nativo só valeria para quem criasse o campo depois, e todas as organizações que já ativaram
 * "Gênero" continuariam com o círculo neutro. O que a organização escreveu vence sempre: só o vazio
 * é preenchido.
 */
function resolveOptionsWithNativeMetadata(campo: TPoiRegistrationFieldDefinition): TCustomFieldOption[] {
	const opcoes = campo.opcoes ?? [];
	const nativeOptions = resolveNativeCustomField(campo.chaveNativa)?.opcoes;
	if (!nativeOptions || nativeOptions.length === 0) return opcoes;

	return opcoes.map((opcao) => {
		if (opcao.icone && opcao.legenda) return opcao;
		const nativeOption = nativeOptions.find((item) => item.valor === opcao.valor);
		if (!nativeOption) return opcao;
		return { ...opcao, icone: opcao.icone || nativeOption.icone, legenda: opcao.legenda || nativeOption.legenda };
	});
}

type RegistrationFieldRendererProps = {
	campo: TPoiRegistrationFieldDefinition;
	draft: TRegistrationAnswerDraft | undefined;
	onChange: (draft: TRegistrationAnswerDraft) => void;
	isKiosk: boolean;
};

/**
 * Escolhe o widget de um passo do assistente.
 *
 * Duas camadas, nesta ordem: um renderizador curado por `chaveNativa` (o campo que a plataforma
 * conhece de fábrica e merece um desenho próprio) e, na ausência dele, o renderizador genérico do
 * `tipo`. É o que permite a uma organização criar um campo qualquer e ele funcionar no balcão sem
 * ninguém escrever código — enquanto "pessoas na casa" ganha o stepper com bonecos.
 */
export function RegistrationFieldRenderer({ campo, draft, onChange, isKiosk }: RegistrationFieldRendererProps) {
	const opcoes = resolveOptionsWithNativeMetadata(campo);
	const singleValue = typeof draft === "string" ? draft : null;
	const multipleValues = Array.isArray(draft) ? draft : [];
	const textValue = typeof draft === "string" ? draft : "";

	// Um campo de escolha sem opções não tem resposta possível — qualquer valor seria recusado no
	// servidor. Avisa e deixa passar, em vez de trancar o cliente num passo sem saída.
	if ((campo.tipo === "ESCOLHA_UNICA" || campo.tipo === "ESCOLHA_MULTIPLA") && opcoes.length === 0) {
		return (
			<div className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-3.5">
				<AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
				<p className="text-sm font-medium text-muted-foreground">Este campo ainda não tem opções configuradas. Você pode seguir para o próximo passo.</p>
			</div>
		);
	}

	// ===== Renderizadores curados (por campo nativo) =====
	switch (campo.chaveNativa) {
		case "household-size":
			return <HouseholdSelector legend={campo.titulo} opcoes={opcoes} value={singleValue} onChange={onChange} />;
		case "birth-date":
			return <DateEntry label={campo.titulo} description={campo.descricao} value={textValue} onChange={onChange} isKiosk={isKiosk} />;
		case "email":
			return (
				<TextEntry
					label={campo.titulo}
					description={campo.descricao}
					placeholder="nome@email.com"
					value={textValue}
					onChange={onChange}
					isKiosk={isKiosk}
					inputMode="email"
				/>
			);
		case "gender":
		case "has-children":
			return <ChoiceGroup legend={campo.titulo} opcoes={opcoes} value={singleValue} onChange={onChange} isKiosk={isKiosk} />;
		default:
			break;
	}

	// ===== Renderizadores genéricos (por tipo) =====
	switch (campo.tipo) {
		case "ESCOLHA_UNICA":
			return <ChoiceGroup legend={campo.titulo} opcoes={opcoes} value={singleValue} onChange={onChange} isKiosk={isKiosk} />;
		case "ESCOLHA_MULTIPLA":
			return (
				<MultiChoiceGrid
					legend={campo.titulo}
					opcoes={opcoes}
					values={multipleValues}
					onToggle={(valor) => onChange(multipleValues.includes(valor) ? multipleValues.filter((item) => item !== valor) : [...multipleValues, valor])}
					isKiosk={isKiosk}
				/>
			);
		case "NUMERO":
			return (
				<NumberEntry label={campo.titulo} description={campo.descricao} placeholder="Digite o número" value={textValue} onChange={onChange} isKiosk={isKiosk} />
			);
		case "DATA":
			return <DateEntry label={campo.titulo} description={campo.descricao} value={textValue} onChange={onChange} isKiosk={isKiosk} />;
		default:
			return (
				<TextEntry label={campo.titulo} description={campo.descricao} placeholder="Digite aqui" value={textValue} onChange={onChange} isKiosk={isKiosk} />
			);
	}
}
