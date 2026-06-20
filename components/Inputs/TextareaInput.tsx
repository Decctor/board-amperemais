import { cn } from "@/lib/utils";
import type React from "react";
import { useId } from "react";
import { Field, FieldLabel } from "../ui/field";
import { Textarea } from "../ui/textarea";

type TextareaInputProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	showLabel?: boolean;
	required?: boolean;
	value: string;
	placeholder: string;
	editable?: boolean;
	handleChange: (value: string) => void;
};
function TextareaInput({
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	required = false,
	value,
	placeholder,
	editable = true,
	handleChange,
	id,
	...props
}: TextareaInputProps) {
	const generatedId = useId();
	const inputIdentifier = id ?? `${label.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;

	return (
		<Field className="gap-1" data-disabled={!editable}>
			{showLabel ? (
				<FieldLabel htmlFor={inputIdentifier} className={cn("text-foreground/80 text-start text-sm font-medium tracking-tight", labelClassName)}>
					{label}
					{required ? <span className="text-red-500">*</span> : null}
				</FieldLabel>
			) : null}
			<Textarea
				{...props}
				id={inputIdentifier}
				disabled={!editable}
				placeholder={placeholder}
				value={value}
				onChange={(e) => {
					handleChange(e.target.value);
				}}
				className={cn(
					"border-border focus:border-border field-sizing-content resize-none w-full rounded-md border p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic",
					holderClassName,
				)}
			/>
		</Field>
	);
}

export default TextareaInput;
