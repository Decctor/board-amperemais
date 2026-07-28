import z from "zod";
import { DealOnboardingFieldScopeEnum, DealOnboardingFieldTypeEnum } from "./enums";

// Formulário público de onboarding do deal: a estrutura (perguntas) e as respostas vivem em
// JSONB na tabela ampmais_deal_onboarding_forms até a estrutura ser validada em produção.
// A quantidade de seções por organização NUNCA vai para o JSONB — é sempre lida de
// deal.quantidadeLicencas na renderização e na validação.

export const DealOnboardingFieldSchema = z.object({
	chave: z
		.string({ required_error: "Chave do campo não informada.", invalid_type_error: "Tipo não válido para a chave do campo." })
		.min(1, "A chave do campo não pode ser vazia."),
	rotulo: z
		.string({ required_error: "Rótulo do campo não informado.", invalid_type_error: "Tipo não válido para o rótulo do campo." })
		.min(1, "O rótulo do campo não pode ser vazio."),
	tipo: DealOnboardingFieldTypeEnum,
	escopo: DealOnboardingFieldScopeEnum,
	obrigatorio: z.boolean({
		required_error: "Obrigatoriedade do campo não informada.",
		invalid_type_error: "Tipo não válido para a obrigatoriedade do campo.",
	}),
	descricao: z.string({ invalid_type_error: "Tipo não válido para a descrição do campo." }).optional().nullable(),
	placeholder: z.string({ invalid_type_error: "Tipo não válido para o placeholder do campo." }).optional().nullable(),
});
export type TDealOnboardingField = z.infer<typeof DealOnboardingFieldSchema>;

export const DealOnboardingFormStructureSchema = z.object({
	versao: z.literal(1),
	titulo: z
		.string({ required_error: "Título do formulário não informado.", invalid_type_error: "Tipo não válido para o título do formulário." })
		.min(1, "O título do formulário não pode ser vazio."),
	descricao: z.string({ invalid_type_error: "Tipo não válido para a descrição do formulário." }).optional().nullable(),
	// Ordem do array = ordem de renderização; o escopo separa as seções (GERAL vs ORGANIZACAO).
	campos: z.array(DealOnboardingFieldSchema).min(1, "O formulário deve ter ao menos um campo."),
});
export type TDealOnboardingFormStructure = z.infer<typeof DealOnboardingFormStructureSchema>;

export const DealOnboardingFormAnswersSchema = z.object({
	gerais: z.record(z.string(), z.string({ invalid_type_error: "Tipo não válido para a resposta." })),
	// Índice i = seção da licença i+1.
	organizacoes: z.array(z.record(z.string(), z.string({ invalid_type_error: "Tipo não válido para a resposta." }))),
});
export type TDealOnboardingFormAnswers = z.infer<typeof DealOnboardingFormAnswersSchema>;

export const EMPTY_DEAL_ONBOARDING_ANSWERS: TDealOnboardingFormAnswers = { gerais: {}, organizacoes: [] };

// Template padrão copiado para o JSONB do formulário na emissão. Variações futuras editam o
// JSONB direto no banco até valer a pena construir uma UI de edição.
export const DEFAULT_DEAL_ONBOARDING_FORM_STRUCTURE: TDealOnboardingFormStructure = {
	versao: 1,
	titulo: "Dados para ativação das suas licenças",
	descricao: "Preencha os dados gerais e os dados de cada empresa que será cadastrada.",
	campos: [
		// GERAL
		{ chave: "nome_responsavel", rotulo: "Nome do responsável", tipo: "TEXTO", escopo: "GERAL", obrigatorio: true },
		{ chave: "email_financeiro", rotulo: "Email do financeiro", tipo: "EMAIL", escopo: "GERAL", obrigatorio: true },
		{ chave: "telefone_responsavel_geral", rotulo: "Telefone do responsável", tipo: "TELEFONE", escopo: "GERAL", obrigatorio: true },
		{ chave: "observacoes", rotulo: "Observações", tipo: "TEXTO_LONGO", escopo: "GERAL", obrigatorio: false },
		// ORGANIZACAO (uma seção por licença)
		{ chave: "nome", rotulo: "Nome da empresa", tipo: "TEXTO", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "cnpj", rotulo: "CNPJ", tipo: "CNPJ", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "email", rotulo: "Email da empresa", tipo: "EMAIL", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "telefone_responsavel", rotulo: "Telefone do responsável", tipo: "TELEFONE", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "endereco_cep", rotulo: "CEP", tipo: "TEXTO", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "endereco_logradouro", rotulo: "Logradouro", tipo: "TEXTO", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "endereco_numero", rotulo: "Número", tipo: "TEXTO", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "endereco_complemento", rotulo: "Complemento", tipo: "TEXTO", escopo: "ORGANIZACAO", obrigatorio: false },
		{ chave: "endereco_bairro", rotulo: "Bairro", tipo: "TEXTO", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "endereco_cidade", rotulo: "Cidade", tipo: "TEXTO", escopo: "ORGANIZACAO", obrigatorio: true },
		{ chave: "endereco_estado", rotulo: "Estado (UF)", tipo: "TEXTO", escopo: "ORGANIZACAO", obrigatorio: true },
	],
};
