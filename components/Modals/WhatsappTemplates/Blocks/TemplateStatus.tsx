import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { TWhatsappTemplateQualityEnum, TWhatsappTemplateStatusEnum } from "@/schemas/enums";
import type { TWhatsappTemplatePhoneStatus } from "@/schemas/whatsapp-templates";
import { AlertCircle, CheckCircle, ChevronDown, CircleGauge, Phone } from "lucide-react";
import { useState } from "react";

type TemplateStatusProps = {
	statusGeral: TWhatsappTemplateStatusEnum;
	qualidadeGeral: TWhatsappTemplateQualityEnum;
	telefones: TWhatsappTemplatePhoneStatus[];
};

function StatusBadge({ status }: { status: TWhatsappTemplateStatusEnum }) {
	return (
		<span
			className={cn("text-xs font-black px-2 py-1 rounded", {
				"bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300": status === "APROVADO",
				"bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300": status === "PENDENTE",
				"bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300": status === "REJEITADO",
				"bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300": status === "PAUSADO",
				"bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300": status === "DESABILITADO" || status === "RASCUNHO",
			})}
		>
			{status}
		</span>
	);
}

function QualityBadge({ quality }: { quality: TWhatsappTemplateQualityEnum }) {
	return (
		<span
			className={cn("text-xs font-black px-2 py-1 rounded", {
				"bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300": quality === "ALTA",
				"bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300": quality === "MEDIA",
				"bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300": quality === "BAIXA",
				"bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300": quality === "PENDENTE",
			})}
		>
			{quality}
		</span>
	);
}

export default function TemplateStatus({ statusGeral, qualidadeGeral, telefones }: TemplateStatusProps) {
	const [isOpen, setIsOpen] = useState(false);

	if (telefones.length === 0) return null;

	const approvedCount = telefones.filter((t) => t.status === "APROVADO").length;
	const totalCount = telefones.length;

	return (
		<ResponsiveMenuSection title="STATUS DE SINCRONIZAÇÃO" icon={<CheckCircle size={15} />}>
			{/* Overall Status Summary */}
			<div className="w-full flex items-center justify-between gap-2 p-2 rounded bg-primary/5">
				<div className="flex items-center gap-2">
					<CheckCircle className="w-4 h-4 min-w-4 min-h-4" />
					<span className="text-sm font-medium">STATUS GERAL:</span>
					<StatusBadge status={statusGeral} />
				</div>
				<span className="text-xs text-muted-foreground">
					{approvedCount}/{totalCount} aprovados
				</span>
			</div>

			<div className="w-full flex items-center gap-2">
				<CircleGauge className="w-4 h-4 min-w-4 min-h-4" />
				<span className="text-sm font-medium">QUALIDADE GERAL:</span>
				<QualityBadge quality={qualidadeGeral} />
			</div>

			{/* Per-phone details (collapsible) */}
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
				<CollapsibleTrigger className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-primary/5 transition-colors cursor-pointer">
					<div className="flex items-center gap-2">
						<Phone className="w-4 h-4 min-w-4 min-h-4" />
						<span className="text-sm font-medium">DETALHES POR TELEFONE</span>
					</div>
					<ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
				</CollapsibleTrigger>
				<CollapsibleContent className="w-full">
					<div className="w-full flex flex-col gap-2 mt-2">
						{telefones.map((telefone) => (
							<div
								key={telefone.id}
								className="w-full flex flex-col gap-2 p-3 rounded-lg border border-primary/10 bg-card"
							>
								<div className="w-full flex items-center justify-between gap-2">
									<span className="text-sm font-medium truncate">
										{telefone.telefoneName || telefone.telefoneNumero || "Telefone"}
									</span>
									<StatusBadge status={telefone.status} />
								</div>
								{telefone.telefoneNumero && telefone.telefoneName && (
									<span className="text-xs text-muted-foreground">{telefone.telefoneNumero}</span>
								)}
								<div className="w-full flex items-center gap-2">
									<span className="text-xs text-muted-foreground">Qualidade:</span>
									<QualityBadge quality={telefone.qualidade} />
								</div>
								<div className="w-full flex items-center gap-2">
									<span className="text-xs text-muted-foreground font-mono">ID: {telefone.whatsappTemplateId}</span>
								</div>
								{telefone.status === "REJEITADO" && telefone.rejeicao && (
									<div className="w-full flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
										<AlertCircle className="w-4 h-4 min-w-4 min-h-4 text-red-600 dark:text-red-400 mt-0.5" />
										<div className="flex flex-col gap-1">
											<span className="text-xs font-medium text-red-800 dark:text-red-200">MOTIVO DA REJEIÇÃO:</span>
											<span className="text-xs text-red-700 dark:text-red-300">{telefone.rejeicao}</span>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</ResponsiveMenuSection>
	);
}
