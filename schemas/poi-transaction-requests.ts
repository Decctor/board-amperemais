import { PoiTransactionRequestStatusEnum, PoiTransactionRequestTypeEnum } from "./enums";
import { z } from "zod";

export const PoiTransactionRequestSchema = z.object({
	id: z.string({ required_error: "ID da solicitação não informado.", invalid_type_error: "Tipo não válido para ID da solicitação." }),
	organizacaoId: z.string({ required_error: "ID da organização não informado.", invalid_type_error: "Tipo não válido para ID da organização." }),
	clienteId: z.string({ invalid_type_error: "Tipo não válido para ID do cliente." }).nullable().optional(),
	tipoSolicitacao: PoiTransactionRequestTypeEnum,
	status: PoiTransactionRequestStatusEnum,
	tokenPublico: z.string({ required_error: "Token público não informado.", invalid_type_error: "Tipo não válido para token público." }),
	payloadSolicitacao: z.unknown({
		required_error: "Payload da solicitação não informado.",
		invalid_type_error: "Tipo não válido para payload da solicitação.",
	}),
	resumoSolicitacao: z.unknown({ invalid_type_error: "Tipo não válido para resumo da solicitação." }).nullable().optional(),
	operadorAprovadorId: z.string({ invalid_type_error: "Tipo não válido para operador aprovador." }).nullable().optional(),
	operadorAprovadorVendedorId: z.string({ invalid_type_error: "Tipo não válido para vendedor aprovador." }).nullable().optional(),
	motivoInternoRejeicao: z.string({ invalid_type_error: "Tipo não válido para motivo interno." }).nullable().optional(),
	erroProcessamento: z.string({ invalid_type_error: "Tipo não válido para erro de processamento." }).nullable().optional(),
	vendaId: z.string({ invalid_type_error: "Tipo não válido para ID da venda." }).nullable().optional(),
	transacaoAcumuloId: z.string({ invalid_type_error: "Tipo não válido para ID da transação de acúmulo." }).nullable().optional(),
	transacaoResgateId: z.string({ invalid_type_error: "Tipo não válido para ID da transação de resgate." }).nullable().optional(),
	dataAprovacao: z.date({ invalid_type_error: "Tipo não válido para data de aprovação." }).nullable().optional(),
	dataRejeicao: z.date({ invalid_type_error: "Tipo não válido para data de rejeição." }).nullable().optional(),
	dataInsercao: z.date({ required_error: "Data de inserção não informada.", invalid_type_error: "Tipo não válido para data de inserção." }),
	dataAtualizacao: z.date({ required_error: "Data de atualização não informada.", invalid_type_error: "Tipo não válido para data de atualização." }),
});

export type TPoiTransactionRequest = z.infer<typeof PoiTransactionRequestSchema>;
