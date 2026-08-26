import { Asterisk } from "lucide-react";

export function RequiredIndicator() {
	return (
		<span
			className="ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
			aria-label="Campo obrigatório"
			title="Campo obrigatório"
		>
			<Asterisk className="size-2.5" aria-hidden="true" />
		</span>
	);
}
