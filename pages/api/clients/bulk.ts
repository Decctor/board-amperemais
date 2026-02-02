import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatPhoneAsBase } from "@/lib/formatting";
import { BulkClientImportInputSchema, type TBulkClientImportInput } from "@/schemas/clients";
import { db } from "@/services/drizzle";
import { type TNewClientEntity, cashbackProgramBalances, clients } from "@/services/drizzle/schema";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import type z from "zod";

type PostResponse = {
	data: {
		insertedCount: number;
		skippedCount: number;
		errors: Array<{ row: number; message: string }>;
	};
	message: string;
};
export type TBulkCreateClientsInput = z.infer<typeof BulkClientImportInputSchema>;

async function bulkCreateClients({ input, sessionUser }: { input: TBulkCreateClientsInput; sessionUser: TAuthUserSession }) {
	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const clientsToInsert: Array<{
		organizacaoId: TNewClientEntity["organizacaoId"];
		nome: TNewClientEntity["nome"];
		telefone: TNewClientEntity["telefone"];
		telefoneBase: TNewClientEntity["telefoneBase"];
		email: TNewClientEntity["email"];
		dataNascimento: TNewClientEntity["dataNascimento"];
		canalAquisicao: TNewClientEntity["canalAquisicao"];
		localizacaoCidade: TNewClientEntity["localizacaoCidade"];
		localizacaoEstado: TNewClientEntity["localizacaoEstado"];
		localizacaoBairro: TNewClientEntity["localizacaoBairro"];
		localizacaoCep: TNewClientEntity["localizacaoCep"];
		dataInsercao: TNewClientEntity["dataInsercao"];
	}> = [];
	const errors: Array<{ row: number; message: string }> = [];
	let skippedCount = 0;

	for (let i = 0; i < input.clients.length; i++) {
		const client = input.clients[i];
		const rowNumber = i + 2; // +2 because row 1 is header, and array is 0-indexed

		// Skip if nome is empty or just whitespace
		if (!client.nome || client.nome.trim().length === 0) {
			errors.push({ row: rowNumber, message: "Nome é obrigatório" });
			skippedCount++;
			continue;
		}

		// Check for duplicate phone numbers within the batch
		const telefoneBase = formatPhoneAsBase(client.telefone ?? "");
		if (telefoneBase && clientsToInsert.some((c) => c.telefoneBase === telefoneBase)) {
			errors.push({ row: rowNumber, message: `Telefone duplicado na planilha: ${client.telefone}` });
			skippedCount++;
			continue;
		}

		// Check if client with same phone already exists in database (if phone provided)
		if (telefoneBase) {
			const existingClient = await db.query.clients.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.organizacaoId, userOrgId), eq(fields.telefoneBase, telefoneBase)),
			});
			if (existingClient) {
				errors.push({ row: rowNumber, message: `Cliente com telefone ${client.telefone} já existe` });
				skippedCount++;
				continue;
			}
		}

		clientsToInsert.push({
			organizacaoId: userOrgId,
			nome: client.nome,
			telefone: client.telefone ?? "",
			telefoneBase: telefoneBase,
			email: client.email && client.email.trim().length > 0 ? client.email.trim() : null,
			dataNascimento: client.dataNascimento ?? null,
			canalAquisicao: client.canalAquisicao ?? null,
			localizacaoCidade: client.localizacaoCidade ?? null,
			localizacaoEstado: client.localizacaoEstado ?? null,
			localizacaoBairro: client.localizacaoBairro ?? null,
			localizacaoCep: client.localizacaoCep ?? null,
			dataInsercao: new Date(),
		});
	}

	let insertedCount = 0;
	if (clientsToInsert.length > 0) {
		await db.transaction(async (tx) => {
			// Check if a cashback program exists for this organization
			const existingCashbackProgram = await tx.query.cashbackPrograms.findFirst({
				where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
				columns: { id: true },
			});

			// Insert clients in batches of 100 to avoid database limits
			const BATCH_SIZE = 100;
			const insertedClientIds: string[] = [];

			for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
				const batch = clientsToInsert.slice(i, i + BATCH_SIZE);
				const inserted = await tx.insert(clients).values(batch).returning({ id: clients.id });
				insertedClientIds.push(...inserted.map((c) => c.id));
				insertedCount += batch.length;
			}

			// If a cashback program exists, create balances for all newly inserted clients
			if (existingCashbackProgram && insertedClientIds.length > 0) {
				const balancesToInsert = insertedClientIds.map((clientId) => ({
					organizacaoId: userOrgId,
					clienteId: clientId,
					programaId: existingCashbackProgram.id,
				}));

				for (let i = 0; i < balancesToInsert.length; i += BATCH_SIZE) {
					const batch = balancesToInsert.slice(i, i + BATCH_SIZE);
					await tx.insert(cashbackProgramBalances).values(batch);
				}
			}
		});
	}

	return {
		data: {
			insertedCount,
			skippedCount,
			errors,
		},
		message:
			insertedCount > 0
				? `${insertedCount} cliente(s) importado(s) com sucesso.${skippedCount > 0 ? ` ${skippedCount} registro(s) ignorado(s).` : ""}`
				: "Nenhum cliente foi importado.",
	};
}
export type TBulkCreateClientsOutput = Awaited<ReturnType<typeof bulkCreateClients>>;
const bulkCreateClientsRoute: NextApiHandler<PostResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = BulkClientImportInputSchema.parse(req.body) as TBulkClientImportInput;

	const response = await bulkCreateClients({ input, sessionUser });

	return res.status(201).json(response);
};

export default apiHandler({ POST: bulkCreateClientsRoute });
