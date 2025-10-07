import type { PropsWithChildren, ReactNode } from "react";

type ResponsiveMenuSectionProps = PropsWithChildren & {
	title: string;
	icon: ReactNode;
};
function ResponsiveMenuSection({ children, title, icon }: ResponsiveMenuSectionProps) {
	return (
		<div className="flex w-full grow flex-col gap-2">
			<div className="flex items-center gap-2 bg-primary/20 px-2 py-1 rounded w-fit">
				{icon}
				<h1 className="text-xs tracking-tight font-medium text-start w-fit">{title}</h1>
			</div>
			<div className="w-full flex flex-col gap-3">{children}</div>
		</div>
	);
}

export default ResponsiveMenuSection;
