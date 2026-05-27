import { cn } from "@/lib/utils";
import {
	CampeoesDistributionCard,
	type CampeoesDistributionItem,
} from "./campeoes-distribution-card";
import { CampeoesImpactPanels } from "./campeoes-impact-panels";
import type { CampeoesLayoutTokens } from "../scale";

type CampeoesDistributionImpactRowProps = {
	tokens: CampeoesLayoutTokens;
	items: CampeoesDistributionItem[];
	showTaglineBand: boolean;
	taglineFontMultiplier: number;
	tagline: string;
	className?: string;
};

/** ~65% Conversões por Tipo + ~35% coluna vertical com os dois painéis de impacto */
export function CampeoesDistributionImpactRow({
	tokens,
	items,
	showTaglineBand,
	taglineFontMultiplier,
	tagline,
	className,
}: CampeoesDistributionImpactRowProps) {
	const { t } = tokens;
	const gap = Math.round(14 * t);

	return (
		<div
			data-design-role="campeoes-distribution-impact-row"
			className={cn(className)}
			style={{
				display: "grid",
				gridTemplateColumns: "minmax(0, 7fr) minmax(0, 4fr)",
				gap,
				width: "100%",
				alignItems: "stretch",
			}}
		>
			<div
				style={{
					minWidth: 0,
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
				}}
			>
				<CampeoesDistributionCard
					tokens={tokens}
					items={items}
					showTaglineBand={showTaglineBand}
					taglineFontMultiplier={taglineFontMultiplier}
					tagline={tagline}
					fillHeight
				/>
			</div>
			<div
				style={{
					minWidth: 0,
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
				}}
			>
				<CampeoesImpactPanels
					tokens={tokens}
					fillHeight
					className="campeoes-distribution-impact-row__impacts"
				/>
			</div>
		</div>
	);
}
