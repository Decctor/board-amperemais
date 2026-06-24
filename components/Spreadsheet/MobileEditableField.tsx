export default function MobileEditableField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-[0.65rem] font-medium uppercase text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}
