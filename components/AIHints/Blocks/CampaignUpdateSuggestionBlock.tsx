import { AlertCircle, CheckCircle2, Clock, List, Pencil, Sparkles, Target, Users } from "lucide-react";
import { TGetHintsOutputById } from "@/app/api/ai-hints/route";
import { ApprovalOrDismiss } from "./ApprovalOrDismiss";
import { SectionLabel } from "./SectionLabel";
import WhatsappTextPreview from "./WhatsappTextPreview";

type CampaignUpdateSuggestionBlockProps = {
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

const DURATION_UNIT_LABELS: Record<string, string> = {
	MINUTOS: "Minutos",
	HORAS: "Horas",
	DIAS: "Dias",
	SEMANAS: "Semanas",
	MESES: "Meses",
};

const EXECUTION_DIRECTION_LABELS: Record<string, string> = {
	ANTES: "Antes",
	DEPOIS: "Depois",
};

const ATTRIBUTION_MODEL_LABELS: Record<string, string> = {
	LAST_TOUCH: "Last Touch",
	FIRST_TOUCH: "First Touch",
	LINEAR: "Linear",
};

const RECURRENCE_TYPE_LABELS: Record<string, string> = {
	DIARIA: "Diária",
	SEMANAL: "Semanal",
	MENSAL: "Mensal",
};

const CASHBACK_TYPE_LABELS: Record<string, string> = {
	FIXO: "Fixo",
	PERCENTUAL: "Percentual",
};

const FIELD_LABELS: Record<string, string> = {
	titulo: "Título",
	descricao: "Descrição",
	ativo: "Ativa",
	gatilhoTipo: "Gatilho",
	execucaoAgendadaValor: "Valor de execução",
	execucaoAgendadaMedida: "Medida de execução",
	execucaoAgendadaDirecao: "Direção de execução",
	execucaoAgendadaBloco: "Horário de execução",
	permitirRecorrencia: "Permitir recorrência",
	frequenciaIntervaloValor: "Intervalo de frequência",
	frequenciaIntervaloMedida: "Medida de frequência",
	limiteEnviosSemanais: "Limite semanal de envios",
	whatsappConexaoTelefoneId: "Telefone do WhatsApp",
	atribuicaoModelo: "Modelo de atribuição",
	atribuicaoJanelaDias: "Janela de atribuição (dias)",
	cashbackGeracaoAtivo: "Gerar cashback na conversão",
	cashbackGeracaoTipo: "Tipo de cashback",
	cashbackGeracaoValor: "Valor do cashback",
	cashbackGeracaoExpiracaoMedida: "Medida de expiração do cashback",
	cashbackGeracaoExpiracaoValor: "Valor de expiração do cashback",
	recorrenciaTipo: "Tipo de recorrência",
	recorrenciaIntervalo: "Intervalo de recorrência",
	segmentations: "Segmentos",
};

function formatValue(key: string, value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (typeof value === "boolean") return value ? "Sim" : "Não";
	if (key === "gatilhoTipo" && typeof value === "string") return TRIGGER_LABELS[value] ?? value;
	if (
		(key === "execucaoAgendadaMedida" || key === "frequenciaIntervaloMedida" || key === "cashbackGeracaoExpiracaoMedida") &&
		typeof value === "string"
	) {
		return DURATION_UNIT_LABELS[value] ?? value;
	}
	if (key === "execucaoAgendadaDirecao" && typeof value === "string") return EXECUTION_DIRECTION_LABELS[value] ?? value;
	if (key === "atribuicaoModelo" && typeof value === "string") return ATTRIBUTION_MODEL_LABELS[value] ?? value;
	if (key === "recorrenciaTipo" && typeof value === "string") return RECURRENCE_TYPE_LABELS[value] ?? value;
	if (key === "cashbackGeracaoTipo" && typeof value === "string") return CASHBACK_TYPE_LABELS[value] ?? value;
	if (Array.isArray(value)) return value.join(", ");
	return String(value);
}

function valuesAreEqualForDisplay(key: string, before: unknown, after: unknown): boolean {
	return formatValue(key, before) === formatValue(key, after);
}

function ChangeIntentBadge({ unchanged }: { unchanged: boolean }) {
	if (unchanged) {
		return (
			<span className="inline-flex shrink-0 items-center rounded-full border border-blue-200/70 bg-blue-100/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-900 dark:border-blue-800/50 dark:bg-blue-950/55 dark:text-blue-200">
				MANTER
			</span>
		);
	}

	return (
		<span className="inline-flex shrink-0 items-center rounded-full border border-amber-300/70 bg-amber-100/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/45 dark:text-amber-200">
			ALTERAR
		</span>
	);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-start justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
			<span className="shrink-0 text-xs text-muted-foreground">{label}</span>
			<span className="text-right text-xs font-medium text-foreground">{value}</span>
		</div>
	);
}

export default function CampaignUpdateSuggestionBlock({ hint, callbacks }: CampaignUpdateSuggestionBlockProps) {
	const hintContent = hint.conteudo;
	if (hintContent.tipo !== "campaign-updates-suggestion") return null;
	const { dados } = hintContent;
	const { resumoExecutivo, criterios, sugestao } = dados;
	const { currentSummary, currentConfig, proposedChanges } = sugestao;
	const currentValues = (currentConfig ?? currentSummary) as Record<string, unknown>;

	const changedKeys = Object.entries(proposedChanges)
		.filter(([, value]) => value !== undefined)
		.map(([key]) => key);

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
				<SectionLabel icon={<Target />} label="CAMPANHA ALVO" />
				<div className="flex flex-col rounded-lg border border-border bg-secondary/20 px-3 py-1">
					<InfoRow label="Título" value={currentSummary.titulo} />
					<InfoRow label="Gatilho atual" value={TRIGGER_LABELS[currentSummary.gatilhoTipo] ?? currentSummary.gatilhoTipo} />
					<InfoRow label="Status atual" value={currentSummary.ativo ? "Ativa" : "Inativa"} />
					{currentSummary.segmentations.length > 0 && <InfoRow label="Segmentos atuais" value={currentSummary.segmentations.join(", ")} />}
				</div>
			</div>

			{changedKeys.length > 0 && (
				<div className="flex flex-col gap-2">
					<SectionLabel icon={<Pencil />} label="ALTERAÇÕES PROPOSTAS" />
					<div className="flex flex-col rounded-lg border border-amber-200/60 bg-amber-50/30 px-3 py-1 dark:border-amber-800/30 dark:bg-amber-900/10">
						{changedKeys.map((key) => {
							const before = currentValues[key];
							const after = (proposedChanges as Record<string, unknown>)[key];
							const unchanged = valuesAreEqualForDisplay(key, before, after);

							return (
								<div key={key} className="flex items-start justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
									<div className="flex min-w-0 flex-1 items-start gap-2">
										<ChangeIntentBadge unchanged={unchanged} />
										<span className="text-xs text-muted-foreground">{FIELD_LABELS[key] ?? key}</span>
									</div>
									<div className="flex min-w-0 items-center justify-end gap-1.5 text-right">
										{unchanged ? (
											<span className="text-xs font-medium text-foreground">{formatValue(key, after)}</span>
										) : (
											<>
												<span className="shrink-0 text-[11px] text-muted-foreground line-through">{formatValue(key, before)}</span>
												<span className="shrink-0 text-[11px] text-amber-600 dark:text-amber-400">→</span>
												<span className="wrap-break-word text-xs font-medium text-foreground">{formatValue(key, after)}</span>
											</>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{sugestao.segmentations && sugestao.segmentations.length > 0 && (
				<div className="flex flex-col gap-2">
					<SectionLabel icon={<Users />} label="NOVOS SEGMENTOS-ALVO" />
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

			{sugestao.impactoEsperado && (
				<div className="flex flex-col gap-2">
					<SectionLabel icon={<Target />} label="IMPACTO ESPERADO" />
					<p className="pl-1 text-sm leading-relaxed text-foreground/75">{sugestao.impactoEsperado}</p>
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
				<span className="text-xs text-muted-foreground">Esta é uma sugestão de atualização — as alterações não são aplicadas automaticamente.</span>
			</div>

			<ApprovalOrDismiss hint={hint} callbacks={callbacks} />
		</div>
	);
}
