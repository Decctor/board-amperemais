import { cn } from "@/lib/utils";
import React, { useId } from "react";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "../ui/field";

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
	const generatedId = useId();
	const inputIdentifier = `${labelTrue.toLowerCase().replaceAll(" ", "_")}_${labelFalse.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;
	const descriptionId = `${inputIdentifier}_descricao`;
	return (
		<Field
			orientation="horizontal"
			className={cn("w-full items-center justify-center gap-2", justify, !padding && "p-3")}
			data-disabled={!editable}
			style={padding ? { padding } : undefined}
		>
			<Checkbox
				id={inputIdentifier}
				checked={checked}
				disabled={!editable}
				onCheckedChange={(e) => editable && handleChange(e === true)}
				aria-describedby={description ? descriptionId : undefined}
			/>
			<FieldContent className="min-w-0 gap-1 text-start">
				<FieldLabel htmlFor={inputIdentifier} className={cn("text-xs font-medium leading-snug", labelClassName)}>
					{checked ? labelTrue : labelFalse}
				</FieldLabel>
				{description ? (
					<FieldDescription id={descriptionId} className={cn("text-xs leading-snug", descriptionClassName)}>
						{description}
					</FieldDescription>
				) : null}
			</FieldContent>
		</Field>
	);
}

export default CheckboxInput;
