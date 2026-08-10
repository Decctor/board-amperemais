import { resolvePoiActorContext } from "@/lib/access/poi-actor";
import { appApiHandler } from "@/lib/app-api";
import { resolveValidatedAuthorSeller } from "@/lib/clients/authorship";
import { saveClientCustomFieldValues } from "@/lib/custom-fields/values";
import { formatPhoneAsBase } from "@/lib/formatting";
import { isValidCpfCnpj } from "@/lib/validation";
import { ClientSchema } from "@/schemas/clients";
import { CustomFieldValueInputSchema } from "@/schemas/custom-fields";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances } from "@/services/drizzle/schema/cashback-programs";
import { clients } from "@/services/drizzle/schema/clients";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CreateClientViaPointOfInteractionInputSchema = z.object({
	// Opcional para dispositivos autenticados (a organização deriva do principal); obrigatório no modo legado.
	orgId: z.string({ invalid_type_error: "Tipo não válido para ID da organização." }).optional().nullable(),
	client: ClientSchema.pick({
		nome: true,
		telefone: true,
		cpfCnpj: true,
		dataNascimento: true,
		// "Quem te atendeu": vendedor escolhido pelo cliente no autocadastro. Opcional;
		// validado no servidor contra a organização resolvida pelo actor context.
		autorVendedorId: true,
	}),
	// Respostas do assistente de cadastro completo (poiConfiguracao.cadastro). Ausente/vazio =
	// cadastro rápido, o payload que o POI sempre enviou. A validação real (campo da organização,
	// ativo, tipo, opções) mora em `saveClientCustomFieldValues` — aqui só o formato.
	customFieldAnswers: z
		.array(CustomFieldValueInputSchema, {
			invalid_type_error: "Tipo não válido para as respostas dos campos personalizados.",
		})
		.optional()
		.nullable(),
	// Aceite explícito de marketing (LGPD). Só `true` grava a data; `false`/ausente não é uma
	// retirada de consentimento — é a ausência de um aceite novo.
	marketingConsent: z
		.boolean({
			invalid_type_error: "Tipo não válido para o consentimento de marketing.",
		})
		.optional()
		.nullable(),
});
export type TCreateClientViaPointOfInteractionInput = z.infer<typeof CreateClientViaPointOfInteractionInputSchema>;

async function createClientViaPointOfInteraction({ input }: { input: Omit<TCreateClientViaPointOfInteractionInput, "orgId"> & { orgId: string } }) {
	const { orgId, client, customFieldAnswers, marketingConsent } = input;

	return await db.transaction(async (tx) => {
		const autorVendedorId = client.autorVendedorId
			? await resolveValidatedAuthorSeller({ trx: tx, organizacaoId: orgId, vendedorId: client.autorVendedorId })
			: null;
		const cashbackProgram = await tx.query.cashbackPrograms.findFirst({
			where: (fields, { eq }) => eq(fields.organizacaoId, orgId),
		});
		if (!cashbackProgram) throw new createHttpError.NotFound("Programa de cashback não encontrado.");

		const isValidPhone = client.telefone && client.telefone.length >= 11;
		if (!isValidPhone) throw new createHttpError.BadRequest("Telefone inválido.");

		const clientPhoneAsBase = formatPhoneAsBase(client.telefone ?? "");
		if (!clientPhoneAsBase) throw new createHttpError.BadRequest("Telefone inválido.");

		if (client.cpfCnpj && !isValidCpfCnpj(client.cpfCnpj)) throw new createHttpError.BadRequest("CPF/CNPJ inválido.");

		const existingClientForPhone = await tx.query.clients.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.telefoneBase, clientPhoneAsBase), eq(fields.organizacaoId, orgId)),
		});
		if (existingClientForPhone) throw new createHttpError.BadRequest("Um cadastro já existe para este telefone.");

		console.log("[INFO] [CREATE CLIENT VIA POINT OF INTERACTION] No existing client found, continuing with insertion...");
		const insertedClientResponse = await tx
			.insert(clients)
			.values({
				...client,
				organizacaoId: orgId,
				autorVendedorId,
				cpfCnpj: client.cpfCnpj ?? null,
				telefone: client.telefone ?? "",
				telefoneBase: clientPhoneAsBase,
				dataNascimento: client.dataNascimento ? new Date(client.dataNascimento) : null,
				// Só o aceite explícito grava a data — nunca derivada do simples ato de se cadastrar.
				consentimentoMarketingData: marketingConsent === true ? new Date() : null,
				canalAquisicao: "PONTO DE INTERAÇÃO",
				analiseRFMTitulo: "CLIENTES RECENTES",
			})
			.returning({ id: clients.id });

		const insertedClientId = insertedClientResponse[0]?.id;
		if (!insertedClientId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar cliente.");

		// Dentro da transação e ANTES do saldo: uma resposta inválida derruba o cadastro inteiro.
		// Um cliente meio-cadastrado — criado, mas com as respostas que ele deu descartadas em
		// silêncio — é pior que um erro na tela, porque ninguém descobre o que se perdeu.
		if (customFieldAnswers && customFieldAnswers.length > 0) {
			await saveClientCustomFieldValues({
				trx: tx,
				organizacaoId: orgId,
				clienteId: insertedClientId,
				valores: customFieldAnswers,
			});
		}

		const insertedCashbackProgramBalanceResponse = await tx
			.insert(cashbackProgramBalances)
			.values({
				clienteId: insertedClientId,
				programaId: cashbackProgram.id,
				organizacaoId: orgId,
				saldoValorDisponivel: 0,
				saldoValorAcumuladoTotal: 0,
				saldoValorResgatadoTotal: 0,
			})
			.returning({ id: cashbackProgramBalances.id });

		const insertedCashbackProgramBalanceId = insertedCashbackProgramBalanceResponse[0]?.id;
		if (!insertedCashbackProgramBalanceId)
			throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar saldo de cashback.");

		return {
			data: {
				insertedClientId: insertedClientId,
				insertedCashbackProgramBalanceId: insertedCashbackProgramBalanceId,
			},
			message: "Cliente criado com sucesso.",
		};
	});
}
export type TCreateClientViaPointOfInteractionOutput = Awaited<ReturnType<typeof createClientViaPointOfInteraction>>;

async function createClientViaPointOfInteractionRoute(request: NextRequest) {
	const body = await request.json();
	console.log("[INFO] [CREATE CLIENT VIA POINT OF INTERACTION] Request body:", body);
	const parsedInput = CreateClientViaPointOfInteractionInputSchema.parse(body);
	console.log("[INFO] [CREATE CLIENT VIA POINT OF INTERACTION] Input:", parsedInput);
	// Dual-mode (plano §9.10): dispositivo autenticado deriva a organização do principal.
	const resolution = await resolvePoiActorContext({ request, requiredScope: "poi:clients:create", payloadOrgId: parsedInput.orgId });
	const result = await createClientViaPointOfInteraction({ input: { ...parsedInput, orgId: resolution.organizationId } });
	console.log("[INFO] [CREATE CLIENT VIA POINT OF INTERACTION] Result:", result);
	return NextResponse.json(result, {
		status: 201,
	});
}

export const POST = appApiHandler({
	POST: createClientViaPointOfInteractionRoute,
});
