import { cn } from "@/lib/utils";
import React from "react";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

type CheckboxInputProps = {
	checked: boolean;
	labelTrue: string;
	labelFalse: string;
	labelClassName?: string;
	handleChange: (value: boolean) => void;
	editable?: boolean;
	justify?: string;
	padding?: string;
};
function CheckboxInput({
	labelTrue,
	labelFalse,
	labelClassName = "",
	checked,
	handleChange,
	editable = true,
	justify = "justify-center",
	padding = "0.75rem",
}: CheckboxInputProps) {
	const inputIdentifier = (checked ? labelTrue : labelFalse).toLowerCase().replaceAll(" ", "_");
	return (
		<div className={`flex w-full items-center ${justify} gap-2 ${padding ? `p-[${padding}]` : "p-3"}`}>
			<Checkbox id={inputIdentifier} checked={checked} onCheckedChange={(e) => editable && handleChange(e === true)} />
			<Label htmlFor={inputIdentifier} className={cn("text-xs font-medium leading-none text-start", labelClassName)}>
				{checked ? labelTrue : labelFalse}
			</Label>
		</div>
	);
}

export default CheckboxInput;
