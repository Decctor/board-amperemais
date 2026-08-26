import { cn } from "@/lib/utils";
import type React from "react";
import { useId } from "react";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { RequiredIndicator } from "./RequiredIndicator";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	showLabel?: boolean;
	value: string;
	placeholder: string;
	editable?: boolean;
	required?: boolean;
	handleChange: (value: string) => void;
	handleOnBlur?: () => void;
	inputType?: "text" | "tel" | "password";
};
function TextInput({
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	value,
	placeholder,
	editable = true,
	required = false,
	inputType = "text",
	handleChange,
	handleOnBlur,
	id,
	onBlur,
	...props
}: TextInputProps) {
	const generatedId = useId();
	const inputIdentifier = id ?? `${label.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;

	return (
		<Field className="gap-1" data-disabled={!editable}>
			{showLabel ? (
				<FieldLabel htmlFor={inputIdentifier} className={cn("text-sm font-medium tracking-tight text-foreground/80", labelClassName)}>
					{label}
					{required ? <RequiredIndicator /> : null}
				</FieldLabel>
			) : null}

			<Input
				{...props}
				value={value}
				onChange={(e) => handleChange(e.target.value)}
				id={inputIdentifier}
				onBlur={(event) => {
					onBlur?.(event);
					if (handleOnBlur) handleOnBlur();
					else return;
				}}
				readOnly={!editable}
				type={inputType}
				placeholder={placeholder}
				className={cn(
					"w-full rounded-md border border-border p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-border",
					holderClassName,
				)}
			/>
		</Field>
	);
}

export default TextInput;
