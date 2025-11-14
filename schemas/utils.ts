import z from "zod";

const UtilsRFmSchema = z.object({
	identificador: z.enum(["CONFIG_RFM"]),
	valor: z.object({
		identificador: z.enum(["CONFIG_RFM"]),
		frequencia: z.object({
			"5": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"4": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"3": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"2": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"1": z.object({
				min: z.number(),
				max: z.number(),
			}),
		}),
		recencia: z.object({
			"5": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"4": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"3": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"2": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"1": z.object({
				min: z.number(),
				max: z.number(),
			}),
		}),
		monetario: z.object({
			"5": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"4": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"3": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"2": z.object({
				min: z.number(),
				max: z.number(),
			}),
			"1": z.object({
				min: z.number(),
				max: z.number(),
			}),
		}),
	}),
});

const UtilsOnlineImportationSchema = z.object({
	identificador: z.enum(["ONLINE_IMPORTATION"]),
	valor: z.object({
		identificador: z.enum(["ONLINE_IMPORTATION"]),
		dados: z.record(z.string(), z.any()),
	}),
});

export const UtilsSchema = z.discriminatedUnion("identificador", [UtilsRFmSchema, UtilsOnlineImportationSchema]);
export type TRFMConfig = z.infer<typeof UtilsSchema>;
export type TUtilsValue = z.infer<typeof UtilsSchema>["valor"];
