"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TSalesChannelState, TSalesChannelStatusDTO } from "@/lib/sales-channels/status";
import { cn } from "@/lib/utils";
import { ChannelMark } from "./ChannelMark";
import { SalesChannelDetail } from "./SalesChannelDetail";

/**
 * Pill de um canal de venda no header: marca do canal + ponto de estado + palavra.
 *
 * O ponto existe para ser lido de canto de olho, mas nunca é o único portador do significado — a
 * palavra ao lado diz a mesma coisa, e é ela que o leitor de tela e o usuário daltônico usam.
 *
 * Abaixo de `md` o header não tem largura para marca + ponto + palavra em cada canal ao lado da
 * busca: a palavra sai da tela mas não da árvore de acessibilidade (`sr-only`), e o popover a
 * repete por extenso para quem toca no pill.
 */

/** Tom visual do estado. Só existe em código, então fica em inglês, ao contrário do `estado`. */
type TStateTone = "positive" | "attention" | "neutral";

const STATE_CONFIG: Record<TSalesChannelState, { rotulo: string; tone: TStateTone }> = {
	ABERTA: { rotulo: "Aberta", tone: "positive" },
	FECHADA: { rotulo: "Fechada", tone: "neutral" },
	ATENCAO: { rotulo: "Atenção", tone: "attention" },
	DESATIVADA: { rotulo: "Desativada", tone: "neutral" },
	INDETERMINADO: { rotulo: "Indisponível", tone: "neutral" },
};

// Loja fechada às 3h da manhã é normal, não é erro: não existe tom vermelho aqui. Pintar o comum de
// destrutivo é o caminho mais curto para o usuário parar de enxergar vermelho no header.
const DOT_CLASS: Record<TStateTone, string> = {
	positive: "bg-success",
	attention: "bg-brand",
	neutral: "bg-muted-foreground/50",
};

const LABEL_CLASS: Record<TStateTone, string> = {
	positive: "text-foreground",
	attention: "text-foreground",
	neutral: "text-muted-foreground",
};

type SalesChannelPillProps = {
	canal: TSalesChannelStatusDTO;
};

export function SalesChannelPill({ canal }: SalesChannelPillProps) {
	const config = STATE_CONFIG[canal.estado];

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={`${canal.rotulo}: ${config.rotulo.toLowerCase()}. Abrir detalhes.`}
					className={cn(
						"flex shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-2 py-1.5 md:gap-2",
						"transition-colors duration-200 hover:bg-secondary/70",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
					)}
				>
					<ChannelMark canal={canal.canal} />
					<span className="flex items-center gap-1.5">
						<span aria-hidden className={cn("size-1.5 shrink-0 rounded-full transition-colors duration-200", DOT_CLASS[config.tone])} />
						<span className={cn("max-md:sr-only text-xs font-semibold leading-none", LABEL_CLASS[config.tone])}>{config.rotulo}</span>
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={8} className="w-72 p-0">
				<SalesChannelDetail canal={canal} estadoRotulo={config.rotulo} />
			</PopoverContent>
		</Popover>
	);
}
