import { useId, type ReactNode } from "react";

import { normalizeSocialProfile, type SocialProfilePlatform } from "@/lib/socials";
import { cn } from "@/lib/utils";

import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type SocialProfileInputProps = {
	label: string;
	value: string;
	platform: SocialProfilePlatform;
	placeholder: string;
	prefix: string;
	prefixIcon?: ReactNode;
	editable?: boolean;
	handleChange: (value: string | null) => void;
};

export default function SocialProfileInput({
	label,
	value,
	platform,
	placeholder,
	prefix,
	prefixIcon,
	editable = true,
	handleChange,
}: SocialProfileInputProps) {
	const generatedId = useId();
	const inputIdentifier = `${label.toLowerCase().replaceAll(" ", "_")}_${generatedId}`;

	function commitValue(nextValue: string) {
		handleChange(normalizeSocialProfile(nextValue, platform));
	}

	return (
		<Field className="gap-1" data-disabled={!editable}>
			<FieldLabel htmlFor={inputIdentifier} className="text-sm font-medium tracking-tight text-foreground/80">
				{label}
			</FieldLabel>
			<div
				className={cn(
					"flex h-10 w-full items-center overflow-hidden rounded-md border border-border bg-background text-sm shadow-xs transition-colors focus-within:border-border",
					!editable && "bg-muted",
				)}
			>
				<span className="flex h-full shrink-0 items-center gap-1.5 border-r border-border bg-muted/60 px-2.5 text-foreground/55">
					{prefixIcon ? <span className="flex size-3.5 items-center justify-center text-foreground/50">{prefixIcon}</span> : null}
					<span className="whitespace-nowrap">{prefix}</span>
				</span>
				<Input
					value={value}
					onChange={(event) => commitValue(event.target.value)}
					onBlur={(event) => commitValue(event.target.value)}
					id={inputIdentifier}
					readOnly={!editable}
					type="text"
					placeholder={placeholder}
					className="h-full min-w-0 flex-1 rounded-none border-0 px-3 py-1 text-sm shadow-none outline-hidden placeholder:italic focus-visible:ring-0"
				/>
			</div>
		</Field>
	);
}
