import { formatNumberInputValue, parseNumberInputText, sanitizeNumberInputText } from "@/lib/number-input";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type NumberInputProps = {
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

function NumberInput({
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
	const generatedId = useId();
	const inputIdentifier = `${label.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;
	const [inputValue, setInputValue] = useState<string>(() => formatNumberInputValue(value));
	const lastValueRef = useRef(value);

	const handleInputChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const sanitizedValue = sanitizeNumberInputText(event.target.value);
			setInputValue(sanitizedValue);
			handleChange(parseNumberInputText(sanitizedValue) ?? 0);
		},
		[handleChange],
	);

	const handleBlur = useCallback(() => {
		const numericValue = parseNumberInputText(inputValue);
		setInputValue(formatNumberInputValue(numericValue ?? value));
	}, [inputValue, value]);

	useEffect(() => {
		if (lastValueRef.current !== value) {
			lastValueRef.current = value;
			setInputValue(formatNumberInputValue(value));
		}
	}, [value]);

	return (
		<Field className="gap-1" data-disabled={!editable}>
			{showLabel ? (
				<FieldLabel htmlFor={inputIdentifier} className={cn("text-sm font-medium tracking-tight text-foreground/80", labelClassName)}>
					{label}
					{required ? <span className="text-red-500">*</span> : null}
				</FieldLabel>
			) : null}

			<Input
				readOnly={!editable}
				value={inputValue}
				onChange={handleInputChange}
				onBlur={handleBlur}
				id={inputIdentifier}
				type="text"
				inputMode="decimal"
				pattern="-?[0-9.,]*"
				placeholder={placeholder}
				className={cn(
					"w-full rounded-md border border-border p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-border",
					holderClassName,
				)}
			/>
		</Field>
	);
}

export default memo(NumberInput);
