"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef } from "react";

export type TChoiceOption<T extends string> = {
	value: T;
	titulo: string;
	descricao?: string | null;
	icon?: ReactNode;
	disabled?: boolean;
	/** Texto curto à direita (ex.: "Em breve", "Recomendado"). */
	badge?: string | null;
	/** Conteúdo extra abaixo da descrição (pílulas de dependência, prévia de mensagem). */
	extra?: ReactNode;
};

type ChoiceListProps<T extends string> = {
	label: string;
	options: TChoiceOption<T>[];
	/** Seleção única (radio) ou múltipla (checkbox). */
	mode?: "single" | "multiple";
	value: T | T[] | null;
	onChange: (value: T) => void;
	/** Grade para listas longas de opções curtas (ex.: segmentos). Padrão: lista vertical. */
	columns?: 1 | 2 | 3;
	dense?: boolean;
	className?: string;
};

/**
 * Lista de escolhas, uma opção por linha. Substitui grades de cards: sem translate, sem sombra,
 * sem cor de marca na seleção. Selecionada = borda `foreground` + fundo `muted/40`.
 */
export function ChoiceList<T extends string>({
	label,
	options,
	mode = "single",
	value,
	onChange,
	columns = 1,
	dense = false,
	className,
}: ChoiceListProps<T>) {
	const refs = useRef<Array<HTMLButtonElement | null>>([]);
	const isSelected = (option: TChoiceOption<T>) => (Array.isArray(value) ? value.includes(option.value) : value === option.value);

	function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
		if (mode !== "single") return;
		const enabled = options.map((option, i) => (option.disabled ? null : i)).filter((i): i is number => i !== null);
		const position = enabled.indexOf(index);
		if (position === -1) return;
		let target: number | null = null;
		if (event.key === "ArrowDown" || event.key === "ArrowRight") target = enabled[(position + 1) % enabled.length];
		if (event.key === "ArrowUp" || event.key === "ArrowLeft") target = enabled[(position - 1 + enabled.length) % enabled.length];
		if (target === null) return;
		event.preventDefault();
		refs.current[target]?.focus();
		onChange(options[target].value);
	}

	return (
		<div
			role={mode === "single" ? "radiogroup" : "group"}
			aria-label={label}
			className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3", className)}
		>
			{options.map((option, index) => {
				const selected = isSelected(option);
				return (
					<button
						key={option.value}
						ref={(element) => {
							refs.current[index] = element;
						}}
						type="button"
						role={mode === "single" ? "radio" : "checkbox"}
						aria-checked={selected}
						disabled={option.disabled}
						tabIndex={mode === "single" ? (selected || (!options.some(isSelected) && index === 0) ? 0 : -1) : 0}
						onClick={() => onChange(option.value)}
						onKeyDown={(event) => handleKeyDown(event, index)}
						className={cn(
							"flex w-full items-start gap-3 rounded-xl border text-left transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
							dense ? "p-3" : "p-4",
							selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/40",
							option.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
						)}
					>
						<span
							aria-hidden
							className={cn(
								"mt-0.5 flex size-[18px] shrink-0 items-center justify-center border-2 transition-colors",
								mode === "single" ? "rounded-full" : "rounded-[5px]",
								selected ? "border-primary" : "border-muted-foreground/40",
								selected && mode === "multiple" && "bg-primary text-primary-foreground",
							)}
						>
							{selected && mode === "single" ? <span className="size-2 rounded-full bg-primary" /> : null}
							{selected && mode === "multiple" ? <Check className="size-3" strokeWidth={3} /> : null}
						</span>
						{option.icon ? <span className="mt-0.5 shrink-0 text-muted-foreground [&_svg]:size-4">{option.icon}</span> : null}
						<span className="flex min-w-0 grow flex-col gap-1">
							<span className="flex items-center justify-between gap-2">
								<span className={cn("font-bold", dense ? "text-[13px] leading-tight" : "text-sm")}>{option.titulo}</span>
								{option.badge ? <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{option.badge}</span> : null}
							</span>
							{option.descricao ? <span className="text-sm leading-snug text-muted-foreground">{option.descricao}</span> : null}
							{option.extra}
						</span>
					</button>
				);
			})}
		</div>
	);
}
