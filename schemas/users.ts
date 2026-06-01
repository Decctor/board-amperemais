import { z } from "zod";
import { OrganizationMemberPermissionsSchema } from "./organizations";

export const UserSchema = z.object({
	admin: z.boolean({ required_error: "Admin do usuário não informado.", invalid_type_error: "Tipo não válido para o admin do usuário." }),
	nome: z.string({ required_error: "Nome do usuário não informado.", invalid_type_error: "Tipo não válido para o nome do usuário." }),
	email: z.string({ required_error: "Email do usuário não informado.", invalid_type_error: "Tipo não válido para o email do usuário." }),
	telefone: z.string({ required_error: "Telefone do usuário não informado.", invalid_type_error: "Tipo não válido para o telefone do usuário." }),
	avatarUrl: z.string({ invalid_type_error: "Tipo não válido para avatar do usuário." }).optional().nullable(),
	// Location
	localizacaoCep: z.string({ invalid_type_error: "Tipo não válido para o CEP do usuário." }).optional().nullable(),
	localizacaoEstado: z.string({ invalid_type_error: "Tipo não válido para o estado do usuário." }).optional().nullable(),
	localizacaoCidade: z.string({ invalid_type_error: "Tipo não válido para a cidade do usuário." }).optional().nullable(),
	localizacaoBairro: z.string({ invalid_type_error: "Tipo não válido para o bairro do usuário." }).optional().nullable(),
	localizacaoLogradouro: z.string({ invalid_type_error: "Tipo não válido para o logradouro do usuário." }).optional().nullable(),
	localizacaoNumero: z.string({ invalid_type_error: "Tipo não válido para o número do usuário." }).optional().nullable(),
	localizacaoComplemento: z.string({ invalid_type_error: "Tipo não válido para o complemento do usuário." }).optional().nullable(),
	localizacaoLatitude: z.string({ invalid_type_error: "Tipo não válido para a latitude do usuário." }).optional().nullable(),
	localizacaoLongitude: z.string({ invalid_type_error: "Tipo não válido para a longitude do usuário." }).optional().nullable(),

	// Auth related

	usuario: z.string({ required_error: "Usuário do usuário não informado.", invalid_type_error: "Tipo não válido para o usuário do usuário." }),
	senha: z.string({ required_error: "Senha do usuário não informada.", invalid_type_error: "Tipo não válido para a senha do usuário." }),
	googleId: z.string({ invalid_type_error: "Tipo não válido para o ID do Google do usuário." }).optional().nullable(),
	googleRefreshToken: z.string({ invalid_type_error: "Tipo não válido para o token de refresh do Google do usuário." }).optional().nullable(),
	googleAccessToken: z.string({ invalid_type_error: "Tipo não válido para o token de acesso do Google do usuário." }).optional().nullable(),
	// Others
	dataNascimento: z
		.string({ invalid_type_error: "Tipo não válido para a data de nascimento do usuário." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataInsercao: z
		.string({
			required_error: "Data de inserção do usuário não informada.",
			invalid_type_error: "Tipo não válido para a data de inserção do usuário.",
		})
		.datetime({ message: "Tipo não válido para a data de inserção do usuário." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TSession = { user_id: string; expires_at: Date };
export type TUser = z.infer<typeof UserSchema>;

export type TUserDTO = TUser & { _id: string };
export type TUserSession = Omit<TUserDTO, "senha">;

export const NewUserSchema = z.object({
	admin: z.boolean({ required_error: "Admin do usuário não informado.", invalid_type_error: "Tipo não válido para o admin do usuário." }),
	organizacaoId: z
		.string({
			required_error: "Organização do usuário não informada.",
			invalid_type_error: "Tipo não válido para a organização do usuário.",
		})
		.optional()
		.nullable(),
	nome: z.string({ required_error: "Nome do usuário não informado.", invalid_type_error: "Tipo não válido para o nome do usuário." }),
	email: z.string({ required_error: "Email do usuário não informado.", invalid_type_error: "Tipo não válido para o email do usuário." }),
	telefone: z.string({ required_error: "Telefone do usuário não informado.", invalid_type_error: "Tipo não válido para o telefone do usuário." }),
	avatarUrl: z.string({ invalid_type_error: "Tipo não válido para avatar do usuário." }).optional().nullable(),
	// Location
	localizacaoCep: z.string({ invalid_type_error: "Tipo não válido para o CEP do usuário." }).optional().nullable(),
	localizacaoEstado: z.string({ invalid_type_error: "Tipo não válido para o estado do usuário." }).optional().nullable(),
	localizacaoCidade: z.string({ invalid_type_error: "Tipo não válido para a cidade do usuário." }).optional().nullable(),
	localizacaoBairro: z.string({ invalid_type_error: "Tipo não válido para o bairro do usuário." }).optional().nullable(),
	localizacaoLogradouro: z.string({ invalid_type_error: "Tipo não válido para o logradouro do usuário." }).optional().nullable(),
	localizacaoNumero: z.string({ invalid_type_error: "Tipo não válido para o número do usuário." }).optional().nullable(),
	localizacaoComplemento: z.string({ invalid_type_error: "Tipo não válido para o complemento do usuário." }).optional().nullable(),
	localizacaoLatitude: z.string({ invalid_type_error: "Tipo não válido para a latitude do usuário." }).optional().nullable(),
	localizacaoLongitude: z.string({ invalid_type_error: "Tipo não válido para a longitude do usuário." }).optional().nullable(),
	// Auth related
	usuario: z.string({ required_error: "Usuário do usuário não informado.", invalid_type_error: "Tipo não válido para o usuário do usuário." }),
	senha: z.string({ required_error: "Senha do usuário não informada.", invalid_type_error: "Tipo não válido para a senha do usuário." }),
	permissoes: OrganizationMemberPermissionsSchema,
	googleId: z.string({ invalid_type_error: "Tipo não válido para o ID do Google do usuário." }).optional().nullable(),
	googleRefreshToken: z.string({ invalid_type_error: "Tipo não válido para o token de refresh do Google do usuário." }).optional().nullable(),
	googleAccessToken: z.string({ invalid_type_error: "Tipo não válido para o token de acesso do Google do usuário." }).optional().nullable(),
	// Others
	dataNascimento: z
		.string({ invalid_type_error: "Tipo não válido para a data de nascimento do usuário." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataInsercao: z
		.string({
			required_error: "Data de inserção do usuário não informada.",
			invalid_type_error: "Tipo não válido para a data de inserção do usuário.",
		})
		.datetime({ message: "Tipo não válido para a data de inserção do usuário." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TNewUser = z.infer<typeof NewUserSchema>;
export type TUserPermissions = TNewUser["permissoes"];
