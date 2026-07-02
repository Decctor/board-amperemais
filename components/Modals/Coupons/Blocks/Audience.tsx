import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { useClientTags } from "@/lib/queries/clients";
import type { TUseInternalCouponState } from "@/state-hooks/use-internal-coupon-state";
import { RFMLabels } from "@/utils/rfm";
import { Plus, Tag, Trash2, Users } from "lucide-react";
import { useState } from "react";

type CouponAudienceBlockProps = {
	couponAudiences: TUseInternalCouponState["state"]["couponAudiences"];
	addCouponAudience: TUseInternalCouponState["addCouponAudience"];
	removeCouponAudience: TUseInternalCouponState["removeCouponAudience"];
};
export default function CouponAudienceBlock({ couponAudiences, addCouponAudience, removeCouponAudience }: CouponAudienceBlockProps) {
	const { data: clientTags } = useClientTags();
	const [mode, setMode] = useState<"TAG" | "RFM">("TAG");
	const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
	const [selectedRFMTitle, setSelectedRFMTitle] = useState<string | null>(null);

	function handleAdd() {
		if (mode === "TAG" && selectedTagId) {
			const tag = clientTags?.find((clientTag) => clientTag.id === selectedTagId);
			addCouponAudience({ clienteTagId: selectedTagId, segmentacaoRFM: null, clienteTagTitulo: tag?.titulo ?? null });
			setSelectedTagId(null);
		}
		if (mode === "RFM" && selectedRFMTitle) {
			addCouponAudience({ clienteTagId: null, segmentacaoRFM: selectedRFMTitle });
			setSelectedRFMTitle(null);
		}
	}

	return (
		<ResponsiveMenuSection title="AUDIÊNCIA" icon={<Users className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col gap-1">
				<p className="text-sm font-medium text-muted-foreground">
					Sem audiência, o cupom global vale para qualquer cliente identificado. Com audiência, o cliente precisa ter qualquer uma das tags ou estar em
					qualquer um dos segmentos RFM listados.
				</p>
			</div>
			<div className="w-full flex items-center gap-2">
				<Button variant={mode === "TAG" ? "default" : "ghost"} size="sm" onClick={() => setMode("TAG")}>
					POR TAG
				</Button>
				<Button variant={mode === "RFM" ? "default" : "ghost"} size="sm" onClick={() => setMode("RFM")}>
					POR SEGMENTO RFM
				</Button>
			</div>
			<div className="w-full flex items-end gap-2 flex-col lg:flex-row">
				<div className="w-full lg:w-3/4">
					{mode === "TAG" ? (
						<SelectInput
							value={selectedTagId}
							label="TAG DE CLIENTE"
							resetOptionLabel="NENHUMA"
							handleChange={(value) => setSelectedTagId(value)}
							options={(clientTags ?? []).map((clientTag) => ({ id: clientTag.id, value: clientTag.id, label: clientTag.titulo }))}
							onReset={() => setSelectedTagId(null)}
						/>
					) : (
						<SelectInput
							value={selectedRFMTitle}
							label="SEGMENTO RFM"
							resetOptionLabel="NENHUM"
							handleChange={(value) => setSelectedRFMTitle(value)}
							options={RFMLabels.map((rfmLabel, index) => ({ id: index, value: rfmLabel.text, label: rfmLabel.text }))}
							onReset={() => setSelectedRFMTitle(null)}
						/>
					)}
				</div>
				<Button
					className="flex items-center gap-2 w-full lg:w-1/4"
					size="sm"
					onClick={handleAdd}
					disabled={mode === "TAG" ? !selectedTagId : !selectedRFMTitle}
				>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR
				</Button>
			</div>
			<div className="w-full flex flex-col gap-1.5">
				{couponAudiences.map((audience, index) =>
					audience.deletar ? null : (
						<div
							key={`${audience.clienteTagId ?? audience.segmentacaoRFM}-${index}`}
							className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
						>
							<div className="flex items-center gap-1.5">
								{audience.clienteTagId ? <Tag className="w-3 min-w-3 h-3 min-h-3" /> : <Users className="w-3 min-w-3 h-3 min-h-3" />}
								<h3 className="text-xs font-bold tracking-tight uppercase">
									{audience.clienteTagId ? `TAG: ${audience.clienteTagTitulo ?? audience.clienteTagId}` : `SEGMENTO RFM: ${audience.segmentacaoRFM}`}
								</h3>
							</div>
							<Button variant="ghost" size="icon" onClick={() => removeCouponAudience(index)}>
								<Trash2 className="w-4 h-4 min-w-4 min-h-4 text-destructive" />
							</Button>
						</div>
					),
				)}
			</div>
		</ResponsiveMenuSection>
	);
}
