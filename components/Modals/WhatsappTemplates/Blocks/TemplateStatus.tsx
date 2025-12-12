import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { cn } from "@/lib/utils";
import type { TWhatsappTemplateQualityEnum, TWhatsappTemplateStatusEnum } from "@/schemas/enums";
import { AlertCircle, CheckCircle, Code } from "lucide-react";

type TemplateStatusProps = {
	whatsappTemplateId: string | null;
	status: TWhatsappTemplateStatusEnum | null;
	quality: TWhatsappTemplateQualityEnum | null;
	motivoRejeicao?: string | null;
};
export default function TemplateStatus({ whatsappTemplateId, status, quality, motivoRejeicao }: TemplateStatusProps) {
	if (!whatsappTemplateId) return null;
	return (
		<ResponsiveMenuSection title="STATUS DE SINCRONIZAÇÃO" icon={<CheckCircle size={15} />}>
			<div className="w-full flex items-center gap-2">
				<Code className="w-4 h-4 min-w-4 min-h-4" />
				<span className="text-sm font-medium">ID DO TEMPLATE NO WHATSAPP:</span>
				<span className="text-xs font-black px-2 py-1 rounded bg-primary/10">{whatsappTemplateId}</span>
			</div>
			<div className="w-full flex items-center gap-2">
				<CheckCircle className="w-4 h-4 min-w-4 min-h-4" />
				<span className="text-sm font-medium">STATUS:</span>
				<span
					className={cn("text-xs font-black px-2 py-1 rounded", {
						"bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300": status === "APROVADO",
						"bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300": status === "PENDENTE",
						"bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300": status === "REJEITADO",
						"bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300": status === "PAUSADO",
						"bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300": status === "DESABILITADO",
					})}
				>
					{status}
				</span>
			</div>
			{status === "REJEITADO" && motivoRejeicao && (
				<div className="w-full flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
					<AlertCircle className="w-4 h-4 min-w-4 min-h-4 text-red-600 dark:text-red-400 mt-0.5" />
					<div className="flex flex-col gap-1">
						<span className="text-sm font-medium text-red-800 dark:text-red-200">MOTIVO DA REJEIÇÃO:</span>
						<span className="text-xs text-red-700 dark:text-red-300">{motivoRejeicao}</span>
					</div>
				</div>
			)}
			<div className="w-full flex items-center gap-2">
				<CheckCircle className="w-4 h-4 min-w-4 min-h-4" />
				<span className="text-sm font-medium">QUALIDADE:</span>
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
			</div>
		</ResponsiveMenuSection>
	);
}
