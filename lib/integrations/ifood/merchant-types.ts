import z from "zod";

/**
 * Schemas das respostas da Merchant API v1.0 do iFood (tolerantes, `.passthrough()`) e os DTOs
 * em PT consumidos pela UI. A UI nunca vê o shape cru do iFood — só os `TIfood*DTO` mapeados.
 */

const NullableString = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((value) => (value === null || value === undefined ? null : String(value)));

// ---------------------------------------------------------------------------
// Merchant (lista + detalhes)
// ---------------------------------------------------------------------------

export const IfoodMerchantSummaryResponseSchema = z
	.object({
		id: z.string(),
		name: NullableString,
		corporateName: NullableString,
	})
	.passthrough();

export const IfoodMerchantsListResponseSchema = z.union([
	z.array(IfoodMerchantSummaryResponseSchema),
	z.object({ merchants: z.array(IfoodMerchantSummaryResponseSchema) }).passthrough(),
]);

const IfoodMerchantAddressResponseSchema = z
	.object({
		country: NullableString,
		state: NullableString,
		city: NullableString,
		postalCode: NullableString,
		district: NullableString,
		street: NullableString,
		number: NullableString,
		latitude: z.number().optional().nullable(),
		longitude: z.number().optional().nullable(),
	})
	.passthrough();

const IfoodMerchantOperationResponseSchema = z
	.object({
		name: NullableString,
		salesChannel: z
			.object({
				name: NullableString,
				enabled: z.boolean().optional().nullable(),
			})
			.passthrough()
			.optional()
			.nullable(),
	})
	.passthrough();

export const IfoodMerchantDetailsResponseSchema = z
	.object({
		id: z.string(),
		name: NullableString,
		corporateName: NullableString,
		description: NullableString,
		averageTicket: z.number().optional().nullable(),
		exclusive: z.boolean().optional().nullable(),
		type: NullableString,
		status: NullableString,
		createdAt: NullableString,
		address: IfoodMerchantAddressResponseSchema.optional().nullable(),
		operations: z.array(IfoodMerchantOperationResponseSchema).optional().default([]),
	})
	.passthrough();
export type TIfoodMerchantDetailsResponse = z.infer<typeof IfoodMerchantDetailsResponseSchema>;

export type TIfoodMerchantSummaryDTO = {
	id: string;
	nome: string | null;
	razaoSocial: string | null;
};

export type TIfoodMerchantDetailsDTO = {
	id: string;
	nome: string | null;
	razaoSocial: string | null;
	descricao: string | null;
	tipo: string | null;
	status: string | null;
	ticketMedio: number | null;
	exclusivo: boolean | null;
	criadoEm: string | null;
	endereco: {
		pais: string | null;
		estado: string | null;
		cidade: string | null;
		cep: string | null;
		bairro: string | null;
		rua: string | null;
		numero: string | null;
	} | null;
	operacoes: {
		nome: string | null;
		canalVenda: string | null;
		canalHabilitado: boolean | null;
	}[];
};

export function mapIfoodMerchantSummary(merchant: z.infer<typeof IfoodMerchantSummaryResponseSchema>): TIfoodMerchantSummaryDTO {
	return {
		id: merchant.id,
		nome: merchant.name,
		razaoSocial: merchant.corporateName,
	};
}

export function mapIfoodMerchantDetails(merchant: TIfoodMerchantDetailsResponse): TIfoodMerchantDetailsDTO {
	return {
		id: merchant.id,
		nome: merchant.name,
		razaoSocial: merchant.corporateName,
		descricao: merchant.description,
		tipo: merchant.type,
		status: merchant.status,
		ticketMedio: merchant.averageTicket ?? null,
		exclusivo: merchant.exclusive ?? null,
		criadoEm: merchant.createdAt,
		endereco: merchant.address
			? {
					pais: merchant.address.country,
					estado: merchant.address.state,
					cidade: merchant.address.city,
					cep: merchant.address.postalCode,
					bairro: merchant.address.district,
					rua: merchant.address.street,
					numero: merchant.address.number,
				}
			: null,
		operacoes: (merchant.operations ?? []).map((operation) => ({
			nome: operation.name,
			canalVenda: operation.salesChannel?.name ?? null,
			canalHabilitado: operation.salesChannel?.enabled ?? null,
		})),
	};
}

// ---------------------------------------------------------------------------
// Status (GET /merchants/{id}/status) — somente leitura
// ---------------------------------------------------------------------------

const IfoodStatusMessageResponseSchema = z
	.object({
		title: NullableString,
		subtitle: NullableString,
		description: NullableString,
		priority: z.number().optional().nullable(),
	})
	.passthrough();

const IfoodStatusValidationResponseSchema = z
	.object({
		id: NullableString,
		code: NullableString,
		state: NullableString,
		message: IfoodStatusMessageResponseSchema.optional().nullable(),
	})
	.passthrough();

export const IfoodMerchantStatusResponseSchema = z
	.object({
		operation: NullableString,
		salesChannel: NullableString,
		available: z.boolean().optional().nullable(),
		state: NullableString,
		reopenable: z
			.object({
				identifier: NullableString,
				type: NullableString,
				reopenable: z.boolean().optional().nullable(),
			})
			.passthrough()
			.optional()
			.nullable(),
		validations: z.array(IfoodStatusValidationResponseSchema).optional().default([]),
		message: IfoodStatusMessageResponseSchema.optional().nullable(),
	})
	.passthrough();

export const IfoodMerchantStatusListResponseSchema = z.array(IfoodMerchantStatusResponseSchema);

export type TIfoodMerchantStatusDTO = {
	operacao: string | null;
	canalVenda: string | null;
	disponivel: boolean;
	estado: string | null;
	reabrivel: boolean;
	mensagem: {
		titulo: string | null;
		subtitulo: string | null;
		descricao: string | null;
	} | null;
	validacoes: {
		codigo: string | null;
		estado: string | null;
		titulo: string | null;
		descricao: string | null;
	}[];
};

export function mapIfoodMerchantStatus(status: z.infer<typeof IfoodMerchantStatusResponseSchema>): TIfoodMerchantStatusDTO {
	return {
		operacao: status.operation,
		canalVenda: status.salesChannel,
		disponivel: status.available ?? false,
		estado: status.state,
		reabrivel: status.reopenable?.reopenable ?? false,
		mensagem: status.message
			? {
					titulo: status.message.title,
					subtitulo: status.message.subtitle,
					descricao: status.message.description,
				}
			: null,
		validacoes: (status.validations ?? []).map((validation) => ({
			codigo: validation.code,
			estado: validation.state,
			titulo: validation.message?.title ?? null,
			descricao: validation.message?.description ?? null,
		})),
	};
}

// ---------------------------------------------------------------------------
// Interruptions (pausas programadas)
// ---------------------------------------------------------------------------

export const IfoodInterruptionResponseSchema = z
	.object({
		id: z.string(),
		description: NullableString,
		start: NullableString,
		end: NullableString,
	})
	.passthrough();

export const IfoodInterruptionsListResponseSchema = z.array(IfoodInterruptionResponseSchema);

export type TIfoodInterruptionDTO = {
	id: string;
	descricao: string | null;
	inicio: string | null;
	fim: string | null;
};

export function mapIfoodInterruption(interruption: z.infer<typeof IfoodInterruptionResponseSchema>): TIfoodInterruptionDTO {
	return {
		id: interruption.id,
		descricao: interruption.description,
		inicio: interruption.start,
		fim: interruption.end,
	};
}

// ---------------------------------------------------------------------------
// Opening hours (horários de funcionamento)
// ---------------------------------------------------------------------------

export const IFOOD_DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export const IfoodDayOfWeekSchema = z.enum(IFOOD_DAYS_OF_WEEK);
export type TIfoodDayOfWeek = z.infer<typeof IfoodDayOfWeekSchema>;

const IfoodOpeningShiftResponseSchema = z
	.object({
		id: NullableString,
		dayOfWeek: IfoodDayOfWeekSchema,
		start: z.string(),
		duration: z.number(),
	})
	.passthrough();

export const IfoodOpeningHoursResponseSchema = z
	.object({
		id: NullableString,
		shifts: z.array(IfoodOpeningShiftResponseSchema).optional().default([]),
	})
	.passthrough();

export type TIfoodOpeningShiftDTO = {
	id: string | null;
	diaSemana: TIfoodDayOfWeek;
	inicio: string;
	duracaoMinutos: number;
};

export function mapIfoodOpeningHours(openingHours: z.infer<typeof IfoodOpeningHoursResponseSchema>): TIfoodOpeningShiftDTO[] {
	return (openingHours.shifts ?? []).map((shift) => ({
		id: shift.id,
		diaSemana: shift.dayOfWeek,
		inicio: shift.start,
		duracaoMinutos: shift.duration,
	}));
}

export type TIfoodOpeningShiftInput = {
	diaSemana: TIfoodDayOfWeek;
	inicio: string;
	duracaoMinutos: number;
};
