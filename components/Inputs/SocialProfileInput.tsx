import type { ReactNode } from "react";

import { normalizeSocialProfile, type SocialProfilePlatform } from "@/lib/socials";
import { cn } from "@/lib/utils";

import { Input } from "../ui/input";
import { Label } from "../ui/label";

type SocialProfileInputProps = {
	label: string;
	value: string;
	platform: SocialProfilePlatform;
	placeholder: string;
	prefix: string;
	prefixIcon?: ReactNode;
	width?: string;
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
	width,
	editable = true,
	handleChange,
}: SocialProfileInputProps) {
	const inputIdentifier = label.toLowerCase().replaceAll(" ", "_");

	function commitValue(nextValue: string) {
		handleChange(normalizeSocialProfile(nextValue, platform));
	}

	return (
		<div className={`flex w-full flex-col gap-1 lg:w-[${width ? width : "350px"}]`}>
			<Label htmlFor={inputIdentifier} className="text-sm font-medium tracking-tight text-foreground/80">
				{label}
			</Label>
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
		</div>
	);
}
