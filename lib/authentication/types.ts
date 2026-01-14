import type { TAuthSessionEntity, TOrganizationEntity, TUserEntity } from "@/services/drizzle/schema";
import z from "zod";

export type TAuthUserSession = {
	session: {
		id: TAuthSessionEntity["id"];
		usuarioId: TAuthSessionEntity["usuarioId"];
		usuarioDispositivo: TAuthSessionEntity["usuarioDispositivo"];
		usuarioNavegador: TAuthSessionEntity["usuarioNavegador"];
		dataExpiracao: TAuthSessionEntity["dataExpiracao"];
	};
	user: {
		admin: TUserEntity["admin"];
		id: TUserEntity["id"];
		nome: TUserEntity["nome"];
		telefone: TUserEntity["telefone"];
		email: TUserEntity["email"];
		avatarUrl: TUserEntity["avatarUrl"];
		permissoes: TUserEntity["permissoes"];
		vendedorId: TUserEntity["vendedorId"];
		organizacaoId: TUserEntity["organizacaoId"];
	};
	organization: {
		id: TOrganizationEntity["id"];
		nome: TOrganizationEntity["nome"];
		cnpj: TOrganizationEntity["cnpj"];
		logoUrl: TOrganizationEntity["logoUrl"];
		assinaturaPlano: TOrganizationEntity["assinaturaPlano"];
	} | null;
};

export const LoginSchema = z.object({
	username: z.string({ required_error: "Usuário não informado.", invalid_type_error: "Tipo não válido para o usuário." }),
	password: z.string({ required_error: "Senha não informada.", invalid_type_error: "Tipo não válido para a senha." }),
});
export type TLogin = z.infer<typeof LoginSchema>;
