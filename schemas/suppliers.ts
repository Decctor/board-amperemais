import { z } from "zod";

export const SupplierSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	nome: z
		.string({
			required_error: "Nome do fornecedor não informado.",
			invalid_type_error: "Tipo não válido para o nome do fornecedor.",
		})
		.min(2, "Nome do fornecedor precisa ter ao menos 2 caracteres."),
	cpfCnpj: z.string({ invalid_type_error: "Tipo não válido para o CPF/CNPJ do fornecedor." }).optional().nullable(),
	email: z.string({ invalid_type_error: "Tipo não válido para o email do fornecedor." }).optional().nullable(),
	telefone: z.string({ invalid_type_error: "Tipo não válido para o telefone do fornecedor." }).optional().nullable(),
	inscricaoEstadual: z.string({ invalid_type_error: "Tipo não válido para a inscrição estadual do fornecedor." }).optional().nullable(),
	ativo: z.boolean({ invalid_type_error: "Tipo não válido para o status de ativo do fornecedor." }).default(true),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para a data de inserção." })
		.datetime({ message: "Tipo não válido para a data de inserção." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TSupplier = z.infer<typeof SupplierSchema>;

export const SupplierProductMappingSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	fornecedorId: z.string({
		required_error: "ID do fornecedor não informado.",
		invalid_type_error: "Tipo não válido para o ID do fornecedor.",
	}),
	codigoFornecedor: z.string({ invalid_type_error: "Tipo não válido para o código do produto no fornecedor." }).optional().nullable(),
	ean: z.string({ invalid_type_error: "Tipo não válido para o EAN do produto no fornecedor." }).optional().nullable(),
	produtoId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para o ID do produto.",
	}),
	produtoVarianteId: z.string({ invalid_type_error: "Tipo não válido para o ID da variante do produto." }).optional().nullable(),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para a data de inserção." })
		.datetime({ message: "Tipo não válido para a data de inserção." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TSupplierProductMapping = z.infer<typeof SupplierProductMappingSchema>;
