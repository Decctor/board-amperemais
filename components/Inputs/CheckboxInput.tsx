import { cn } from "@/lib/utils";
import React from "react";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

type CheckboxInputProps = {
	checked: boolean;
	labelTrue: string;
	labelFalse: string;
	labelClassName?: string;
	/** Texto auxiliar exibido abaixo do rótulo principal. */
	description?: string;
	descriptionClassName?: string;
	handleChange: (value: boolean) => void;
	editable?: boolean;
	justify?: string;
	padding?: string;
};
function CheckboxInput({
	labelTrue,
	labelFalse,
	labelClassName = "",
	description,
	descriptionClassName,
	checked,
	handleChange,
	editable = true,
	justify = "justify-center",
	padding = "0.75rem",
}: CheckboxInputProps) {
	const inputIdentifier = (checked ? labelTrue : labelFalse).toLowerCase().replaceAll(" ", "_");
	const descriptionId = `${inputIdentifier}_descricao`;
	return (
		<div className={`flex w-full items-center justify-center ${justify} gap-2 ${padding ? `p-[${padding}]` : "p-3"}`}>
			<Checkbox
				id={inputIdentifier}
				checked={checked}
				onCheckedChange={(e) => editable && handleChange(e === true)}
				aria-describedby={description ? descriptionId : undefined}
			/>
			<div className="flex min-w-0 flex-col gap-1 text-start">
				<Label htmlFor={inputIdentifier} className={cn("text-xs font-medium leading-snug", labelClassName)}>
					{checked ? labelTrue : labelFalse}
				</Label>
				{description ? (
					<p id={descriptionId} className={cn("text-xs leading-snug text-muted-foreground", descriptionClassName)}>
						{description}
					</p>
				) : null}
			</div>
		</div>
	);
}

export default CheckboxInput;
