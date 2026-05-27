"use client";

export function MessageTemplatePanel({
	icon,
	title,
	description,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<section className="border-border bg-card flex min-h-0 flex-col rounded-lg border shadow-xs">
			<div className="border-border border-b px-4 py-3">
				<div className="flex items-center gap-1.5">
					{icon}
					<h2 className="text-sm font-bold">{title}</h2>
				</div>
				<p className="text-muted-foreground mt-0.5 text-xs leading-5">{description}</p>
			</div>
			<div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
		</section>
	);
}

export function MessageTemplateField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-xs font-bold uppercase">{label}</span>
			{children}
		</label>
	);
}

export function MessageTemplateValidationNotice({ warnings }: { warnings: string[] }) {
	if (warnings.length === 0) {
		return (
			<div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700">
				Pronto para revisão neste canal.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-medium text-amber-800">
			{warnings.map((warning) => (
				<p key={warning}>- {warning}</p>
			))}
		</div>
	);
}
