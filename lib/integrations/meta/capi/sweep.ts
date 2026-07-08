import type { TSaleCapiMetadata } from "@/schemas/sales";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { and, eq, gte, isNotNull, or, sql } from "drizzle-orm";

import type { TCapiPurchaseTarget } from "./config";
import { sendCapiEvents } from "./client";
import { type TCapiActionSource, buildSalePurchaseEvent } from "./events";

// A Meta rejeita eventos com event_time > 7 dias. Só varremos vendas dentro dessa janela — o que
// também impede que a importação histórica de ERP (dataVenda antiga) dispare eventos retroativos.
const WINDOW_DAYS = 7;
const MAX_ATTEMPTS = 5;
// Teto de vendas processadas por org por execução (limita a duração do cron).
const BATCH_LIMIT = 300;

type EligibleSaleRow = {
	id: string;
	valorTotal: number;
	dataVenda: Date | null;
	canal: string | null;
	capiMetadados: TSaleCapiMetadata | null;
	clienteEmail: string | null;
	clienteTelefone: string | null;
	clienteNome: string | null;
	clienteCidade: string | null;
	clienteEstado: string | null;
	clienteNascimento: Date | null;
};

/** Deriva o action_source da Meta a partir do canal da venda (loja digital -> website; senão offline). */
function resolveActionSource(canal: string | null): TCapiActionSource {
	const normalized = (canal ?? "").toLowerCase();
	if (/online|shop|loja digital|e-?commerce|marketplace|web/.test(normalized)) return "website";
	return "physical_store";
}

async function fetchEligibleSales(organizacaoId: string, cutoff: Date): Promise<EligibleSaleRow[]> {
	return db
		.select({
			id: sales.id,
			valorTotal: sales.valorTotal,
			dataVenda: sales.dataVenda,
			canal: sales.canal,
			capiMetadados: sales.capiMetadados,
			clienteEmail: clients.email,
			clienteTelefone: clients.telefone,
			clienteNome: clients.nome,
			clienteCidade: clients.localizacaoCidade,
			clienteEstado: clients.localizacaoEstado,
			clienteNascimento: clients.dataNascimento,
		})
		.from(sales)
		.innerJoin(clients, eq(sales.clienteId, clients.id))
		.where(
			and(
				eq(sales.organizacaoId, organizacaoId),
				isNotNull(sales.clienteId),
				// Só compras reais: ERP (status null) ou vendas confirmadas. Exclui orçamento/condicional/cancelada.
				or(sql`${sales.statusVenda} IS NULL`, eq(sales.statusVenda, "CONFIRMADA")),
				// Dentro da janela de 7 dias da Meta. Vendas sem dataVenda são ignoradas (sem event_time válido).
				gte(sales.dataVenda, cutoff),
				// Nunca processada, ou falha ainda dentro do teto de tentativas.
				sql`(${sales.capiMetadados} IS NULL OR (${sales.capiMetadados}->>'status' = 'FALHA' AND coalesce((${sales.capiMetadados}->>'tentativas')::int, 0) < ${MAX_ATTEMPTS}))`,
			),
		)
		.limit(BATCH_LIMIT);
}

export type TCapiSweepSummary = { processed: number; sent: number; failed: number };

/** Processa as vendas elegíveis de um alvo (uma conta META_ADS com CAPI de Purchase habilitado). */
export async function processCapiPurchaseTarget(target: TCapiPurchaseTarget): Promise<TCapiSweepSummary> {
	const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
	const rows = await fetchEligibleSales(target.organizacaoId, cutoff);

	let sent = 0;
	let failed = 0;

	for (const row of rows) {
		// dataVenda garantido não-nulo pelo filtro gte da query.
		const eventTime = row.dataVenda ?? new Date();
		const actionSource = resolveActionSource(row.canal);
		const previousAttempts = row.capiMetadados?.tentativas ?? 0;

		// Sem e-mail nem telefone não há identificador forte p/ matching na Meta: marca terminal
		// (tentativas no teto) para não reprocessar nem gastar chamadas.
		if (!row.clienteEmail?.trim() && !row.clienteTelefone?.trim()) {
			const terminal: TSaleCapiMetadata = {
				status: "FALHA",
				eventId: row.id,
				eventName: "Purchase",
				integrationId: target.integrationId,
				actionSource,
				tentativas: MAX_ATTEMPTS,
				ultimoErro: "Cliente sem e-mail/telefone para matching.",
			};
			await db.update(sales).set({ capiMetadados: terminal }).where(eq(sales.id, row.id));
			failed += 1;
			continue;
		}

		const event = await buildSalePurchaseEvent({
			saleId: row.id,
			value: row.valorTotal,
			eventTime,
			actionSource,
			pii: {
				email: row.clienteEmail,
				phone: row.clienteTelefone,
				nome: row.clienteNome,
				cidade: row.clienteCidade,
				estado: row.clienteEstado,
				dataNascimento: row.clienteNascimento,
			},
		});

		const result = await sendCapiEvents({
			pixelId: target.pixelId,
			accessToken: target.accessToken,
			testEventCode: target.testEventCode,
			events: [event],
		});

		const metadata: TSaleCapiMetadata = {
			status: result.ok ? "ENVIADO" : "FALHA",
			eventId: row.id,
			eventName: "Purchase",
			integrationId: target.integrationId,
			actionSource,
			tentativas: previousAttempts + 1,
			...(result.ok ? { eventsReceived: result.eventsReceived, dataEnvio: new Date().toISOString() } : { ultimoErro: result.error }),
		};

		await db.update(sales).set({ capiMetadados: metadata }).where(eq(sales.id, row.id));

		if (result.ok) sent += 1;
		else failed += 1;
	}

	return { processed: rows.length, sent, failed };
}
