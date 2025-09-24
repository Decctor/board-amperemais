import { z } from "zod";

export const SellerSchema = z.object({
	nome: z.string({ required_error: "Nome do vendedor não informado.", invalid_type_error: "Tipo não válido para o nome do vendedor." }),
	identificador: z.string({
		required_error: "Identificador do vendedor não informado.",
		invalid_type_error: "Tipo não válido para o identificador do vendedor.",
	}),
	telefone: z.string({ invalid_type_error: "Tipo não válido para o telefone do vendedor." }).optional().nullable(),
	email: z.string({ invalid_type_error: "Tipo não válido para o email do vendedor." }).optional().nullable(),
	avatarUrl: z.string({ invalid_type_error: "Tipo não válido para a url do avatar do vendedor." }).optional().nullable(),
	dataInsercao: z
		.string({
			required_error: "Data de inserção do vendedor não informada.",
			invalid_type_error: "Tipo não válido para a data de inserção do vendedor.",
		})
		.datetime({ message: "Tipo não válido para a data de inserção do vendedor." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});

export type TSeller = z.infer<typeof SellerSchema>;

export const SellerStateSchema = z.object({
	seller: SellerSchema,
	avatarHolder: z.object({
		file: z.instanceof(File).optional().nullable(),
		previewUrl: z
			.string({
				invalid_type_error: "Tipo não válido para a url do preview do avatar do vendedor.",
			})
			.optional()
			.nullable(),
	}),
});
export type TSellerState = z.infer<typeof SellerStateSchema>;
