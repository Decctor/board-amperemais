import CheckboxInput from "@/components/Inputs/CheckboxInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import type { TFiscalDocumentEnvironmentEnum, TFiscalDocumentTypeEnum } from "@/schemas/enums";
import type { TUseFiscalSeriesState } from "@/state-hooks/use-fiscal-series-state";
import { LayoutGrid } from "lucide-react";

const FISCAL_DOCUMENT_TYPE_OPTIONS: { value: TFiscalDocumentTypeEnum; label: string }[] = [
	{ value: "NFCE", label: "NFC-E" },
	{ value: "NFE", label: "NF-E" },
	{ value: "NFSE", label: "NFS-E" },
];

const FISCAL_DOCUMENT_ENVIRONMENT_OPTIONS: { value: TFiscalDocumentEnvironmentEnum; label: string }[] = [
	{ value: "HOMOLOGACAO", label: "HOMOLOGAÇÃO" },
	{ value: "PRODUCAO", label: "PRODUÇÃO" },
];

type FiscalSeriesGeneralBlockProps = {
	fiscalSeries: TUseFiscalSeriesState["state"]["fiscalSeries"];
	updateFiscalSeries: TUseFiscalSeriesState["updateFiscalSeries"];
};
export default function FiscalSeriesGeneralBlock({ fiscalSeries, updateFiscalSeries }: FiscalSeriesGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-center">
				<CheckboxInput
					checked={fiscalSeries.ativo}
					labelTrue="SÉRIE ATIVA"
					labelFalse="SÉRIE INATIVA"
					handleChange={(value) => updateFiscalSeries({ ativo: value })}
					justify="justify-center"
				/>
			</div>

			<div className="w-full flex flex-col items-center gap-1 my-2">
				<h3 className="text-start text-sm font-medium tracking-tight text-primary/80">TIPO DE DOCUMENTO</h3>
				<div className="w-full flex items-center gap-2 justify-center flex-wrap">
					{FISCAL_DOCUMENT_TYPE_OPTIONS.map((option) => (
						<Button
							key={option.value}
							variant={fiscalSeries.tipoDocumento === option.value ? "default" : "ghost"}
							size="fit"
							className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
							onClick={() => updateFiscalSeries({ tipoDocumento: option.value })}
						>
							{option.label}
						</Button>
					))}
				</div>
			</div>

			<div className="w-full flex flex-col items-center gap-1 my-2">
				<h3 className="text-start text-sm font-medium tracking-tight text-primary/80">AMBIENTE</h3>
				<div className="w-full flex items-center gap-2 justify-center flex-wrap">
					{FISCAL_DOCUMENT_ENVIRONMENT_OPTIONS.map((option) => (
						<Button
							key={option.value}
							variant={fiscalSeries.ambiente === option.value ? "default" : "ghost"}
							size="fit"
							className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
							onClick={() => updateFiscalSeries({ ambiente: option.value })}
						>
							{option.label}
						</Button>
					))}
				</div>
				<p className="text-xs text-muted-foreground text-center italic">
					Use <span className="font-medium">HOMOLOGAÇÃO</span> para testes sem valor fiscal e <span className="font-medium">PRODUÇÃO</span>{" "}
					para documentos com valor fiscal real.
				</p>
			</div>
		</ResponsiveMenuSection>
	);
}
