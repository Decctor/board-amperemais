import React from "react";

type TextareaInputProps = {
	label: string;
	value: string;
	placeholder: string;
	editable?: boolean;
	handleChange: (value: string) => void;
};
function TextareaInput({ label, value, placeholder, editable = true, handleChange }: TextareaInputProps) {
	const inputIdentifier = label.toLowerCase().replace(" ", "_");
	return (
		<div className="flex w-full flex-col gap-1">
			<label htmlFor={inputIdentifier} className="text-sm tracking-tight text-primary/80 font-medium">
				{label}
			</label>
			<textarea
				disabled={!editable}
				placeholder={placeholder}
				value={value}
				onChange={(e) => {
					handleChange(e.target.value);
				}}
				className="w-full rounded-md border border-primary/20 p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-primary min-h-[80px] field-sizing-content resize-none"
			/>
		</div>
	);
}

export default TextareaInput;
