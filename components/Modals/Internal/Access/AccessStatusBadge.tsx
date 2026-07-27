import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
	ATIVO: { label: "ATIVO", className: "bg-green-100 text-green-800 border-green-200" },
	INATIVO: { label: "INATIVO", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
	REVOGADO: { label: "REVOGADO", className: "bg-red-100 text-red-800 border-red-200" },
};

type AccessStatusBadgeProps = {
	status: string;
	className?: string;
};
export function AccessStatusBadge({ status, className }: AccessStatusBadgeProps) {
	const style = STATUS_STYLES[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
	return (
		<span className={cn("rounded-full border px-2 py-1 text-[0.6rem] font-bold tracking-widest", style.className, className)}>{style.label}</span>
	);
}

export default AccessStatusBadge;
