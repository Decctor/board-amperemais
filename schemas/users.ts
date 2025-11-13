import { z } from "zod";

export const UserSchema = z.object({
	nome: z.string({ required_error: "Nome do usuário não informado.", invalid_type_error: "Tipo não válido para o nome do usuário." }),
	cpf: z.string({ invalid_type_error: "Tipo não válido para o CPF do usuário." }).optional().nullable(),
	telefone: z.string({ invalid_type_error: "Tipo não válido para o telefone do usuário." }).optional().nullable(),
	dataNascimento: z
		.string({ invalid_type_error: "Tipo não válido para a data de nascimento do usuário." })
		.datetime({ message: "Tipo não válido para a data de nascimento do usuário." })
		.optional()
		.nullable(),
	usuario: z.string({ required_error: "Usuário não informado.", invalid_type_error: "Tipo não válido para o nome do usuário." }),
	avatar: z.string({ invalid_type_error: "Tipo não válido para avatar do usuário." }).optional().nullable(),
	email: z
		.string({ required_error: "Email do usuário não informado.", invalid_type_error: "Tipo não válido para o email do usuário." })
		.optional()
		.nullable(),
	senha: z.string({ required_error: "Senha do usuário não informada.", invalid_type_error: "Tipo não válido para a senha do usuário." }),
	visualizacao: z.enum(["GERAL", "PRÓPRIA"]),
	vendedor: z.string({ required_error: "Vendedor do usuário não informado.", invalid_type_error: "Tipo não válido para o vendedor do usuário." }),
	dataInsercao: z.string({
		required_error: "Data de inserção do usuário não informada.",
		invalid_type_error: "Tipo não válido para a data de inserção do usuário.",
	}),
});
export type TSession = { user_id: string; expires_at: Date };
export type TUser = z.infer<typeof UserSchema>;

export type TUserDTO = TUser & { _id: string };
export type TUserSession = Omit<TUserDTO, "senha">;

export const NewUserSchema = z.object({
	nome: z.string({ required_error: "Nome do usuário não informado.", invalid_type_error: "Tipo não válido para o nome do usuário." }),
	email: z.string({ required_error: "Email do usuário não informado.", invalid_type_error: "Tipo não válido para o email do usuário." }),
	telefone: z.string({ required_error: "Telefone do usuário não informado.", invalid_type_error: "Tipo não válido para o telefone do usuário." }),
	avatarUrl: z.string({ invalid_type_error: "Tipo não válido para avatar do usuário." }).optional().nullable(),
	// Auth related
	usuario: z.string({ required_error: "Usuário do usuário não informado.", invalid_type_error: "Tipo não válido para o usuário do usuário." }),
	senha: z.string({ required_error: "Senha do usuário não informada.", invalid_type_error: "Tipo não válido para a senha do usuário." }),
	permissoes: z.object({
		resultados: z.object({
			escopo: z
				.array(z.string({ required_error: "Escopo de resultados não informado.", invalid_type_error: "Tipo não válido para o escopo de resultados." }))
				.optional()
				.nullable(),
			visualizar: z.boolean({
				required_error: "Permissão de visualização de resultados não informada.",
				invalid_type_error: "Tipo não válido para a permissão de visualização de resultados.",
			}),
			// Goals
			criarMetas: z.boolean({
				required_error: "Permissão de criação de metas não informada.",
				invalid_type_error: "Tipo não válido para a permissão de criação de metas.",
			}),
			visualizarMetas: z.boolean({
				required_error: "Permissão de visualização de metas não informada.",
				invalid_type_error: "Tipo não válido para a permissão de visualização de metas.",
			}),
			editarMetas: z.boolean({
				required_error: "Permissão de edição de metas não informada.",
				invalid_type_error: "Tipo não válido para a permissão de edição de metas.",
			}),
			excluirMetas: z.boolean({
				required_error: "Permissão de exclusão de metas não informada.",
				invalid_type_error: "Tipo não válido para a permissão de exclusão de metas.",
			}),
		}),
		usuarios: z.object({
			visualizar: z.boolean({
				required_error: "Permissão de visualização de usuários não informada.",
				invalid_type_error: "Tipo não válido para a permissão de visualização de usuários.",
			}),
			criar: z.boolean({
				required_error: "Permissão de criação de usuários não informada.",
				invalid_type_error: "Tipo não válido para a permissão de criação de usuários.",
			}),
			editar: z.boolean({
				required_error: "Permissão de edição de usuários não informada.",
				invalid_type_error: "Tipo não válido para a permissão de edição de usuários.",
			}),
			excluir: z.boolean({
				required_error: "Permissão de exclusão de usuários não informada.",
				invalid_type_error: "Tipo não válido para a permissão de exclusão de usuários.",
			}),
		}),
		atendimentos: z.object({
			visualizar: z.boolean({
				required_error: "Permissão de visualização de atendimentos não informada.",
				invalid_type_error: "Tipo não válido para a permissão de visualização de atendimentos.",
			}),
			iniciar: z.boolean({
				required_error: "Permissão de início de atendimentos não informada.",
				invalid_type_error: "Tipo não válido para a permissão de início de atendimentos.",
			}),
			responder: z.boolean({
				required_error: "Permissão de resposta de atendimentos não informada.",
				invalid_type_error: "Tipo não válido para a permissão de resposta de atendimentos.",
			}),
			finalizar: z.boolean({
				required_error: "Permissão de finalização de atendimentos não informada.",
				invalid_type_error: "Tipo não válido para a permissão de finalização de atendimentos.",
			}),
		}),
	}),
	// Others
	dataNascimento: z
		.string({ invalid_type_error: "Tipo não válido para a data de nascimento do usuário." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	vendedorId: z.string({ invalid_type_error: "Tipo não válido para o vendedor do usuário." }).optional().nullable(),
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
