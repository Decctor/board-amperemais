import { ChevronRight } from "lucide-react";
import Link from "next/link";

type ContentSectionHeaderProps = {
	title: string;
	href?: string;
	linkText?: string;
};

export function ContentSectionHeader({ title, href, linkText = "Ver tudo" }: ContentSectionHeaderProps) {
	return (
		<div className="flex items-end justify-between gap-4">
			<h2 className="text-base font-extrabold tracking-tight sm:text-lg">{title}</h2>
			{href ? (
				<Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
					{linkText}
					<ChevronRight className="size-3.5" />
				</Link>
			) : null}
		</div>
	);
}
