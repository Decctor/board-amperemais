import NumberInput from "@/components/Inputs/NumberInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseFiscalSeriesState } from "@/state-hooks/use-fiscal-series-state";
import { Hash } from "lucide-react";

type FiscalSeriesNumberingBlockProps = {
	fiscalSeries: TUseFiscalSeriesState["state"]["fiscalSeries"];
	updateFiscalSeries: TUseFiscalSeriesState["updateFiscalSeries"];
};
export default function FiscalSeriesNumberingBlock({ fiscalSeries, updateFiscalSeries }: FiscalSeriesNumberingBlockProps) {
	return (
		<ResponsiveMenuSection title="NUMERAÇÃO" icon={<Hash className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-start gap-2 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput label="SÉRIE" value={fiscalSeries.serie} placeholder="Ex.: 1" handleChange={(value) => updateFiscalSeries({ serie: value })} />
				</div>
				<div className="w-full lg:w-1/2">
					<NumberInput
						label="PRÓXIMO NÚMERO"
						value={fiscalSeries.proximoNumero}
						placeholder="Ex.: 1"
						handleChange={(value) => updateFiscalSeries({ proximoNumero: value })}
					/>
				</div>
			</div>
			<p className="text-xs text-muted-foreground italic">
				Atenção: o <span className="font-medium">próximo número</span> é incrementado automaticamente a cada emissão autorizada. Altere manualmente apenas
				se precisar sincronizar com a numeração já utilizada junto à SEFAZ — valores incorretos podem causar rejeição de documentos.
			</p>
		</ResponsiveMenuSection>
	);
}
