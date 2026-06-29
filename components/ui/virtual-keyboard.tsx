"use client";

import * as React from "react";
import { ArrowBigUp, Check, Delete, X } from "lucide-react";

import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";

/**
 * VirtualKeyboard
 *
 * Teclado virtual baseado no Sheet (abre por baixo) para preenchimento de dados em tablets,
 * onde o teclado nativo do sistema confunde os operadores do balcão.
 *
 * O campo em si vira um botão "showcase" (sem teclado do SO) que abre o sheet. No topo do sheet
 * há um preview do valor sendo preenchido; abaixo, o teclado adequado ao tipo:
 *  - "currency": teclado numérico com lógica de centavos da direita para a esquerda.
 *  - "numeric":  teclado numérico simples (PIN / senha do operador), valor como string de dígitos.
 *  - "text":     teclado QWERTY pt-BR (com camada de acentos) + linha numérica.
 *
 * Comportamento de commit: ao vivo. Cada tecla dispara onChange; o botão "Confirmar" apenas fecha.
 */

type BaseProps = {
	/** Título do campo, exibido no preview e usado como acessível para o sheet. */
	label: string;
	/** Texto auxiliar opcional exibido abaixo do título no preview. */
	description?: string;
	/** Placeholder mostrado no botão showcase e no preview quando vazio. */
	placeholder?: string;
	disabled?: boolean;
	/** Classe aplicada ao botão showcase, para imitar o input original. */
	triggerClassName?: string;
	/** Conteúdo customizado do botão showcase; por padrão mostra o valor formatado. */
	renderTrigger?: (args: { displayValue: string; isEmpty: boolean; open: () => void }) => React.ReactNode;
	confirmLabel?: string;
	/** Ícone/elemento inicial dentro do botão showcase. */
	leading?: React.ReactNode;
};

type CurrencyProps = BaseProps & {
	type: "currency";
	value: number;
	onChange: (value: number) => void;
	/** Casas decimais: 2 = reais com centavos (padrão), 0 = inteiro (ex.: pontos). */
	fractionDigits?: 0 | 2;
	/** Formata o valor no preview e no botão. Padrão: formatToMoney. */
	formatValue?: (value: number) => string;
	/** Botões de atalho que somam ao valor atual (ex.: [10, 25, 50, 100]). */
	quickAdd?: number[];
	/** Mostra o botão de limpar valor. */
	allowClear?: boolean;
};

type TextProps = BaseProps & {
	type: "text";
	value: string;
	onChange: (value: string) => void;
	maxLength?: number;
};

type NumericProps = BaseProps & {
	type: "numeric";
	value: string;
	onChange: (value: string) => void;
	maxLength?: number;
	formatValue?: (value: string) => string;
	/** Mascara o preview com pontos (senha). */
	secret?: boolean;
};

export type VirtualKeyboardProps = CurrencyProps | TextProps | NumericProps;

// ---------------------------------------------------------------------------
// Lógica de valor
// ---------------------------------------------------------------------------

function currencyScale(fractionDigits: 0 | 2): number {
	return fractionDigits === 0 ? 1 : 100;
}

function appendCurrencyDigit(value: number, digit: number, fractionDigits: 0 | 2): number {
	const scale = currencyScale(fractionDigits);
	const units = Math.round(value * scale);
	// Limita a 12 dígitos para evitar overflow visual.
	const next = Number(`${units}${digit}`.slice(0, 12));
	return next / scale;
}

function backspaceCurrency(value: number, fractionDigits: 0 | 2): number {
	const scale = currencyScale(fractionDigits);
	const units = Math.round(value * scale);
	return Math.floor(units / 10) / scale;
}

// ---------------------------------------------------------------------------
// Teclas
// ---------------------------------------------------------------------------

const DIGIT_ROWS: number[][] = [
	[1, 2, 3],
	[4, 5, 6],
	[7, 8, 9],
];

const QWERTY_LETTERS: string[][] = [
	["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
	["a", "s", "d", "f", "g", "h", "j", "k", "l"],
	["z", "x", "c", "v", "b", "n", "m"],
];

const QWERTY_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const ACCENT_ROWS: string[][] = [
	["á", "à", "â", "ã", "é", "ê", "í", "ó", "ô", "õ"],
	["ú", "ü", "ç", "-", "'", ".", ",", "?", "!", "@"],
];

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const KEY_BASE =
	"flex h-14 short:h-12 items-center justify-center rounded-xl border border-border bg-card text-xl font-bold text-foreground transition-transform select-none active:scale-95 active:bg-muted disabled:opacity-40 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

export function VirtualKeyboard(props: VirtualKeyboardProps) {
	const { label, description, placeholder, disabled, triggerClassName, renderTrigger, confirmLabel, leading } = props;
	const [open, setOpen] = React.useState(false);

	const displayValue = getDisplayValue(props);
	const isEmpty = getIsEmpty(props);
	const previewValue = getPreviewValue(props);

	const close = React.useCallback(() => setOpen(false), []);

	// Teclado físico (acessibilidade / desktop): mantém digitação funcional.
	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			const key = event.key;
			if (key === "Enter") {
				event.preventDefault();
				close();
				return;
			}
			if (key === "Backspace") {
				event.preventDefault();
				applyBackspace(props);
				return;
			}
			if (props.type === "text") {
				if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
					event.preventDefault();
					appendChar(props, key);
				}
				return;
			}
			// currency / numeric: apenas dígitos
			if (/^[0-9]$/.test(key)) {
				event.preventDefault();
				applyDigit(props, Number(key));
			}
		},
		[props, close],
	);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild disabled={disabled}>
				{renderTrigger ? (
					(renderTrigger({ displayValue, isEmpty, open: () => setOpen(true) }) as React.ReactElement)
				) : (
					<button
						type="button"
						disabled={disabled}
						aria-haspopup="dialog"
						className={cn(
							"flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-center font-bold text-foreground transition-colors hover:border-brand/40 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/15 disabled:pointer-events-none disabled:opacity-50",
							isEmpty && "text-muted-foreground",
							triggerClassName,
						)}
					>
						{leading}
						<span className="truncate">{isEmpty ? (placeholder ?? "Toque para preencher") : displayValue}</span>
					</button>
				)}
			</SheetTrigger>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				onKeyDown={handleKeyDown}
				className="mx-auto max-h-[92vh] w-full max-w-2xl gap-0 rounded-t-3xl border-t border-brand/15 bg-background p-0 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
			>
				{/* Preview */}
				<div className="sticky top-0 z-10 flex flex-col items-center gap-2 border-b border-border bg-brand/5 px-5 pb-5 pt-4">
					<div className="h-1.5 w-12 rounded-full bg-brand/20" aria-hidden />
					<div className="flex w-full items-start justify-between gap-3">
						<div className="min-w-0">
							<SheetTitle className="truncate text-left text-xs font-black uppercase tracking-widest text-brand">{label}</SheetTitle>
							{description ? (
								<SheetDescription className="mt-0.5 text-left text-[0.7rem] leading-snug text-muted-foreground">{description}</SheetDescription>
							) : (
								<SheetDescription className="sr-only">Teclado virtual para preencher {label}.</SheetDescription>
							)}
						</div>
						<SheetClose asChild>
							<button
								type="button"
								aria-label="Fechar"
								className="-mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-brand/10 hover:text-foreground"
							>
								<X className="size-5" />
							</button>
						</SheetClose>
					</div>
					<div className="flex min-h-[3.5rem] w-full items-center justify-center px-2">
						<span
							className={cn(
								"max-w-full truncate text-center text-4xl font-black tabular-nums tracking-tight short:text-3xl",
								isEmpty ? "text-muted-foreground/50" : "text-foreground",
							)}
						>
							{previewValue}
							<span className="ml-0.5 inline-block w-[2px] animate-pulse bg-brand align-middle text-transparent motion-reduce:animate-none">|</span>
						</span>
					</div>
				</div>

				{/* Teclado */}
				<div className="flex flex-col gap-3 px-4 pt-4">
					{props.type === "text" ? (
						<TextKeypad value={props.value} onAppend={(c) => appendChar(props, c)} onBackspace={() => applyBackspace(props)} />
					) : (
						<DigitKeypad
							onDigit={(d) => applyDigit(props, d)}
							onBackspace={() => applyBackspace(props)}
							quickAdd={props.type === "currency" ? props.quickAdd : undefined}
							onQuickAdd={props.type === "currency" ? (amount) => props.onChange(props.value + amount) : undefined}
							allowClear={props.type === "currency" ? props.allowClear : false}
							onClear={() => applyClear(props)}
						/>
					)}

					<SheetClose asChild>
						<button
							type="button"
							className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-black uppercase tracking-widest text-brand-foreground shadow-sm transition-colors hover:bg-brand/90 motion-reduce:transition-none"
						>
							<Check className="size-5" />
							{confirmLabel ?? "Confirmar"}
						</button>
					</SheetClose>
				</div>
			</SheetContent>
		</Sheet>
	);
}

// ---------------------------------------------------------------------------
// Keypads
// ---------------------------------------------------------------------------

function DigitKeypad({
	onDigit,
	onBackspace,
	quickAdd,
	onQuickAdd,
	allowClear,
	onClear,
}: {
	onDigit: (digit: number) => void;
	onBackspace: () => void;
	quickAdd?: number[];
	onQuickAdd?: (amount: number) => void;
	allowClear?: boolean;
	onClear: () => void;
}) {
	return (
		<div className="flex flex-col gap-2.5">
			{quickAdd && quickAdd.length > 0 && onQuickAdd ? (
				<div className="flex flex-wrap gap-2">
					{quickAdd.map((amount) => (
						<button
							key={amount}
							type="button"
							onClick={() => onQuickAdd(amount)}
							className="flex h-10 flex-1 items-center justify-center rounded-xl bg-brand/10 px-3 text-sm font-black text-brand transition-transform active:scale-95 motion-reduce:transition-none"
						>
							+ {formatToMoney(amount)}
						</button>
					))}
				</div>
			) : null}

			{DIGIT_ROWS.map((row, i) => (
				<div key={i} className="grid grid-cols-3 gap-2.5">
					{row.map((digit) => (
						<button key={digit} type="button" onClick={() => onDigit(digit)} className={KEY_BASE}>
							{digit}
						</button>
					))}
				</div>
			))}

			<div className="grid grid-cols-3 gap-2.5">
				{allowClear ? (
					<button
						type="button"
						onClick={onClear}
						aria-label="Limpar valor"
						className={cn(KEY_BASE, "text-sm font-black uppercase tracking-wide text-muted-foreground")}
					>
						Limpar
					</button>
				) : (
					<span aria-hidden />
				)}
				<button type="button" onClick={() => onDigit(0)} className={KEY_BASE}>
					0
				</button>
				<button type="button" onClick={onBackspace} aria-label="Apagar" className={cn(KEY_BASE, "text-muted-foreground")}>
					<Delete className="size-6" />
				</button>
			</div>
		</div>
	);
}

function TextKeypad({ value, onAppend, onBackspace }: { value: string; onAppend: (char: string) => void; onBackspace: () => void }) {
	const [shift, setShift] = React.useState(true);
	const [layer, setLayer] = React.useState<"letters" | "accents">("letters");

	// Caps automático quando o campo está vazio (sentença começa maiúscula).
	React.useEffect(() => {
		if (value.length === 0) setShift(true);
	}, [value.length]);

	const transform = (char: string) => (shift && layer === "letters" ? char.toUpperCase() : char);
	const insert = (char: string) => {
		onAppend(transform(char));
		if (shift && layer === "letters") setShift(false);
	};

	const rows = layer === "letters" ? QWERTY_LETTERS : ACCENT_ROWS;

	return (
		<div className="flex flex-col gap-2">
			{/* Linha numérica */}
			<div className="flex gap-1.5">
				{QWERTY_NUMBERS.map((n) => (
					<button key={n} type="button" onClick={() => onAppend(n)} className={cn(KEY_BASE, "h-11 flex-1 text-base short:h-10")}>
						{n}
					</button>
				))}
			</div>

			{rows.map((row, i) => {
				const isLastLetterRow = layer === "letters" && i === rows.length - 1;
				return (
					<div key={i} className={cn("flex gap-1.5", i === 1 && layer === "letters" && "px-4")}>
						{isLastLetterRow && (
							<button
								type="button"
								onClick={() => setShift((s) => !s)}
								aria-label="Maiúsculas"
								aria-pressed={shift}
								className={cn(KEY_BASE, "h-12 flex-[1.4] short:h-11", shift && "bg-brand/15 text-brand")}
							>
								<ArrowBigUp className={cn("size-5", shift && "fill-brand")} />
							</button>
						)}
						{row.map((char) => (
							<button key={char} type="button" onClick={() => insert(char)} className={cn(KEY_BASE, "h-12 flex-1 text-lg short:h-11")}>
								{transform(char)}
							</button>
						))}
						{isLastLetterRow && (
							<button type="button" onClick={onBackspace} aria-label="Apagar" className={cn(KEY_BASE, "h-12 flex-[1.4] text-muted-foreground short:h-11")}>
								<Delete className="size-5" />
							</button>
						)}
					</div>
				);
			})}

			{/* Linha de controles */}
			<div className="flex gap-1.5">
				<button
					type="button"
					onClick={() => setLayer((l) => (l === "letters" ? "accents" : "letters"))}
					className={cn(KEY_BASE, "h-12 flex-[1.4] text-sm font-black uppercase short:h-11")}
				>
					{layer === "letters" ? "áàã" : "abc"}
				</button>
				<button type="button" onClick={() => onAppend(" ")} aria-label="Espaço" className={cn(KEY_BASE, "h-12 flex-[4] short:h-11")}>
					<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">espaço</span>
				</button>
				{layer === "accents" && (
					<button type="button" onClick={onBackspace} aria-label="Apagar" className={cn(KEY_BASE, "h-12 flex-[1.4] text-muted-foreground short:h-11")}>
						<Delete className="size-5" />
					</button>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Helpers de aplicação por tipo
// ---------------------------------------------------------------------------

function applyDigit(props: VirtualKeyboardProps, digit: number) {
	if (props.type === "currency") {
		props.onChange(appendCurrencyDigit(props.value, digit, props.fractionDigits ?? 2));
	} else if (props.type === "numeric") {
		const max = props.maxLength ?? 32;
		if (props.value.length >= max) return;
		props.onChange(props.value + String(digit));
	} else {
		appendChar(props, String(digit));
	}
}

function applyBackspace(props: VirtualKeyboardProps) {
	if (props.type === "currency") {
		props.onChange(backspaceCurrency(props.value, props.fractionDigits ?? 2));
	} else {
		props.onChange(props.value.slice(0, -1));
	}
}

function applyClear(props: VirtualKeyboardProps) {
	if (props.type === "currency") {
		props.onChange(0);
	} else {
		props.onChange("");
	}
}

function appendChar(props: VirtualKeyboardProps, char: string) {
	if (props.type === "currency") return;
	const max = props.maxLength ?? (props.type === "numeric" ? 32 : 120);
	if (props.value.length >= max) return;
	props.onChange(props.value + char);
}

// ---------------------------------------------------------------------------
// Helpers de exibição
// ---------------------------------------------------------------------------

function getIsEmpty(props: VirtualKeyboardProps): boolean {
	if (props.type === "currency") return !props.value;
	return props.value.length === 0;
}

function getDisplayValue(props: VirtualKeyboardProps): string {
	if (props.type === "currency") {
		const format = props.formatValue ?? ((v: number) => formatToMoney(v));
		return format(props.value);
	}
	if (props.type === "numeric" && props.secret) {
		return "•".repeat(props.value.length);
	}
	if (props.type === "numeric" && props.formatValue) {
		return props.formatValue(props.value);
	}
	return props.value;
}

function getPreviewValue(props: VirtualKeyboardProps): string {
	if (props.type === "currency") {
		const format = props.formatValue ?? ((v: number) => formatToMoney(v));
		return format(props.value);
	}
	if (props.value.length === 0) return props.placeholder ?? "";
	if (props.type === "numeric" && props.secret) return "•".repeat(props.value.length);
	if (props.type === "numeric" && props.formatValue) return props.formatValue(props.value);
	return props.value;
}
