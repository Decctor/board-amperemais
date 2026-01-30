import type { TUserPermissions } from "@/schemas/users";
import type { TAuthSessionEntity, TOrganizationEntity, TOrganizationMemberEntity, TUserEntity } from "@/services/drizzle/schema";
import z from "zod";

export type TAuthUserSession = {
	session: {
		id: TAuthSessionEntity["id"];
		usuarioId: TAuthSessionEntity["usuarioId"];
		usuarioDispositivo: TAuthSessionEntity["usuarioDispositivo"];
		usuarioNavegador: TAuthSessionEntity["usuarioNavegador"];
		organizacaoAtivaId: TAuthSessionEntity["organizacaoAtivaId"];
		dataExpiracao: TAuthSessionEntity["dataExpiracao"];
	};
	user: {
		admin: TUserEntity["admin"];
		id: TUserEntity["id"];
		nome: TUserEntity["nome"];
		telefone: TUserEntity["telefone"];
		email: TUserEntity["email"];
		avatarUrl: TUserEntity["avatarUrl"];
	};
	membership: {
		id: TOrganizationMemberEntity["id"];
		usuarioVendedorId: TOrganizationMemberEntity["usuarioVendedorId"];
		organizacao: {
			id: TOrganizationEntity["id"];
			nome: TOrganizationEntity["nome"];
			cnpj: TOrganizationEntity["cnpj"];
			logoUrl: TOrganizationEntity["logoUrl"];
			assinaturaPlano: TOrganizationEntity["assinaturaPlano"];
			corPrimaria: TOrganizationEntity["corPrimaria"];
			corPrimariaForeground: TOrganizationEntity["corPrimariaForeground"];
			corSecundaria: TOrganizationEntity["corSecundaria"];
			corSecundariaForeground: TOrganizationEntity["corSecundariaForeground"];
		};
		permissoes: TOrganizationMemberEntity["permissoes"];
	} | null;
};

export const LoginSchema = z.object({
	email: z.string({ required_error: "Email não informado.", invalid_type_error: "Tipo não válido para o email." }),
});
export type TLogin = z.infer<typeof LoginSchema>;

export const SignUpWithEmailSchema = z.object({
	nome: z.string({ required_error: "Nome não informado.", invalid_type_error: "Tipo não válido para o nome." }),
	email: z.string({ required_error: "Email não informado.", invalid_type_error: "Tipo não válido para o email." }),
});
export type TSignUpWithEmailSchema = z.infer<typeof SignUpWithEmailSchema>;

export const VerifyMagicLinkCodeSchema = z.object({
	code: z.string().length(6, "Código deve ter exatamente 6 dígitos").regex(/^\d+$/, "Código deve conter apenas números"),
	verificationTokenId: z.string({
		required_error: "Referência do token de verificação não informada.",
		invalid_type_error: "Tipo não válido para referência do token de verificação.",
	}),
});
export type TVerifyMagicLinkCodeSchema = z.infer<typeof VerifyMagicLinkCodeSchema>;
