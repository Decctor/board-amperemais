type SessionMetaRowProps = {
	label: string;
	value: string;
};

export function SessionMetaRow({ label, value }: SessionMetaRowProps) {
	return (
		<div className="flex items-center justify-between text-xs">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-semibold tabular-nums">{value}</span>
		</div>
	);
}
