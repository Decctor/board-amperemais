import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorName,
	ModelSelectorTrigger,
} from "@/components/ui/model-selector";
import { Button } from "@/components/ui/button";
import { AI_AGENT_MODEL_PERFIL_LABELS, AI_AGENT_MODEL_PERFIL_ORDER } from "@/lib/ai/providers/model-catalog";
import { useAiAgentModels } from "@/lib/queries/ai-agents";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { useState } from "react";

type ModelSelectorFieldProps = {
	value: string;
	onChange: (modelo: string) => void;
};

/** Preço por 1 milhão de tokens. Modelos econômicos custam centavos: 3 casas abaixo de US$ 1. */
function formatPrice(value: number): string {
	const decimals = value < 1 ? 3 : 2;
	return `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatContextWindow(tokens: number): string {
	return tokens >= 1_000_000 ? `${Math.round(tokens / 1_000_000)}M de contexto` : `${Math.round(tokens / 1000)}k de contexto`;
}

/**
 * Seleção de modelo do agente.
 *
 * A lista vem do catálogo curado (`lib/ai/providers/model-catalog.ts`) com os preços correntes
 * do AI Gateway. Um modelo persistido fora do catálogo — alias antigo ou id escolhido antes de
 * uma curadoria — continua válido e é exibido como está: a configuração de quem já roda não
 * deve mudar de significado porque a lista da UI mudou.
 */
export default function ModelSelectorField({ value, onChange }: ModelSelectorFieldProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { data, isLoading } = useAiAgentModels();

	const models = data?.modelos ?? [];
	const selected = models.find((model) => model.id === value) ?? null;

	return (
		<div className="flex w-full flex-col gap-1">
			<span className="text-start text-sm font-medium tracking-tight text-foreground/80">MODELO</span>

			<ModelSelector onOpenChange={setIsOpen} open={isOpen}>
				<ModelSelectorTrigger asChild>
					<Button className="w-full justify-between gap-2" disabled={isLoading} variant="outline">
						<span className="flex min-w-0 items-center gap-2">
							{selected ? <ModelSelectorLogo provider={selected.fornecedorSlug} /> : null}
							<ModelSelectorName>{selected?.nome ?? value}</ModelSelectorName>
						</span>
						<ChevronsUpDown className="size-4 shrink-0 opacity-50" />
					</Button>
				</ModelSelectorTrigger>

				<ModelSelectorContent title="Escolha do modelo do agente">
					<ModelSelectorInput placeholder="Buscar modelo..." />
					<ModelSelectorList>
						<ModelSelectorEmpty>Nenhum modelo encontrado.</ModelSelectorEmpty>
						{AI_AGENT_MODEL_PERFIL_ORDER.map((perfil) => {
							const group = models.filter((model) => model.perfil === perfil);
							if (group.length === 0) return null;
							return (
								<ModelSelectorGroup heading={AI_AGENT_MODEL_PERFIL_LABELS[perfil]} key={perfil}>
									{group.map((model) => (
										<ModelSelectorItem
											key={model.id}
											onSelect={() => {
												onChange(model.id);
												setIsOpen(false);
											}}
											// O valor alimenta a busca do cmdk: nome, fornecedor e id juntos.
											value={`${model.nome} ${model.fornecedor} ${model.id}`}
										>
											<ModelSelectorLogo provider={model.fornecedorSlug} />
											<div className="flex min-w-0 flex-col">
												<span className="flex items-center gap-1.5 truncate text-sm font-medium tracking-tight">
													{model.nome}
													{model.recomendado ? (
														<span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-primary">
															<Sparkles className="size-2.5" />
															RECOMENDADO
														</span>
													) : null}
												</span>
												<span className="truncate text-xs text-muted-foreground">
													{formatPrice(model.precoEntrada)} entrada · {formatPrice(model.precoSaida)} saída (por 1M de tokens)
												</span>
											</div>
											<Check className={cn("ml-auto size-4 shrink-0", value === model.id ? "opacity-100" : "opacity-0")} />
										</ModelSelectorItem>
									))}
								</ModelSelectorGroup>
							);
						})}
					</ModelSelectorList>
				</ModelSelectorContent>
			</ModelSelector>

			{selected ? (
				<p className="text-xs text-muted-foreground">
					{selected.descricao} {formatContextWindow(selected.janelaContexto)}.
					{data?.precosAtualizados === false ? " Preços de referência: não foi possível consultar o AI Gateway agora." : null}
				</p>
			) : (
				<p className="text-xs text-muted-foreground">
					{isLoading
						? "Carregando os modelos disponíveis..."
						: "Modelo configurado manualmente. Escolha um da lista para ver custo e descrição, ou mantenha como está."}
				</p>
			)}
		</div>
	);
}
