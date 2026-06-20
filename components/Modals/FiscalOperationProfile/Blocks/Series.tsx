import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useFiscalSeries } from "@/lib/queries/fiscal";
import type { TUseFiscalOperationProfileState } from "@/state-hooks/use-fiscal-operation-profile-state";
import { BookText } from "lucide-react";
import { useMemo } from "react";

type FiscalOperationProfileSeriesBlockProps = {
	fiscalOperationProfile: TUseFiscalOperationProfileState["state"]["fiscalOperationProfile"];
	updateFiscalOperationProfile: TUseFiscalOperationProfileState["updateFiscalOperationProfile"];
};
export default function FiscalOperationProfileSeriesBlock({
	fiscalOperationProfile,
	updateFiscalOperationProfile,
}: FiscalOperationProfileSeriesBlockProps) {
	const { data: series, isLoading } = useFiscalSeries();

	const seriesOptions = useMemo(() => {
		if (!series) return [];
		return series
			.filter((s) => s.tipoDocumento === fiscalOperationProfile.tipoDocumento)
			.map((s) => ({
				id: s.id,
				value: s.id,
				label: `SÉRIE ${s.serie} · ${s.ambiente} · PRÓX. Nº ${s.proximoNumero}`,
			}));
	}, [series, fiscalOperationProfile.tipoDocumento]);

	return (
		<ResponsiveMenuSection title="SÉRIE PADRÃO" icon={<BookText className="h-4 min-h-4 w-4 min-w-4" />}>
			<p className="text-sm font-medium text-muted-foreground">
				Série fiscal padrão utilizada pela emissão deste perfil. Apenas séries do mesmo tipo de documento ({fiscalOperationProfile.tipoDocumento}) ficam
				disponíveis.
			</p>
			<SelectInput
				label="SÉRIE FISCAL PADRÃO"
				value={fiscalOperationProfile.seriePadraoId ?? null}
				options={isLoading ? null : seriesOptions}
				resetOptionLabel={seriesOptions.length === 0 ? "NENHUMA SÉRIE DISPONÍVEL" : "NENHUMA SÉRIE VINCULADA"}
				handleChange={(value) => updateFiscalOperationProfile({ seriePadraoId: value })}
				onReset={() => updateFiscalOperationProfile({ seriePadraoId: null })}
			/>
		</ResponsiveMenuSection>
	);
}
