import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type DateIntervalInputProps = {
	width?: string;
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	showLabel?: boolean;
	value: { after?: Date; before?: Date };
	editable?: boolean;
	handleChange: (value: { after?: Date; before?: Date }) => void;
};

function DateIntervalInput({
	width,
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	value,
	editable = true,
	handleChange,
}: DateIntervalInputProps) {
	const inputIdentifier = label.toLowerCase().replace(" ", "_");
	const [open, setOpen] = useState(false);

	return (
		<div className={`flex w-full flex-col gap-1 lg:w-[${width ? width : "350px"}]`}>
			{showLabel ? (
				<label htmlFor={inputIdentifier} className={cn("text-sm tracking-tight text-primary/80 font-medium", labelClassName)}>
					{label}
				</label>
			) : null}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						id={inputIdentifier}
						disabled={!editable}
						variant={"outline"}
						className={cn(
							"w-full min-h-[46.6px] rounded-md border border-primary/20 p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out text-left justify-start font-normal",
							!value.after && !value.before && "text-muted-foreground",
							holderClassName,
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{value?.after ? (
							value.before ? (
								<>
									{format(value.after, "dd/MM/yyyy", { locale: ptBR })} - {format(value.before, "dd/MM/yyyy", { locale: ptBR })}
								</>
							) : (
								format(value.after, "dd/MM/yyyy", { locale: ptBR })
							)
						) : (
							<span>DEFINA UM PERÍODO</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={value?.after}
						selected={{ from: value.after, to: value.before }}
						onSelect={(value) => {
							handleChange({ after: value?.from, before: value?.to });
							if (value?.from && value?.to) {
								setOpen(false);
							}
						}}
						numberOfMonths={2}
						locale={ptBR}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}

export default DateIntervalInput;
