import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
// @json-render/core usa internamente zod@4.3.6 mas o projeto tem zod@3.x.
// O cast "as any" nos schemas permite que o TypeScript compile — o runtime funciona
// porque a API básica do Zod v4 é compatível com a camada de compatibilidade zod/v4.
import { z } from "zod/v4";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZodSchema = any;

const distributionItemSchema = z.object({
	type: z.string(),
	count: z.number(),
	percentage: z.number(),
	revenue: z.string(),
	color: z.string(),
}) as AnyZodSchema;

/**
 * Catálogo json-render para os anúncios Campanha CAMPEÕES.
 *
 * Cada entrada mapeia um nome de tipo para o schema Zod de suas props.
 * As props contêm configuração semântica (bases de multiplicadores, dados de campanha).
 * Os pixels reais são calculados no registry a partir dos tokens de escala via contexto React.
 */
export const campeoesCatalog = defineCatalog(schema, {
	components: {
		CampeoesCanvas: {
			props: z.object({}) as AnyZodSchema,
			description:
				"Canvas raiz com gradiente de marca e font stack. Dimensões injetadas via contexto React pelo bridge renderer.",
		},
		CampeoesAtmosphere: {
			props: z.object({}) as AnyZodSchema,
			description: "Overlay atmosférico absoluto (noise, radial gradients, scan lines).",
		},
		CampeoesMainColumn: {
			props: z.object({}) as AnyZodSchema,
			description: "Coluna flex vertical com padding/gap calculados pelos tokens. Usada nos layouts feed e reels.",
		},
		CampeoesQuadradoFrame: {
			props: z.object({
				logoHeightBase: z.number().default(52),
				footerBottomBase: z.number().default(30),
			}) as AnyZodSchema,
			description:
				"Wrapper do layout quadrado. Calcula padBottom para evitar sobreposição com o footer absoluto e centraliza o herói.",
		},
		CampeoesHeroRow: {
			props: z.object({
				heroLayout: z.enum(["default", "fill"]).default("default"),
				heroBasisBase: z.number().default(332),
				headlineSizeBase: z.number().default(60),
				bodySizeBase: z.number().default(20),
			}) as AnyZodSchema,
			description:
				"Linha herói: esquerda=headline+body, direita=card de KPIs (receita/taxa/conversões). heroLayout='fill' para o quadrado.",
		},
		CampeoesCtaStrip: {
			props: z.object({
				flexDirection: z.enum(["row", "column"]).default("row"),
				buttonFontMultiplier: z.number().default(12),
				ctaLineSizeBase: z.number().default(20),
			}) as AnyZodSchema,
			description: "Faixa CTA com corpo de texto de marca e botão amarelo 'Venha já testar'.",
		},
		CampeoesClubPill: {
			props: z.object({}) as AnyZodSchema,
			description: "Pílula de status: CLUBE CAMPEÕES AMPÈRE+ com badge ATIVA.",
		},
		CampeoesMetricTrio: {
			props: z.object({}) as AnyZodSchema,
			description: "Grid de 3 cartões de métricas com dados de CAMPEOES_METRIC_TRIO das constants.",
		},
		CampeoesDistributionImpactRow: {
			props: z.object({
				items: z.array(distributionItemSchema),
				showTaglineBand: z.boolean().default(true),
				taglineFontMultiplier: z.number().default(12),
				tagline: z.string(),
			}) as AnyZodSchema,
			description:
				"Grid 2 colunas: gráfico de distribuição de conversões (7fr) + painéis de impacto de frequência/monetário (4fr).",
		},
		CampeoesDeliveryKpis: {
			props: z.object({
				valueFontMultiplier: z.number().default(19),
			}) as AnyZodSchema,
			description: "Grid de 4 tiles com KPIs de entrega de campanha (DELIVERY_KPIS das constants).",
		},
		CampeoesFooter: {
			props: z.object({
				logoHeightBase: z.number().default(52),
				footerBottomBase: z.number().default(30),
			}) as AnyZodSchema,
			description: "Footer absoluto com logo RecompraCRM e botão 'Comece grátis'.",
		},
	},
	actions: {},
});

export type CampeoesCatalog = typeof campeoesCatalog;
