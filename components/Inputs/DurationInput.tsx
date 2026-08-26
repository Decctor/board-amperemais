"use client";

import { cn } from "@/lib/utils";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Field, FieldDescription, FieldLabel } from "../ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RequiredIndicator } from "./RequiredIndicator";

type DurationOption<TMeasure extends string = string> = {
	id: string | number;
	label: string;
	value: TMeasure;
};

type DurationInputProps<TMeasure extends string = string> = {
	label: string;
	value: number | null | undefined;
	measure: TMeasure | null | undefined;
	options: DurationOption<TMeasure>[];
	onValueChange: (value: number) => void;
	onMeasureChange: (value: TMeasure) => void;
	onMeasureReset?: () => void;
	valuePlaceholder?: string;
	measurePlaceholder?: string;
	helperText?: string;
	required?: boolean;
	editable?: boolean;
	className?: string;
	labelClassName?: string;
};

const NUMERIC_PATTERN = /[^0-9,.-]/g;
const RESET_MEASURE_VALUE = "__reset_measure__";

function DurationInput<TMeasure extends string = string>({
	label,
	value,
	measure,
	options,
	onValueChange,
	onMeasureChange,
	onMeasureReset,
	valuePlaceholder = "Valor",
	measurePlaceholder = "Medida",
	helperText,
	required = false,
	editable = true,
	className,
	labelClassName,
}: DurationInputProps<TMeasure>) {
	const generatedId = useId();
	const inputIdentifier = `${label.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;
	const lastValueRef = useRef(value);
	const [inputValue, setInputValue] = useState(() => {
		if (value === null || value === undefined) return "";
		return value.toString().replace(".", ",");
	});

	const handleValueChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const sanitizedValue = event.target.value.replace(NUMERIC_PATTERN, "");
			if (sanitizedValue === "") {
				setInputValue("");
				onValueChange(0);
				return;
			}

			setInputValue(sanitizedValue);
			const numericValue = Number.parseFloat(sanitizedValue.replace(",", "."));
			if (!Number.isNaN(numericValue)) onValueChange(numericValue);
		},
		[onValueChange],
	);

	useEffect(() => {
		if (lastValueRef.current === value) return;
		lastValueRef.current = value;
		setInputValue(value === null || value === undefined ? "" : value.toString().replace(".", ","));
	}, [value]);

	return (
		<Field className={cn("gap-1.5", className)} data-disabled={!editable}>
			<FieldLabel htmlFor={`${inputIdentifier}_value`} className={cn("text-sm font-medium tracking-tight text-foreground/80", labelClassName)}>
				{label}
				{required ? <RequiredIndicator /> : null}
			</FieldLabel>
			<div
				className={cn(
					"flex h-9 w-full overflow-hidden rounded-4xl border border-input bg-input/30 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
					!editable && "opacity-70",
				)}
			>
				<input
					id={`${inputIdentifier}_value`}
					readOnly={!editable}
					value={inputValue}
					onChange={handleValueChange}
					type="text"
					inputMode="decimal"
					pattern="[0-9]*[,.]?[0-9]*"
					placeholder={valuePlaceholder}
					className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground placeholder:italic disabled:cursor-not-allowed"
				/>
				<Select
					disabled={!editable}
					value={measure ?? undefined}
					onValueChange={(selectedValue) => {
						if (selectedValue === RESET_MEASURE_VALUE) {
							onMeasureReset?.();
							return;
						}
						onMeasureChange(selectedValue as TMeasure);
					}}
				>
					<SelectTrigger
						aria-label={`${label} - medida`}
						className="h-full w-[132px] shrink-0 rounded-none border-0 border-l border-input bg-transparent px-3 py-0 text-sm font-medium shadow-none ring-0 focus-visible:border-input focus-visible:ring-0 data-[size=default]:h-full"
					>
						<SelectValue placeholder={measurePlaceholder} />
					</SelectTrigger>
					<SelectContent align="end" className="min-w-[132px]">
						{onMeasureReset && <SelectItem value={RESET_MEASURE_VALUE}>{measurePlaceholder}</SelectItem>}
						{options.map((option) => (
							<SelectItem key={option.id} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{helperText && <FieldDescription className="text-xs leading-relaxed">{helperText}</FieldDescription>}
		</Field>
	);
}

export default React.memo(DurationInput) as typeof DurationInput;
