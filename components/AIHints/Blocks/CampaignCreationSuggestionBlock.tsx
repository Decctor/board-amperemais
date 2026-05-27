import { AlertCircle, CheckCircle2, Clock, List, Sparkles, Target, Users, Zap } from "lucide-react";
import { TGetHintsOutputById } from "@/app/api/ai-hints/route";
import { ApprovalOrDismiss } from "./ApprovalOrDismiss";
import { SectionLabel } from "./SectionLabel";
import WhatsappTextPreview from "./WhatsappTextPreview";

type CampaignCreationSuggestionBlockProps = {
	hint: TGetHintsOutputById;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

const TRIGGER_LABELS: Record<string, string> = {
	"NOVA-COMPRA": "Nova Compra",
	"PRIMEIRA-COMPRA": "Primeira Compra",
	"PERMANÊNCIA-SEGMENTAÇÃO": "Permanência em Segmentação",
	"ENTRADA-SEGMENTAÇÃO": "Entrada em Segmentação",
	"CASHBACK-ACUMULADO": "Cashback Acumulado",
	"CASHBACK-EXPIRANDO": "Cashback Expirando",
	ANIVERSARIO_CLIENTE: "Aniversário do Cliente",
	"QUANTIDADE-TOTAL-COMPRAS": "Quantidade Total de Compras",
	"VALOR-TOTAL-COMPRAS": "Valor Total de Compras",
	RECORRENTE: "Recorrente",
	"PIOR-DIA-VENDAS": "Pior Dia de Vendas",
	"USO-UNICO": "Uso Único",
};

const ATTRIBUTION_LABELS: Record<string, string> = {
	LAST_TOUCH: "Último toque",
	FIRST_TOUCH: "Primeiro toque",
	LINEAR: "Linear",
};

function formatExecution(
	valor: number | null | undefined,
	medida: string | null | undefined,
	direcao: string | null | undefined,
	bloco: string | null | undefined,
): string {
	const parts: string[] = [];
	if (valor === 0) {
		parts.push("Imediato");
	} else if (valor != null && medida) {
		const dir = direcao === "ANTES" ? "antes" : "depois";
		parts.push(`${valor} ${medida.toLowerCase()} ${dir}`);
	}
	if (bloco) parts.push(`às ${bloco}`);
	return parts.join(" ") || "—";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-start justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
			<span className="shrink-0 text-xs text-muted-foreground">{label}</span>
			<span className="text-right text-xs font-medium text-foreground">{value}</span>
		</div>
	);
}

export default function CampaignCreationSuggestionBlock({ hint, callbacks }: CampaignCreationSuggestionBlockProps) {
	const hintContent = hint.conteudo;
	if (hintContent.tipo !== "campaign-creation-suggestion") return null;
	const { dados } = hintContent;
	const { resumoExecutivo, criterios, sugestao } = dados;

	return (
		<div className="flex w-full flex-col gap-5">
			<div className="flex flex-col gap-2">
				<SectionLabel icon={<Sparkles />} label="RESUMO EXECUTIVO" />
				<p className="pl-1 text-sm leading-relaxed text-foreground/75">{resumoExecutivo}</p>
			</div>

			{criterios.length > 0 && (
				<div className="flex flex-col gap-2">
					<SectionLabel icon={<List />} label="CRITÉRIOS DE ANÁLISE" />
					<ul className="flex flex-col gap-1.5">
						{criterios.map((criterio, i) => (
							<li key={i.toString()} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80">
								<CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
								<span>{criterio}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="flex flex-col gap-2">
				<SectionLabel icon={<Zap />} label="CONFIGURAÇÃO SUGERIDA" />
				<div className="flex flex-col rounded-lg border border-border bg-secondary/20 px-3 py-1">
					<InfoRow label="Título" value={sugestao.titulo} />
					<InfoRow label="Gatilho" value={TRIGGER_LABELS[sugestao.gatilhoTipo] ?? sugestao.gatilhoTipo} />
					{sugestao.gatilhoTotalCashbackAcumuladoValorMinimo != null && (
						<InfoRow label="Mínimo de cashback" value={`R$ ${sugestao.gatilhoTotalCashbackAcumuladoValorMinimo.toFixed(2)}`} />
					)}
					<InfoRow
						label="Disparo"
						value={formatExecution(
							sugestao.execucaoAgendadaValor,
							sugestao.execucaoAgendadaMedida,
							sugestao.execucaoAgendadaDirecao,
							sugestao.execucaoAgendadaBloco,
						)}
					/>
					{sugestao.permitirRecorrencia && sugestao.frequenciaIntervaloValor != null && sugestao.frequenciaIntervaloMedida && (
						<InfoRow
							label="Controle de frequência"
							value={`A cada ${sugestao.frequenciaIntervaloValor} ${sugestao.frequenciaIntervaloMedida.toLowerCase()}`}
						/>
					)}
					{sugestao.limiteEnviosSemanais != null && <InfoRow label="Limite semanal de envios" value={String(sugestao.limiteEnviosSemanais)} />}
					{sugestao.atribuicaoModelo && (
						<InfoRow
							label="Modelo de atribuição"
							value={`${ATTRIBUTION_LABELS[sugestao.atribuicaoModelo] ?? sugestao.atribuicaoModelo} (${sugestao.atribuicaoJanelaDias ?? "—"} dias)`}
						/>
					)}
					<InfoRow label="Cashback na conversão" value={sugestao.cashbackGeracaoAtivo ? "Sim" : "Não"} />
				</div>
			</div>

			{sugestao.segmentations && sugestao.segmentations.length > 0 && (
				<div className="flex flex-col gap-2">
					<SectionLabel icon={<Users />} label="SEGMENTOS-ALVO" />
					<div className="flex flex-wrap gap-1.5">
						{sugestao.segmentations.map((seg) => (
							<span
								key={seg}
								className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand"
							>
								{seg}
							</span>
						))}
					</div>
				</div>
			)}

			{sugestao.messageTemplateText && <WhatsappTextPreview text={sugestao.messageTemplateText} />}

			{sugestao.objetivoEsperado && (
				<div className="flex flex-col gap-2">
					<SectionLabel icon={<Target />} label="OBJETIVO ESPERADO" />
					<p className="pl-1 text-sm leading-relaxed text-foreground/75">{sugestao.objetivoEsperado}</p>
				</div>
			)}

			{sugestao.justificativa && (
				<div className="flex flex-col gap-2">
					<SectionLabel icon={<AlertCircle />} label="JUSTIFICATIVA" />
					<p className="pl-1 text-sm leading-relaxed text-foreground/75">{sugestao.justificativa}</p>
				</div>
			)}

			<div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-muted/30 px-3 py-2">
				<Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<span className="text-xs text-muted-foreground">
					Esta campanha não é criada automaticamente — revise os detalhes e crie-a quando estiver pronto.
				</span>
			</div>

			<ApprovalOrDismiss hint={hint} callbacks={callbacks} />
		</div>
	);
}
