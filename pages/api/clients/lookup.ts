import { apiHandler } from "@/lib/api";
import { formatPhoneAsBase } from "@/lib/formatting";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

const ClientByLookupInputSchema = z.object({
	orgId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	phone: z.string({
		required_error: "Telefone não informado.",
		invalid_type_error: "Tipo não válido para telefone.",
	}),
	clientId: z
		.string({
			required_error: "ID do cliente não informado.",
			invalid_type_error: "Tipo não válido para ID do cliente.",
		})
		.optional()
		.nullable(),
});
export type TClientByLookupInput = z.infer<typeof ClientByLookupInputSchema>;

async function getClientByLookup(input: TClientByLookupInput) {
	console.log("[INFO] Running getClientByLookup with input:", input);
	if (input.clientId) {
		const client = await db.query.clients.findFirst({
			where: eq(clients.id, input.clientId),
			columns: {
				id: true,
				nome: true,
				telefone: true,
				email: true,
			},
			with: {
				saldos: {
					columns: {
						id: true,
						saldoValorDisponivel: true,
						saldoValorAcumuladoTotal: true,
						saldoValorResgatadoTotal: true,
					},
				},
			},
		});
		if (!client) {
			throw new createHttpError.NotFound("Cliente não encontrado.");
		}
		return {
			data: client,
			message: "Cliente encontrado com sucesso.",
		};
	}
	// Format phone to base for comparison
	const phoneBase = formatPhoneAsBase(input.phone);

	if (!phoneBase) {
		throw new createHttpError.BadRequest("Telefone inválido.");
	}

	// Find client by phone and organization
	const client = await db.query.clients.findFirst({
		where: and(eq(clients.telefoneBase, phoneBase), eq(clients.organizacaoId, input.orgId)),
		columns: {
			id: true,
			nome: true,
			telefone: true,
			email: true,
		},
		with: {
			saldos: {
				columns: {
					id: true,
					saldoValorDisponivel: true,
					saldoValorAcumuladoTotal: true,
					saldoValorResgatadoTotal: true,
				},
			},
		},
	});

	if (!client) {
		return {
			data: null,
			message: "Cliente não encontrado.",
		};
	}

	return {
		data: client,
		message: "Cliente encontrado com sucesso.",
	};
}

export type TClientByLookupOutput = Awaited<ReturnType<typeof getClientByLookup>>;

const clientByLookupRoute: NextApiHandler<TClientByLookupOutput> = async (req, res) => {
	console.log("[INFO] Running clientByLookupRoute with query:", req.query);
	const input = ClientByLookupInputSchema.parse(req.query);
	const result = await getClientByLookup(input);
	return res.status(200).json(result);
};

export default apiHandler({
	GET: clientByLookupRoute,
});
