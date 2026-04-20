import { cn } from "@/lib/utils";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaArrowConnectorProps = {
	tokens: PiorDiaLayoutTokens;
	/** cor do gradiente do início da seta (vem da etapa anterior) */
	fromColor: string;
	/** cor do gradiente do fim da seta (chega na próxima etapa) */
	toColor: string;
	className?: string;
};

/**
 * Seta vertical com curva sutil que conecta duas etapas do workflow.
 * Renderiza um SVG com gradiente do `fromColor` para o `toColor`,
 * incluindo pontos pulsantes (decorativos) e ponta de seta.
 */
export function PiorDiaArrowConnector({
	tokens,
	fromColor,
	toColor,
	className,
}: PiorDiaArrowConnectorProps) {
	const { t } = tokens;
	const height = Math.round(34 * t);
	const width = Math.round(36 * t);
	const gradId = `pior-dia-arrow-${fromColor.replace(/[^a-z0-9]/gi, "")}-${toColor.replace(/[^a-z0-9]/gi, "")}`;

	return (
		<div
			data-design-role="pior-dia-arrow-connector"
			className={cn(className)}
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				width: "100%",
				height,
			}}
		>
			<svg
				width={width}
				height={height}
				viewBox="0 0 40 48"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<linearGradient id={gradId} x1="20" y1="0" x2="20" y2="48" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stopColor={fromColor} stopOpacity="0.95" />
						<stop offset="100%" stopColor={toColor} stopOpacity="0.95" />
					</linearGradient>
				</defs>

				{/* Linha curva principal */}
				<path
					d="M20 2 C 22 14, 18 26, 20 38"
					stroke={`url(#${gradId})`}
					strokeWidth="2.5"
					strokeLinecap="round"
					fill="none"
				/>

				{/* Tracejado de fluxo (subliminar) */}
				<path
					d="M20 4 C 22 14, 18 26, 20 36"
					stroke={`url(#${gradId})`}
					strokeWidth="6"
					strokeLinecap="round"
					strokeOpacity="0.10"
					fill="none"
				/>

				{/* Ponta da seta */}
				<path
					d="M14 36 L20 44 L26 36"
					stroke={toColor}
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
				/>

				{/* Bolinha pulsante no topo */}
				<circle cx="20" cy="2" r="2.4" fill={fromColor} />
				<circle cx="20" cy="2" r="4.5" fill={fromColor} fillOpacity="0.18" />
			</svg>
		</div>
	);
}
