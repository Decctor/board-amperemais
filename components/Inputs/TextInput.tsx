import { cn } from "@/lib/utils";
import React from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type TextInputProps = {
	width?: string;
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
	inputType?: "text" | "tel";
};
function TextInput({
	width,
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
}: TextInputProps) {
	const inputIdentifier = label.toLowerCase().replace(" ", "_");
	return (
		<div className={`flex w-full flex-col gap-1 lg:w-[${width ? width : "350px"}]`}>
			{showLabel ? (
				<Label htmlFor={inputIdentifier} className={cn("text-sm font-medium tracking-tight text-primary/80", labelClassName)}>
					{label}
					{required ? <span className="text-red-500">*</span> : null}
				</Label>
			) : null}

			<Input
				value={value}
				onChange={(e) => handleChange(e.target.value)}
				id={inputIdentifier}
				onBlur={() => {
					if (handleOnBlur) handleOnBlur();
					else return;
				}}
				readOnly={!editable}
				type="text"
				placeholder={placeholder}
				className={cn(
					"w-full rounded-md border border-primary/20 p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-primary",
					holderClassName,
				)}
			/>
		</div>
	);
}

export default TextInput;
