import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod/v4";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZodSchema = any;

const statePathSchema = z.object({ $state: z.string() }).strict() as AnyZodSchema;

const lengthSchema = z.union([z.number(), z.string(), statePathSchema]) as AnyZodSchema;
const lengthArraySchema = z.array(lengthSchema) as AnyZodSchema;
const textWeightSchema = z.enum(["regular", "medium", "semibold", "bold"]) as AnyZodSchema;

const sharedLayoutProps = {
	position: z.enum(["relative", "absolute"]).optional(),
	top: lengthSchema.optional(),
	right: lengthSchema.optional(),
	bottom: lengthSchema.optional(),
	left: lengthSchema.optional(),
	width: lengthSchema.optional(),
	height: lengthSchema.optional(),
	minWidth: lengthSchema.optional(),
	minHeight: lengthSchema.optional(),
	maxWidth: lengthSchema.optional(),
	maxHeight: lengthSchema.optional(),
	flex: z.union([z.number(), z.string()]).optional(),
	zIndex: z.number().optional(),
	overflow: z.enum(["visible", "hidden"]).optional(),
	opacity: z.number().optional(),
	background: z.string().optional(),
	border: z.string().optional(),
	borderTop: z.string().optional(),
	borderRight: z.string().optional(),
	borderBottom: z.string().optional(),
	borderLeft: z.string().optional(),
	borderRadius: lengthSchema.optional(),
	boxShadow: z.string().optional(),
	rotateDeg: z.number().optional(),
	backdropBlur: lengthSchema.optional(),
	pointerEvents: z.enum(["none", "auto"]).optional(),
	mixBlendMode: z.string().optional(),
	backgroundImage: z.string().optional(),
	backgroundSize: z.string().optional(),
	padding: lengthSchema.optional(),
	paddingX: lengthSchema.optional(),
	paddingY: lengthSchema.optional(),
	paddingTop: lengthSchema.optional(),
	paddingRight: lengthSchema.optional(),
	paddingBottom: lengthSchema.optional(),
	paddingLeft: lengthSchema.optional(),
	margin: lengthSchema.optional(),
	marginTop: lengthSchema.optional(),
	marginBottom: lengthSchema.optional(),
	marginLeft: lengthSchema.optional(),
	marginRight: lengthSchema.optional(),
	alignSelf: z.enum(["auto", "stretch", "flex-start", "center", "flex-end"]).optional(),
	justifySelf: z.enum(["auto", "stretch", "start", "center", "end"]).optional(),
};

const textSpanSchema = z
	.object({
		text: z.string(),
		color: z.string().optional(),
		weight: textWeightSchema.optional(),
		underlineColor: z.string().optional(),
		underlineThickness: z.number().optional(),
		skipInkNone: z.boolean().optional(),
	})
	.strict() as AnyZodSchema;

const distributionItemSchema = z
	.object({
		label: z.string(),
		count: z.number(),
		percentage: z.number(),
		revenue: z.string(),
		color: z.string(),
	})
	.strict() as AnyZodSchema;

const insightItemSchema = z
	.object({
		label: z.string(),
		value: z.string(),
		positive: z.boolean().optional(),
	})
	.strict() as AnyZodSchema;

export const mediaCatalog = defineCatalog(schema, {
	components: {
		MediaCanvas: {
			props: z
				.object({
					background: z.string().optional(),
					fontFamily: z.string().optional(),
					borderRadius: lengthSchema.optional(),
					overflow: z.enum(["visible", "hidden"]).optional(),
				})
				.strict() as AnyZodSchema,
			description: "Canvas raiz para posts, com dimensões vindas do playground.",
		},
		MediaBox: {
			props: z.object(sharedLayoutProps).strict() as AnyZodSchema,
			description: "Bloco genérico para camadas decorativas e posicionamento absoluto.",
		},
		MediaStack: {
			props: z
				.object({
					...sharedLayoutProps,
					direction: z.enum(["row", "column"]).optional(),
					gap: lengthSchema.optional(),
					alignItems: z.enum(["stretch", "flex-start", "center", "flex-end"]).optional(),
					justifyContent: z.enum(["flex-start", "center", "flex-end", "space-between", "space-around"]).optional(),
					wrap: z.boolean().optional(),
				})
				.strict() as AnyZodSchema,
			description: "Layout flex declarativo para colunas e linhas.",
		},
		MediaGrid: {
			props: z
				.object({
					...sharedLayoutProps,
					columns: z.union([z.string(), lengthArraySchema, statePathSchema]).optional(),
					rows: z.union([z.string(), lengthArraySchema, statePathSchema]).optional(),
					gap: lengthSchema.optional(),
					columnGap: lengthSchema.optional(),
					rowGap: lengthSchema.optional(),
					alignItems: z.enum(["stretch", "start", "center", "end"]).optional(),
					justifyItems: z.enum(["stretch", "start", "center", "end"]).optional(),
				})
				.strict() as AnyZodSchema,
			description: "Layout grid para heróis, faixas e grupos de métricas.",
		},
		MediaSurface: {
			props: z
				.object({
					...sharedLayoutProps,
					direction: z.enum(["row", "column"]).optional(),
					gap: lengthSchema.optional(),
					alignItems: z.enum(["stretch", "flex-start", "center", "flex-end"]).optional(),
					justifyContent: z.enum(["flex-start", "center", "flex-end", "space-between"]).optional(),
				})
				.strict() as AnyZodSchema,
			description: "Superfície visual com background, bordas, sombras e filhos.",
		},
		MediaText: {
			props: z
				.object({
					text: z.string().optional(),
					lines: z.array(z.array(textSpanSchema)).optional(),
					size: z.number(),
					weight: textWeightSchema.optional(),
					color: z.string().optional(),
					lineHeight: z.number().optional(),
					tracking: z.string().optional(),
					shadow: z.string().optional(),
					align: z.enum(["left", "center", "right"]).optional(),
					uppercase: z.boolean().optional(),
					opacity: z.number().optional(),
					marginTop: lengthSchema.optional(),
					maxWidth: lengthSchema.optional(),
					whiteSpace: z.enum(["normal", "nowrap"]).optional(),
				})
				.strict() as AnyZodSchema,
			description: "Texto rico com suporte a spans coloridos por linha.",
		},
		MediaBadge: {
			props: z
				.object({
					label: z.string(),
					background: z.string(),
					color: z.string(),
					fontSize: z.number(),
					fontWeight: textWeightSchema.optional(),
					borderRadius: lengthSchema.optional(),
					paddingX: lengthSchema.optional(),
					paddingY: lengthSchema.optional(),
					border: z.string().optional(),
					boxShadow: z.string().optional(),
					tracking: z.string().optional(),
				})
				.strict() as AnyZodSchema,
			description: "Pílula de apoio para status e CTAs compactos.",
		},
		MediaMetricCard: {
			props: z
				.object({
					label: z.string(),
					value: z.string(),
					background: z.string(),
					valueColor: z.string().optional(),
					labelColor: z.string().optional(),
					border: z.string().optional(),
					boxShadow: z.string().optional(),
					borderRadius: lengthSchema.optional(),
					paddingX: lengthSchema.optional(),
					paddingY: lengthSchema.optional(),
					labelSize: z.number().optional(),
					valueSize: z.number().optional(),
					labelUppercase: z.boolean().optional(),
					align: z.enum(["left", "center", "right"]).optional(),
				})
				.strict() as AnyZodSchema,
			description: "Cartão compacto de métrica com rótulo e valor.",
		},
		MediaDistributionListCard: {
			props: z
				.object({
					title: z.string(),
					items: z.array(distributionItemSchema),
					tagline: z.string().optional(),
					background: z.string(),
					border: z.string().optional(),
					boxShadow: z.string().optional(),
					borderRadius: lengthSchema.optional(),
					paddingX: lengthSchema.optional(),
					paddingY: lengthSchema.optional(),
				})
				.strict() as AnyZodSchema,
			description: "Card de distribuição com barras, percentuais e receita por categoria.",
		},
		MediaInsightPanel: {
			props: z
				.object({
					title: z.string(),
					items: z.array(insightItemSchema),
					background: z.string(),
					border: z.string().optional(),
					boxShadow: z.string().optional(),
					borderRadius: lengthSchema.optional(),
					paddingX: lengthSchema.optional(),
					paddingY: lengthSchema.optional(),
				})
				.strict() as AnyZodSchema,
			description: "Painel curto de insights positivos e negativos com pares label/valor.",
		},
		MediaLogo: {
			props: z
				.object({
					asset: z.enum([
						"recompra-horizontal-colorful",
						"recompra-horizontal-dark",
						"recompra-icon-colorful",
						"recompra-icon-white",
					]),
					alt: z.string(),
					height: z.number(),
					maxWidth: lengthSchema.optional(),
					objectPosition: z.string().optional(),
				})
				.strict() as AnyZodSchema,
			description: "Logo registrada via chave estável, em vez de path no spec.",
		},
	},
	actions: {},
});

export type TMediaCatalog = typeof mediaCatalog;
