import { Lock } from "lucide-react";

type SettingsRestrictedStateProps = {
	reason?: string;
};

/**
 * Estado único de "sem permissão" das configurações. Substitui os três tratamentos que existiam
 * antes (a UnauthorizedPage de tela cheia, o "Acesso Negado" da organização e o bloco tracejado do
 * agente de IA) — um mesmo bloqueio com três aparências fazia o app parecer três apps.
 *
 * Distinto de "fora do plano", que é convite comercial e continua morando na própria seção.
 */
export default function SettingsRestrictedState({ reason }: SettingsRestrictedStateProps) {
	return (
		<div className="border-border flex w-full flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
			<div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-xl">
				<Lock className="h-5 w-5" />
			</div>
			<div className="flex flex-col gap-1">
				<p className="text-sm font-bold">Você não tem acesso a esta seção</p>
				<p className="text-muted-foreground max-w-md text-sm">{reason ?? "Peça a um administrador da organização a permissão necessária."}</p>
			</div>
		</div>
	);
}
