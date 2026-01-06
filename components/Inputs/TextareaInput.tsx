import { cn } from "@/lib/utils";
import React from "react";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

type TextareaInputProps = {
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	value: string;
	placeholder: string;
	editable?: boolean;
	handleChange: (value: string) => void;
};
function TextareaInput({ label, labelClassName, holderClassName, value, placeholder, editable = true, handleChange }: TextareaInputProps) {
	return (
		<div className="flex w/full flex-col gap-1">
			<Label className={cn("text-primary/80 text-start text-sm font-medium tracking-tight", labelClassName)}>{label}</Label>
			<Textarea
				disabled={!editable}
				placeholder={placeholder}
				value={value}
				onChange={(e) => {
					handleChange(e.target.value);
				}}
				className={cn(
					"border-primary/20 focus:border-primary field-sizing-content resize-none w-full rounded-md border p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic",
					holderClassName,
				)}
			/>
		</div>
	);
}

export default TextareaInput;
