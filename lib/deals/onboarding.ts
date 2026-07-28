import { generatePublicToken, hashPublicToken } from "@/lib/tabs";
import { isValidCNPJ } from "@/lib/validation";
import {
	DEFAULT_DEAL_ONBOARDING_FORM_STRUCTURE,
	DealOnboardingFormAnswersSchema,
	DealOnboardingFormStructureSchema,
	EMPTY_DEAL_ONBOARDING_ANSWERS,
	type TDealOnboardingFormAnswers,
	type TDealOnboardingFormStructure,
} from "@/schemas/deal-onboarding";
import type { TDealOnboardingFormSituationEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { getAppBaseUrl } from "@/lib/organizations/poi-qr-codes";
import { dealOnboardingForms, type TDealEntity, type TDealOnboardingFormEntity } from "@/services/drizzle/schema";
import { and, eq, ne } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";

type TDrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type TDbOrTransaction = typeof db | TDrizzleTransaction;

// Limite defensivo por resposta: nada no formulário justifica valores maiores, e o JSONB
// é escrito por um endpoint público.
const MAX_ANSWER_LENGTH = 2000;

// Formulário não-cancelado do deal — no máximo um, garantido pelo unique parcial
// idx_deal_onboarding_forms_deal_ativo.
export async function findActiveDealOnboardingForm({
	dealId,
	client = db,
}: {
	dealId: string;
	client?: TDbOrTransaction;
}): Promise<TDealOnboardingFormEntity | null> {
	const form = await client.query.dealOnboardingForms.findFirst({
		where: (fields, { and, eq, ne }) => and(eq(fields.dealId, dealId), ne(fields.status, "CANCELADO")),
	});
	return form ?? null;
}

// Lookup público: hash do token bruto → formulário + deal. Formulários cancelados são
// invisíveis (o token deles foi revogado).
export async function resolveDealOnboardingFormByToken({
	token,
}: {
	token: string;
}): Promise<{ form: TDealOnboardingFormEntity; deal: TDealEntity } | null> {
	const tokenHash = hashPublicToken(token);
	const form = await db.query.dealOnboardingForms.findFirst({
		where: (fields, { and, eq, ne }) => and(eq(fields.tokenPublicoHash, tokenHash), ne(fields.status, "CANCELADO")),
		with: { deal: true },
	});
	if (!form) return null;
	const { deal, ...formFields } = form;
	return { form: formFields, deal };
}

// Leituras dos JSONB com fallback (padrão resolveServiceSettings): estrutura corrompida cai
// no template padrão; respostas corrompidas/nulas caem no objeto vazio.
export function parseOnboardingStructure(raw: unknown): TDealOnboardingFormStructure {
	const parsed = DealOnboardingFormStructureSchema.safeParse(raw);
	return parsed.success ? parsed.data : DEFAULT_DEAL_ONBOARDING_FORM_STRUCTURE;
}

export function parseOnboardingAnswers(raw: unknown): TDealOnboardingFormAnswers {
	const parsed = DealOnboardingFormAnswersSchema.safeParse(raw);
	return parsed.success ? parsed.data : EMPTY_DEAL_ONBOARDING_ANSWERS;
}

// Situação derivada exibida no admin e usada no branching da página pública. A ordem de
// precedência importa: cancelamentos > conclusão (deal ATIVO) > envio > expiração.
export function resolveDealOnboardingSituation({
	form,
	deal,
}: {
	form: Pick<TDealOnboardingFormEntity, "status" | "dataExpiracao">;
	deal: Pick<TDealEntity, "status">;
}): TDealOnboardingFormSituationEnum {
	if (form.status === "CANCELADO") return "CANCELADO";
	if (deal.status === "ATIVO") return "CONCLUIDO";
	if (form.status === "PREENCHIDO") return "PREENCHIDO";
	if (deal.status === "CANCELADO") return "CANCELADO";
	if (form.dataExpiracao && form.dataExpiracao < new Date()) return "EXPIRADO";
	return "EMITIDO";
}

export type TDealOnboardingAnswerError = { secao: "GERAL" | number; chave: string; mensagem: string };

function validateAnswerFormat(tipo: string, value: string): string | null {
	if (tipo === "EMAIL" && !z.string().email().safeParse(value).success) return "Email inválido.";
	if (tipo === "TELEFONE" && value.replace(/\D/g, "").length < 10) return "Telefone inválido — informe o DDD e o número.";
	if (tipo === "CNPJ" && !isValidCNPJ(value)) return "CNPJ inválido.";
	return null;
}

// Normaliza e valida as respostas contra a estrutura do formulário:
// - Descarta chaves que não existem na estrutura (escopo correspondente) — o endpoint é público.
// - Trunca `organizacoes` em quantidadeLicencas; no envio final, completa com {} até lá.
// - Trim em todos os valores + limite de tamanho.
// - final=false (rascunho): não exige obrigatórios; valida formato apenas dos preenchidos.
// - final=true: exige obrigatórios em `gerais` e em TODAS as seções de organização.
export function normalizeAndValidateOnboardingAnswers({
	estrutura,
	respostas,
	quantidadeLicencas,
	final,
}: {
	estrutura: TDealOnboardingFormStructure;
	respostas: TDealOnboardingFormAnswers;
	quantidadeLicencas: number;
	final: boolean;
}): { respostas: TDealOnboardingFormAnswers; erros: TDealOnboardingAnswerError[] } {
	const camposGerais = estrutura.campos.filter((campo) => campo.escopo === "GERAL");
	const camposOrganizacao = estrutura.campos.filter((campo) => campo.escopo === "ORGANIZACAO");
	const erros: TDealOnboardingAnswerError[] = [];

	function normalizeSection(campos: typeof estrutura.campos, rawSection: Record<string, string>, secao: "GERAL" | number) {
		const section: Record<string, string> = {};
		for (const campo of campos) {
			const rawValue = rawSection[campo.chave];
			const value = typeof rawValue === "string" ? rawValue.trim().slice(0, MAX_ANSWER_LENGTH) : "";
			if (value.length > 0) {
				const formatError = validateAnswerFormat(campo.tipo, value);
				if (formatError) erros.push({ secao, chave: campo.chave, mensagem: `${campo.rotulo}: ${formatError}` });
				section[campo.chave] = value;
			} else if (final && campo.obrigatorio) {
				erros.push({ secao, chave: campo.chave, mensagem: `${campo.rotulo}: campo obrigatório não preenchido.` });
			}
		}
		return section;
	}

	const gerais = normalizeSection(camposGerais, respostas.gerais ?? {}, "GERAL");

	const organizacaoSections = (respostas.organizacoes ?? []).slice(0, quantidadeLicencas);
	while (final && organizacaoSections.length < quantidadeLicencas) organizacaoSections.push({});
	const organizacoes = organizacaoSections.map((rawSection, index) => normalizeSection(camposOrganizacao, rawSection ?? {}, index));

	return { respostas: { gerais, organizacoes }, erros };
}

// Emite (ou reemite) o link do formulário. Reemitir cancela o formulário EMITIDO anterior
// (revogando o token antigo) e preserva o rascunho já preenchido. Reemissão sobre um
// formulário PREENCHIDO é bloqueada — as respostas estão travadas; o admin precisa revogar
// explicitamente antes de recolher de novo.
export async function emitDealOnboardingForm({
	deal,
	userId,
	dataExpiracao,
}: {
	deal: TDealEntity;
	userId: string;
	dataExpiracao?: Date | null;
}): Promise<{ form: TDealOnboardingFormEntity; token: string }> {
	const token = generatePublicToken();
	const tokenHash = hashPublicToken(token);

	const form = await db.transaction(async (tx) => {
		const activeForm = await findActiveDealOnboardingForm({ dealId: deal.id, client: tx });
		if (activeForm?.status === "PREENCHIDO")
			throw new createHttpError.BadRequest("O formulário já foi preenchido. Revogue-o antes de emitir um novo link.");

		if (activeForm) {
			await tx.update(dealOnboardingForms).set({ status: "CANCELADO" }).where(eq(dealOnboardingForms.id, activeForm.id));
		}

		const [insertedForm] = await tx
			.insert(dealOnboardingForms)
			.values({
				dealId: deal.id,
				status: "EMITIDO",
				tokenPublicoHash: tokenHash,
				// Cópia do template: variações futuras editam o JSONB deste registro direto no banco.
				estrutura: DEFAULT_DEAL_ONBOARDING_FORM_STRUCTURE,
				respostas: activeForm?.respostas ?? null,
				dataUltimoRascunho: activeForm?.dataUltimoRascunho ?? null,
				dataExpiracao: dataExpiracao ?? null,
				emitidoPorUsuarioId: userId,
			})
			.returning();
		if (!insertedForm) throw new createHttpError.InternalServerError("Erro ao emitir o formulário do deal.");
		return insertedForm;
	});

	return { form, token };
}

// Revoga o formulário ativo do deal (o link deixa de funcionar imediatamente).
export async function revokeDealOnboardingForm({ dealId }: { dealId: string }) {
	const [revoked] = await db
		.update(dealOnboardingForms)
		.set({ status: "CANCELADO" })
		.where(and(eq(dealOnboardingForms.dealId, dealId), ne(dealOnboardingForms.status, "CANCELADO")))
		.returning({ id: dealOnboardingForms.id });
	if (!revoked) throw new createHttpError.NotFound("O deal não possui formulário ativo para revogar.");
	return revoked.id;
}

export function buildDealOnboardingUrl(token: string) {
	return `${getAppBaseUrl()}/deal-onboarding/${token}`;
}
