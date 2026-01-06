import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
type TextInputProps = {
	width?: string;
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	required?: boolean;
	showLabel?: boolean;
	value: string | undefined;
	editable?: boolean;
	handleChange: (value: string | undefined) => void;
};
function DateInput({
	width,
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	value,
	editable = true,
	handleChange,
	required = false,
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
				readOnly={!editable}
				value={value}
				onChange={(e) => {
					handleChange(e.target.value !== "" ? e.target.value : undefined);
				}}
				id={inputIdentifier}
				onReset={() => handleChange(undefined)}
				type="date"
				className={cn(
					"w-full rounded-md border border-primary/20 p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-primary",
					holderClassName,
				)}
			/>
		</div>
	);
}

export default DateInput;
