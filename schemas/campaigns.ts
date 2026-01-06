import z from "zod";
import { CampaignTriggerTypeEnum, InteractionsCronJobTimeBlocksEnum, TimeDurationUnitsEnum } from "./enums";

export const CampaignSchema = z.object({
	ativo: z
		.boolean({
			required_error: "Ativo da campanha não informado.",
			invalid_type_error: "Tipo não válido para o ativo da campanha.",
		})
		.default(true),
	titulo: z.string({
		required_error: "Título da campanha não informado.",
		invalid_type_error: "Tipo não válido para o título da campanha.",
	}),
	descricao: z
		.string({
			required_error: "Descrição da campanha não informada.",
			invalid_type_error: "Tipo não válido para a descrição da campanha.",
		})
		.optional()
		.nullable(),
	gatilhoTipo: CampaignTriggerTypeEnum,

	// Specific for "PERMANÊNCIA-SEGMENTAÇÃO"
	gatilhoTempoPermanenciaMedida: TimeDurationUnitsEnum.optional().nullable(),
	gatilhoTempoPermanenciaValor: z
		.number({
			required_error: "Valor da permanência não informado.",
			invalid_type_error: "Tipo não válido para o valor da permanência.",
		})
		.optional()
		.nullable(),

	execucaoAgendadaMedida: TimeDurationUnitsEnum,
	execucaoAgendadaValor: z.number({
		required_error: "Valor da execução agendada não informado.",
		invalid_type_error: "Tipo não válido para o valor da execução agendada.",
	}),
	execucaoAgendadaBloco: InteractionsCronJobTimeBlocksEnum,
	// Whatsapp specific
	whatsappTelefoneId: z.string({
		required_error: "ID do telefone do WhatsApp não informado.",
		invalid_type_error: "Tipo não válido para o ID do telefone do WhatsApp.",
	}),
	whatsappTemplateId: z.string({
		required_error: "ID do template do WhatsApp não informado.",
		invalid_type_error: "Tipo não válido para o ID do template do WhatsApp.",
	}),
	autorId: z.string({
		required_error: "ID do autor da campanha não informado.",
		invalid_type_error: "Tipo não válido para o ID do autor da campanha.",
	}),
	dataInsercao: z
		.string({
			required_error: "Data de inserção da campanha não informada.",
			invalid_type_error: "Tipo não válido para a data de inserção da campanha.",
		})
		.datetime({ message: "Tipo não válido para a data de inserção da campanha." })
		.transform((val) => new Date(val)),
});

export const CampaignSegmentationSchema = z.object({
	campanhaId: z.string({
		required_error: "ID da campanha não informado.",
		invalid_type_error: "Tipo não válido para o ID da campanha.",
	}),
	segmentacao: z.string({
		required_error: "Segmentação da campanha não informada.",
		invalid_type_error: "Tipo não válido para a segmentação da campanha.",
	}),
});

export const CampaignStateSchema = z.object({
	campaign: CampaignSchema.omit({ dataInsercao: true, autorId: true }),
	segmentations: z.array(
		CampaignSegmentationSchema.omit({ campanhaId: true }).extend({
			id: z
				.string({
					required_error: "ID da segmentação da campanha não informado.",
					invalid_type_error: "Tipo não válido para o ID da segmentação da campanha.",
				})
				.optional(),
			deletar: z
				.boolean({
					required_error: "Deletar segmentação da campanha não informado.",
					invalid_type_error: "Tipo não válido para deletar segmentação da campanha.",
				})
				.optional(),
		}),
	),
});
export type TCampaignState = z.infer<typeof CampaignStateSchema>;
