"use client";

import { Input } from "@/components/ui/input";
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import { formatToCPForCNPJ } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TCustomFieldOption } from "@/schemas/custom-fields";
import { Check, Minus, Plus, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import { formatDateDigits } from "../helpers/date-digits";
import { resolveRegistrationOptionIcon } from "./registration-icons";

// Acima disto o stepper de moradores vira uma fileira de bonecos ilegível; o número continua
// exato no rótulo, só o desenho para de crescer.
const MAX_HOUSEHOLD_AVATARS = 5;

// Paleta dos cartões de escolha, tirada das variáveis do tema do POI (`lib/point-of-interaction/
// theme.ts`) e não de hexadecimais: a mesma marcação serve qualquer organização.
const CHOICE_SELECTED_CARD_STYLE: CSSProperties = { borderColor: "var(--poi-primary)", backgroundColor: "var(--poi-tint)" };
const CHOICE_ICON_CHIP_STYLE: CSSProperties = { backgroundColor: "var(--poi-tint)", color: "var(--poi-primary)" };
// O chip do ícone vira sólido quando o cartão é escolhido — o fundo do cartão passou a ser a
// própria lavagem clara, e um chip claro sobre fundo claro sumiria.
const CHOICE_SELECTED_ICON_CHIP_STYLE: CSSProperties = { backgroundColor: "var(--poi-primary)", color: "var(--poi-primary-foreground)" };
const CHOICE_SELECTED_MARKER_STYLE: CSSProperties = {
	borderColor: "var(--poi-primary)",
	backgroundColor: "var(--poi-primary)",
	color: "var(--poi-primary-foreground)",
};

type ChoiceCardProps = {
	opcao: TCustomFieldOption;
	isSelected: boolean;
	isKiosk: boolean;
	/** Redondo na escolha única, quadrado na múltipla — a gramática de rádio e de caixa de seleção. */
	marker: "radio" | "checkbox";
	onSelect: () => void;
};

/**
 * Cartão de uma opção: chip do ícone, título, legenda e o marcador de escolha no canto.
 *
 * O cartão escolhido ganha borda e lavagem da marca, não um preenchimento sólido: preencher o
 * cartão inteiro obrigaria título, legenda e ícone a inverter de cor ao mesmo tempo, e o que era um
 * conjunto legível de opções vira um bloco de cor com texto invertido no meio da lista.
 */
function ChoiceCard({ opcao, isSelected, isKiosk, marker, onSelect }: ChoiceCardProps) {
	const OptionIcon = resolveRegistrationOptionIcon(opcao.icone);
	return (
		<button
			type="button"
			aria-pressed={isSelected}
			onClick={onSelect}
			style={isSelected ? CHOICE_SELECTED_CARD_STYLE : undefined}
			className={cn(
				"group rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98] motion-reduce:active:scale-100",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
				isKiosk ? "min-h-[6rem] short:min-h-[5rem]" : "min-h-[5.25rem]",
				isSelected
					? "poi-choice-selected shadow-sm"
					: "border-border bg-card hover:-translate-y-0.5 hover:border-brand/50 motion-reduce:hover:translate-y-0",
			)}
		>
			<span className="flex items-start justify-between">
				<span
					style={isSelected ? CHOICE_SELECTED_ICON_CHIP_STYLE : CHOICE_ICON_CHIP_STYLE}
					className="flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors"
				>
					<OptionIcon className="size-5" />
				</span>
				<span
					style={isSelected ? CHOICE_SELECTED_MARKER_STYLE : undefined}
					className={cn(
						"flex size-5 shrink-0 items-center justify-center border transition-all",
						marker === "radio" ? "rounded-full" : "rounded-md",
						isSelected ? "poi-choice-selected" : "border-border text-transparent",
					)}
				>
					<Check className="size-3.5" strokeWidth={3} />
				</span>
			</span>
			<span className={cn("mt-2 block font-extrabold text-foreground", isKiosk ? "text-base" : "text-sm")}>{opcao.titulo}</span>
			{opcao.legenda ? <span className="mt-0.5 block text-[0.68rem] font-medium text-muted-foreground">{opcao.legenda}</span> : null}
		</button>
	);
}

type ChoiceGroupProps = {
	legend: string;
	opcoes: TCustomFieldOption[];
	value: string | null;
	onChange: (valor: string) => void;
	isKiosk: boolean;
};

/**
 * Escolha única em cartões: duas colunas, ícone e legenda por opção.
 *
 * `aria-pressed` em vez de radio nativo — o cartão é grande, tocável com o polegar e já comunica o
 * estado visualmente; o `fieldset`/`legend` mantém o grupo anunciado por leitor de tela.
 */
export function ChoiceGroup({ legend, opcoes, value, onChange, isKiosk }: ChoiceGroupProps) {
	return (
		<fieldset className="w-full">
			<legend className="sr-only">{legend}</legend>
			<div className="grid grid-cols-2 gap-2.5">
				{opcoes.map((opcao) => (
					<ChoiceCard
						key={opcao.valor}
						opcao={opcao}
						isSelected={value === opcao.valor}
						isKiosk={isKiosk}
						marker="radio"
						onSelect={() => onChange(opcao.valor)}
					/>
				))}
			</div>
		</fieldset>
	);
}

type MultiChoiceGridProps = {
	legend: string;
	opcoes: TCustomFieldOption[];
	values: string[];
	onToggle: (valor: string) => void;
	isKiosk: boolean;
};

/** Escolha múltipla: mesmos cartões, sem limite de seleção e com dica de que dá para marcar vários. */
export function MultiChoiceGrid({ legend, opcoes, values, onToggle, isKiosk }: MultiChoiceGridProps) {
	return (
		<fieldset className="w-full">
			<legend className="sr-only">{legend}</legend>
			<p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pode escolher mais de uma</p>
			<div className="grid grid-cols-2 gap-2.5">
				{opcoes.map((opcao) => (
					<ChoiceCard
						key={opcao.valor}
						opcao={opcao}
						isSelected={values.includes(opcao.valor)}
						isKiosk={isKiosk}
						marker="checkbox"
						onSelect={() => onToggle(opcao.valor)}
					/>
				))}
			</div>
		</fieldset>
	);
}

type HouseholdSelectorProps = {
	legend: string;
	opcoes: TCustomFieldOption[];
	value: string | null;
	onChange: (valor: string) => void;
};

/**
 * Stepper de moradores: −/+ com bonecos animados e uma fileira de atalhos.
 *
 * Dirigido pelas `opcoes` do campo, não por uma lista fixa: a organização pode editar os degraus
 * ("1".."5+" é só a semente do catálogo nativo) e o seletor acompanha.
 */
export function HouseholdSelector({ legend, opcoes, value, onChange }: HouseholdSelectorProps) {
	const selectedIndex = opcoes.findIndex((opcao) => opcao.valor === value);
	const selectedOption = selectedIndex >= 0 ? opcoes[selectedIndex] : null;
	// O rótulo pode ser "5 ou mais": conta os dígitos iniciais para desenhar os bonecos.
	const parsedCount = selectedOption ? Number.parseInt(selectedOption.valor, 10) : Number.NaN;
	const peopleCount = Number.isFinite(parsedCount) ? Math.min(Math.max(parsedCount, 0), MAX_HOUSEHOLD_AVATARS) : 0;
	const hasOverflowMark = Boolean(selectedOption && /\+|ou mais/i.test(`${selectedOption.valor} ${selectedOption.titulo}`));

	const move = (direction: -1 | 1) => {
		const nextIndex = selectedIndex === -1 ? 0 : Math.max(0, Math.min(opcoes.length - 1, selectedIndex + direction));
		const nextOption = opcoes[nextIndex];
		if (nextOption) onChange(nextOption.valor);
	};

	return (
		<fieldset className="w-full">
			<legend className="sr-only">{legend}</legend>
			<div className="overflow-hidden rounded-3xl border-2 border-border bg-card">
				<div className="flex min-h-24 items-center justify-between gap-4 px-4 py-4">
					<button
						type="button"
						onClick={() => move(-1)}
						disabled={selectedIndex <= 0}
						aria-label="Diminuir quantidade"
						className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-border text-brand transition-colors hover:bg-brand/10 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
					>
						<Minus className="size-5" />
					</button>

					<div className="min-w-0 flex-1 text-center">
						<div className="flex h-10 items-end justify-center -space-x-1.5" aria-hidden="true">
							{peopleCount === 0 ? (
								<UserRound className="size-8 text-muted-foreground/40" strokeWidth={1.6} />
							) : (
								Array.from({ length: peopleCount }).map((_, avatarIndex) => (
									<span
										// biome-ignore lint/suspicious/noArrayIndexKey: grupo decorativo de tamanho fixo
										key={avatarIndex}
										className="poi-person-pop flex size-8 items-center justify-center rounded-full border-2 border-card bg-brand/15 text-brand"
										style={{ animationDelay: `${avatarIndex * 45}ms` }}
									>
										<UserRound className={avatarIndex % 2 ? "size-4" : "size-[1.15rem]"} strokeWidth={2} />
									</span>
								))
							)}
							{hasOverflowMark ? (
								<span className="poi-person-pop flex size-8 items-center justify-center rounded-full border-2 border-card bg-brand text-xs font-black text-brand-foreground">
									+
								</span>
							) : null}
						</div>
						<p className="mt-1 text-lg font-black text-foreground">{selectedOption?.titulo ?? "—"}</p>
					</div>

					<button
						type="button"
						onClick={() => move(1)}
						disabled={selectedIndex === opcoes.length - 1}
						aria-label="Aumentar quantidade"
						className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
					>
						<Plus className="size-5" />
					</button>
				</div>

				<div className="grid gap-1 border-t border-border bg-muted/40 p-2" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}>
					{opcoes.map((opcao) => (
						<button
							key={opcao.valor}
							type="button"
							aria-pressed={value === opcao.valor}
							onClick={() => onChange(opcao.valor)}
							className={cn(
								"min-h-9 truncate rounded-xl px-1 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
								value === opcao.valor ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-card",
							)}
						>
							{opcao.valor}
						</button>
					))}
				</div>
			</div>
		</fieldset>
	);
}

type TextEntryProps = {
	label: string;
	description: string | null;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	isKiosk: boolean;
	inputMode?: "text" | "email";
};

/** Texto livre: teclado virtual no balcão, teclado do sistema no celular do cliente. */
export function TextEntry({ label, description, placeholder, value, onChange, isKiosk, inputMode = "text" }: TextEntryProps) {
	if (isKiosk) {
		return (
			<VirtualKeyboard
				type="text"
				label={label}
				description={description ?? undefined}
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				confirmLabel="Confirmar"
				triggerClassName="h-16 short:h-14 justify-start text-left px-4 rounded-2xl border-2 border-border bg-card text-base font-medium"
			/>
		);
	}
	return (
		<Input
			type={inputMode === "email" ? "email" : "text"}
			inputMode={inputMode === "email" ? "email" : "text"}
			autoComplete={inputMode === "email" ? "email" : "off"}
			placeholder={placeholder}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			className="h-14 rounded-2xl border-2 border-border bg-card px-4 text-base"
		/>
	);
}

type NumberEntryProps = {
	label: string;
	description: string | null;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	isKiosk: boolean;
};

/**
 * Número. No quiosque o teclado virtual só produz dígitos — inteiros, portanto; no celular o campo
 * aceita a vírgula decimal que o cliente brasileiro digita (normalizada na hora de montar o payload).
 */
export function NumberEntry({ label, description, placeholder, value, onChange, isKiosk }: NumberEntryProps) {
	if (isKiosk) {
		return (
			<VirtualKeyboard
				type="numeric"
				label={label}
				description={description ?? undefined}
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				maxLength={12}
				confirmLabel="Confirmar"
				triggerClassName="h-16 short:h-14 justify-start text-left px-4 rounded-2xl border-2 border-border bg-card text-base font-medium"
			/>
		);
	}
	return (
		<Input
			type="text"
			inputMode="decimal"
			placeholder={placeholder}
			value={value}
			onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, "").slice(0, 12))}
			className="h-14 rounded-2xl border-2 border-border bg-card px-4 text-base"
		/>
	);
}

type DocumentEntryProps = {
	label: string;
	description: string | null;
	/** Dígitos crus do CPF/CNPJ — a máscara é só de exibição. */
	value: string;
	onChange: (digits: string) => void;
	isKiosk: boolean;
	/** Documento incompleto não é documento errado: a borda só acusa quando o dígito verificador cai. */
	isInvalid: boolean;
};

/**
 * CPF ou CNPJ na mesma entrada: o que decide é a quantidade de dígitos, então não há alternador de
 * tipo para o cliente errar. Mesma gramática do `DateEntry` — dígitos no rascunho, máscara na tela.
 */
export function DocumentEntry({ label, description, value, onChange, isKiosk, isInvalid }: DocumentEntryProps) {
	if (isKiosk) {
		return (
			<VirtualKeyboard
				type="numeric"
				label={label}
				description={description ?? "Digite apenas os números do documento."}
				placeholder="Digite o CPF/CNPJ"
				value={value}
				onChange={onChange}
				maxLength={14}
				formatValue={formatToCPForCNPJ}
				confirmLabel="Confirmar documento"
				triggerClassName={cn(
					"h-16 short:h-14 justify-start text-left px-4 rounded-2xl border-2 border-border bg-card text-base font-medium",
					isInvalid && "border-destructive",
				)}
			/>
		);
	}
	return (
		<Input
			type="text"
			inputMode="numeric"
			placeholder="000.000.000-00"
			value={formatToCPForCNPJ(value)}
			onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 14))}
			className={cn("h-14 rounded-2xl border-2 border-border bg-card px-4 text-base tabular-nums", isInvalid && "border-destructive")}
		/>
	);
}

type DateEntryProps = {
	label: string;
	description: string | null;
	/** Dígitos crus DDMMAAAA — a formatação é só de exibição. */
	value: string;
	onChange: (digits: string) => void;
	isKiosk: boolean;
};

/**
 * Data em oito dígitos (DD/MM/AAAA), nas duas superfícies.
 *
 * Sem `<input type="date">` de propósito: o seletor nativo obriga o cliente a navegar décadas para
 * trás para chegar ao ano de nascimento, enquanto oito dígitos são uma frase que ele já sabe de cor.
 */
export function DateEntry({ label, description, value, onChange, isKiosk }: DateEntryProps) {
	if (isKiosk) {
		return (
			<VirtualKeyboard
				type="numeric"
				label={label}
				description={description ?? "Digite dia, mês e ano (DD/MM/AAAA)."}
				placeholder="DD/MM/AAAA"
				value={value}
				onChange={onChange}
				maxLength={8}
				formatValue={formatDateDigits}
				confirmLabel="Confirmar data"
				triggerClassName="h-16 short:h-14 justify-start text-left px-4 rounded-2xl border-2 border-border bg-card text-base font-medium"
			/>
		);
	}
	return (
		<Input
			type="text"
			inputMode="numeric"
			autoComplete="bday"
			placeholder="DD/MM/AAAA"
			value={formatDateDigits(value)}
			onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 8))}
			className="h-14 rounded-2xl border-2 border-border bg-card px-4 text-base tabular-nums"
		/>
	);
}
