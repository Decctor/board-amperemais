import { useAgentPrinters } from "@/lib/queries/desktop-agent";
import { useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useCallback, useMemo } from "react";
import AgentPrinterCard from "./AgentPrinterCard";

type DevicePrintersBlockProps = {
	principalId: string;
	readOnly: boolean;
};

export function DevicePrintersBlock({ principalId, readOnly }: DevicePrintersBlockProps) {
	const queryClient = useQueryClient();
	const { data: printers, queryKey } = useAgentPrinters();

	// Ordena por nomeSistema (imutável — vem do SO) e desempata por id. Sem isso a lista
	// reordenava a cada update: o backend ordenava por dataInsercao e o agente sincroniza
	// todas as impressoras no mesmo instante, então o empate deixava a ordem indefinida.
	const principalPrinters = useMemo(
		() =>
			(printers ?? [])
				.filter((printer) => printer.principalId === principalId)
				.sort((a, b) => a.nomeSistema.localeCompare(b.nomeSistema, "pt-BR") || a.id.localeCompare(b.id)),
		[printers, principalId],
	);

	// Identidade estável: sem isso o memo de AgentPrinterCard não segura nada.
	const handleChanged = useCallback(async () => await queryClient.invalidateQueries({ queryKey }), [queryClient, queryKey]);

	if (principalPrinters.length === 0) {
		return (
			<div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
				<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
					<Printer className="h-5 w-5" />
				</div>
				<div className="flex flex-col gap-1">
					<h4 className="text-sm font-bold tracking-tight">Nenhuma impressora sincronizada</h4>
					<p className="max-w-[46ch] text-xs text-muted-foreground">
						O agente reporta sozinho as impressoras instaladas nesta máquina. Se nada aparecer, confirme que ele está aberto e com a permissão
						"Sincronizar impressoras" ligada.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-4">
			<p className="max-w-[52ch] text-xs text-muted-foreground">
				Marque o que cada impressora imprime. Quando uma venda ou uma etiqueta entra na fila, o sistema envia para a impressora ativa que atende
				aquele tipo de documento.
			</p>
			<div className="flex w-full flex-col gap-2">
				{principalPrinters.map((printer) => (
					<AgentPrinterCard key={printer.id} printer={printer} readOnly={readOnly} onChanged={handleChanged} />
				))}
			</div>
		</div>
	);
}

export default DevicePrintersBlock;
