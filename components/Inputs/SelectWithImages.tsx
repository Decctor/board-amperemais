import { formatNameAsInitials } from "@/lib/formatting";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import SelectInput from "./SelectInput";

type SelectOption = {
	id: string | number;
	value: string;
	label: string;
	url?: string;
};
type SelectWithImagesProps = {
	width?: string;
	label: string;
	labelClassName?: string;
	holderClassName?: string;
	showLabel?: boolean;
	value: any | null;
	editable?: boolean;
	resetOptionLabel: string;
	options: SelectOption[] | null;
	handleChange: (value: string) => void;
	onReset: () => void;
};

function SelectWithImages({
	width,
	label,
	labelClassName,
	holderClassName,
	showLabel = true,
	value,
	editable = true,
	options,
	resetOptionLabel,
	handleChange,
	onReset,
}: SelectWithImagesProps) {
	return (
		<SelectInput
			label={label}
			value={value}
			resetOptionLabel={resetOptionLabel}
			options={
				options?.map((option) => ({
					...option,
					startContent: (
						<Avatar className="w-4 h-4 min-w-4 min-h-4">
							<AvatarImage src={option.url} alt={"Avatar"} />
							<AvatarFallback>{formatNameAsInitials(option.label)}</AvatarFallback>
						</Avatar>
					),
				})) ?? []
			}
			handleChange={handleChange}
			onReset={onReset}
		/>
	);
}

export default SelectWithImages;
