import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { formatPhoneAsBase } from "@/lib/formatting";
import { BulkClientImportInputSchema, type TBulkClientImportInput } from "@/schemas/clients";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";

type PostResponse = {
	data: {
		insertedCount: number;
		skippedCount: number;
		errors: Array<{ row: number; message: string }>;
	};
	message: string;
};

const bulkCreateClientsRoute: NextApiHandler<PostResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = BulkClientImportInputSchema.parse(req.body) as TBulkClientImportInput;

	const clientsToInsert: Array<{
		organizacaoId: string;
		nome: string;
		telefone: string;
		telefoneBase: string;
		email: string | null;
		dataNascimento: Date | null;
		canalAquisicao: string | null;
		localizacaoCidade: string | null;
		localizacaoEstado: string | null;
		localizacaoBairro: string | null;
		localizacaoCep: string | null;
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
			nome: client.nome.trim(),
			telefone: client.telefone ?? "",
			telefoneBase: telefoneBase,
			email: client.email && client.email.trim().length > 0 ? client.email.trim() : null,
			dataNascimento: client.dataNascimento ?? null,
			canalAquisicao: client.canalAquisicao ?? null,
			localizacaoCidade: client.localizacaoCidade ?? null,
			localizacaoEstado: client.localizacaoEstado ?? null,
			localizacaoBairro: client.localizacaoBairro ?? null,
			localizacaoCep: client.localizacaoCep ?? null,
		});
	}

	let insertedCount = 0;
	if (clientsToInsert.length > 0) {
		// Insert in batches of 100 to avoid database limits
		const BATCH_SIZE = 100;
		for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
			const batch = clientsToInsert.slice(i, i + BATCH_SIZE);
			await db.insert(clients).values(batch);
			insertedCount += batch.length;
		}
	}

	return res.status(201).json({
		data: {
			insertedCount,
			skippedCount,
			errors,
		},
		message:
			insertedCount > 0
				? `${insertedCount} cliente(s) importado(s) com sucesso.${skippedCount > 0 ? ` ${skippedCount} registro(s) ignorado(s).` : ""}`
				: "Nenhum cliente foi importado.",
	});
};

export default apiHandler({ POST: bulkCreateClientsRoute });
