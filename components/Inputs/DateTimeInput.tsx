import { cn } from "@/lib/utils";
import { useId } from "react";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { RequiredIndicator } from "./RequiredIndicator";
type DateTimeProps = {
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	required?: boolean;
	showLabel?: boolean;
	value: string | undefined;
	editable?: boolean;
	handleChange: (value: string | undefined) => void;
};
function DateTimeInput({
	label,
	labelClassName = "text-sm tracking-tight text-foreground/80 font-medium",
	holderClassName,
	required = false,
	showLabel = true,
	value,
	editable = true,
	handleChange,
}: DateTimeProps) {
	const generatedId = useId();
	const inputIdentifier = `${label.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;
	return (
		<Field className="gap-1" data-disabled={!editable}>
			{showLabel ? (
				<FieldLabel htmlFor={inputIdentifier} className={cn("text-sm font-medium tracking-tight text-foreground/80", labelClassName)}>
					{label}
					{required ? <RequiredIndicator /> : null}
				</FieldLabel>
			) : null}
			<Input
				readOnly={!editable}
				value={value}
				onChange={(e) => {
					handleChange(e.target.value !== "" ? e.target.value : undefined);
				}}
				id={inputIdentifier}
				onReset={() => handleChange(undefined)}
				type="datetime-local"
				className={cn(
					"w-full rounded-md border border-border p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-border",
					holderClassName,
				)}
			/>
		</Field>
	);
}

export default DateTimeInput;
