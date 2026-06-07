import z from "zod";
import { CashbackProgramTerminologyEnum, InteractionTypeEnum, InteractionsCronJobTimeBlocksEnum } from "./enums";

export const InteractionsStatusEnum = z.enum(["PENDENTE", "ENVIADO", "ENTREGUE", "LIDO", "FALHOU", "BLOQUEADA"]);
export type TInteractionsStatusEnum = z.infer<typeof InteractionsStatusEnum>;
export const InteractionDeliveryChannelEnum = z.enum(["WHATSAPP", "EMAIL"]);
export type TInteractionDeliveryChannelEnum = z.infer<typeof InteractionDeliveryChannelEnum>;

export const InteractionMetadataSchema = z.object({
	terminologia: CashbackProgramTerminologyEnum.optional(),
	cashbackAcumuladoValor: z.number().optional().nullable(),
	compraValor: z.number().optional(),
	compraCashbackAcumulado: z.number().optional(),
	compraCashbackNovoSaldo: z.number().optional(),
	compraVendedorNome: z.string().optional(),
	cashbackSaldoDisponivel: z.number().optional(),
	cashbackTotalAcumuladoVida: z.number().optional(),
	cashbackTotalResgatadoVida: z.number().optional(),
	cashbackExpirandoValor: z.number().optional(),
	cashbackExpirandoData: z.string().optional(),
	whatsappMensagemId: z.string().optional().nullable(),
	whatsappMessageId: z.string().optional().nullable(),
	whatsappTemplateId: z.string().optional().nullable(),
	messageTemplateId: z.string().optional().nullable(),
	emailMessageId: z.string().optional().nullable(),
	clientMessageId: z.string().optional().nullable(),
	jobId: z.string().optional().nullable(),
	chatMessageId: z.string().optional().nullable(),
	whatsappStatus: z.string().optional().nullable(),
	emailStatus: z.string().optional().nullable(),
	channelsAttempted: z.array(InteractionDeliveryChannelEnum).optional(),
	channelsSkipped: z.array(z.string()).optional(),
	channelsSent: z.array(InteractionDeliveryChannelEnum).optional(),
	channelErrors: z.record(z.string()).optional(),
});
export type TInteractionMetadata = z.infer<typeof InteractionMetadataSchema>;

export const InteractionSchema = z.object({
	clienteId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para o ID do cliente.",
	}),
	campanhaId: z
		.string({
			required_error: "ID da campanha não informado.",
			invalid_type_error: "Tipo não válido para o ID da campanha.",
		})
		.optional()
		.nullable(),
	titulo: z.string({
		required_error: "Título da interação não informado.",
		invalid_type_error: "Tipo não válido para o título da interação.",
	}),
	descricao: z
		.string({
			required_error: "Descrição da interação não informada.",
			invalid_type_error: "Tipo não válido para a descrição da interação.",
		})
		.optional()
		.nullable(),
	tipo: InteractionTypeEnum,
	autorId: z
		.string({
			required_error: "ID do autor da interação não informado.",
			invalid_type_error: "Tipo não válido para o ID do autor da interação.",
		})
		.optional()
		.nullable(),

	// Scheduling specific
	agendamentoDataReferencia: z
		.string({
			required_error: "Data de referência da agendamento não informada.",
			invalid_type_error: "Tipo não válido para a data de referência da agendamento.",
		})
		.optional()
		.nullable(),
	agendamentoBlocoReferencia: InteractionsCronJobTimeBlocksEnum,
	dataInsercao: z
		.string({
			required_error: "Data de inserção da interação não informada.",
			invalid_type_error: "Tipo não válido para a data de inserção da interação.",
		})
		.datetime({ message: "Tipo não válido para a data de inserção da interação." })
		.transform((val) => new Date(val))
		.default(new Date().toISOString()),
	dataExecucao: z
		.string({
			required_error: "Data de execução da interação não informada.",
			invalid_type_error: "Tipo não válido para a data de execução da interação.",
		})
		.datetime({ message: "Tipo não válido para a data de execução da interação." })
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
	metadados: InteractionMetadataSchema.optional().nullable(),

	// Delivery status tracking
	statusEnvio: InteractionsStatusEnum.optional().nullable(),
	dataEnvio: z
		.string({
			required_error: "Data de envio da interação não informada.",
			invalid_type_error: "Tipo não válido para a data de envio da interação.",
		})
		.datetime({ message: "Tipo não válido para a data de envio da interação." })
		.transform((val) => new Date(val))
		.optional()
		.nullable(),
});

export const InteractionStateSchema = z.object({
	interaction: InteractionSchema.omit({ dataInsercao: true, autorId: true }),
});
export type TInteractionState = z.infer<typeof InteractionStateSchema>;
