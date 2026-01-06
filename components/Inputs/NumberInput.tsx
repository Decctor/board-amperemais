import { cn } from "@/lib/utils";
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type NumberInputProps = {
	width?: string;
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	required?: boolean;
	showLabel?: boolean;
	value: number | null | undefined;
	editable?: boolean;
	placeholder: string;
	handleChange: (value: number) => void;
};

// Regex compilada uma única vez fora do componente
const NUMERIC_PATTERN = /[^0-9,.-]/g;

function NumberInput({
	width,
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	value,
	editable = true,
	placeholder,
	handleChange,
	required = false,
}: NumberInputProps) {
	// Memoiza o inputIdentifier para evitar recálculo
	const inputIdentifier = useMemo(() => label.toLowerCase().replace(" ", "_"), [label]);

	// Estado interno para controle do input
	const [inputValue, setInputValue] = useState<string>(() => {
		if (value === null || value === undefined) return "";
		return value.toString().replace(".", ",");
	});

	// Ref para evitar loops no useEffect
	const lastValueRef = useRef(value);

	// Handler otimizado com useCallback
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const rawValue = e.target.value;

			// Remove caracteres inválidos
			const sanitizedValue = rawValue.replace(NUMERIC_PATTERN, "");

			// Campo vazio
			if (sanitizedValue === "") {
				setInputValue("");
				handleChange(0);
				return;
			}

			// Atualiza valor visual
			setInputValue(sanitizedValue);

			// Processa valor numérico
			const normalizedValue = sanitizedValue.replace(",", ".");
			const numericValue = Number.parseFloat(normalizedValue);

			// Callback apenas se valor válido e diferente
			if (!Number.isNaN(numericValue)) {
				handleChange(numericValue);
			}
		},
		[handleChange],
	);

	// Sincronização otimizada - apenas quando valor realmente muda
	useEffect(() => {
		if (lastValueRef.current !== value) {
			lastValueRef.current = value;

			if (value === null || value === undefined) {
				setInputValue("");
			} else {
				setInputValue(value.toString().replace(".", ","));
			}
		}
	}, [value]);

	// Memoiza className do container
	const containerClassName = useMemo(() => `flex w-full flex-col gap-1 lg:w-[${width || "350px"}]`, [width]);

	// Memoiza className do label
	const labelClasses = useMemo(() => cn("text-sm font-medium tracking-tight text-primary/80", labelClassName), [labelClassName]);

	// Memoiza className do input
	const inputClasses = useMemo(
		() =>
			cn(
				"w-full rounded-md dark:bg-[#121212] border border-primary/20 p-3 text-sm shadow-sm outline-none duration-500 ease-in-out placeholder:italic focus:border-primary",
				holderClassName,
			),
		[holderClassName],
	);

	return (
		<div className={containerClassName}>
			{showLabel && (
				<Label htmlFor={inputIdentifier} className={labelClasses}>
					{label}
					{required && <span className="text-red-500">*</span>}
				</Label>
			)}

			<Input
				readOnly={!editable}
				value={inputValue}
				onChange={handleInputChange}
				id={inputIdentifier}
				type="text"
				inputMode="decimal"
				pattern="[0-9]*[,.]?[0-9]*"
				placeholder={placeholder}
				className={cn(
					"w-full rounded-md border border-primary/20 p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-primary",
					holderClassName,
				)}
			/>
		</div>
	);
}

export default React.memo(NumberInput);
