import { getCadenceForSegment, getEffectiveSegmentCadences } from "@/lib/routine/cadence";
import { db } from "@/services/drizzle";
import { chats, clientSellerReferences, clients, interactions, products } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";

// Fila da rotina do vendedor (docs/seller-routine-hub-design.md §5).
// A fila é uma CONSULTA, não uma tabela: débito de comunicação (dias desde a última
// interação vs. cadência do segmento), com piso de fadiga, supressões (pausa, follow-up
// pendente, inbound recente) e boosts de contexto. Cap diário: fila terminável cria hábito.
export const QUEUE_DAILY_CAP = 12;
const PORTFOLIO_SCAN_LIMIT = 3000;
const SEGMENT_CHANGE_BOOST_WINDOW_DAYS = 30;
const SECOND_PURCHASE_WINDOW_DAYS = 21;
const MIN_PURCHASES_FOR_RELIABLE_CYCLE = 3;
const TOP_CLIENT_VALUE_QUANTILE = 0.9;

// Segmentos onde "entrou no segmento recentemente" é um sinal de alerta (não de conquista).
const AT_RISK_SEGMENTS = new Set(["EM RISCO", "PRESTES A DORMIR", "PRECISAM DE ATENÇÃO", "HIBERNANDO", "NÃO PODE PERDÊ-LOS", "PERDIDOS"]);

export type TQueueReasonType = "DEBITO_CADENCIA" | "CICLO_ESTOURADO" | "MUDANCA_SEGMENTO" | "ANIVERSARIO" | "TOP_CLIENTE_FRIO" | "SEGUNDA_COMPRA";

export type TQueueReason = {
	tipo: TQueueReasonType;
	texto: string;
};

type TPortfolioClientRow = {
	clienteId: string;
	clienteNome: string;
	clienteTelefone: string;
	segmento: string | null;
	segmentoUltimaAlteracao: Date | null;
	dataNascimento: Date | null;
	comunicacaoPausadaAte: Date | null;
	primeiraCompraData: Date | null;
	ultimaCompraData: Date | null;
	totalCompras: number | null;
	valorTotalCompras: number | null;
	produtoSugeridoId: string | null;
	produtoMaisCompradoId: string | null;
	scoreVinculo: number;
};

function computeAveragePurchaseCycleDays(client: Pick<TPortfolioClientRow, "primeiraCompraData" | "ultimaCompraData" | "totalCompras">): number | null {
	if (!client.primeiraCompraData || !client.ultimaCompraData) return null;
	if (!client.totalCompras || client.totalCompras < MIN_PURCHASES_FOR_RELIABLE_CYCLE) return null;
	const spanDays = dayjs(client.ultimaCompraData).diff(client.primeiraCompraData, "day");
	if (spanDays <= 0) return null;
	return Math.round(spanDays / (client.totalCompras - 1));
}

export async function buildRoutineQueue({ organizacaoId, vendedorId }: { organizacaoId: string; vendedorId: string }) {
	const now = dayjs();
	const cadences = await getEffectiveSegmentCadences(organizacaoId);

	// 1. Carteira do vendedor: clientes onde ele é o dono do vínculo (ranking 1).
	const portfolioRows = await db
		.select({
			clienteId: clientSellerReferences.clienteId,
			clienteNome: clients.nome,
			clienteTelefone: clients.telefone,
			segmento: clients.analiseRFMTitulo,
			segmentoUltimaAlteracao: clients.analiseRFMUltimaAlteracao,
			dataNascimento: clients.dataNascimento,
			comunicacaoPausadaAte: clients.comunicacaoPausadaAte,
			primeiraCompraData: clients.primeiraCompraData,
			ultimaCompraData: clients.ultimaCompraData,
			totalCompras: clients.metadataTotalCompras,
			valorTotalCompras: clients.metadataValorTotalCompras,
			produtoSugeridoId: clients.metadataProdutoSugeridoId,
			produtoMaisCompradoId: clients.metadataProdutoMaisCompradoId,
			scoreVinculo: clientSellerReferences.scoreVinculo,
		})
		.from(clientSellerReferences)
		.innerJoin(clients, eq(clientSellerReferences.clienteId, clients.id))
		.where(
			and(
				eq(clientSellerReferences.organizacaoId, organizacaoId),
				eq(clientSellerReferences.vendedorId, vendedorId),
				eq(clientSellerReferences.rankingVinculo, 1),
			),
		)
		.orderBy(desc(clientSellerReferences.scoreVinculo))
		.limit(PORTFOLIO_SCAN_LIMIT);

	const carteiraTotal = portfolioRows.length;
	if (carteiraTotal === 0) {
		return { queue: [], totalEmDebito: 0, carteiraTotal: 0 };
	}

	const clientIds = portfolioRows.map((row) => row.clienteId);

	// 2. Relógios de comunicação por cliente. `dataInteracao` é a âncora canônica; o COALESCE
	// cobre linhas de campanha ainda não backfilladas (a máquina de entrega não preenche os
	// campos de relacionamento — fronteira intocada por design).
	const touchAnchor = sql`coalesce(${interactions.dataInteracao}, ${interactions.dataEnvio}, ${interactions.dataExecucao})`;
	const touchRows = await db
		.select({
			clienteId: interactions.clienteId,
			// Fadiga: qualquer saída (inclusive campanha só enviada) conta para "não abordar já".
			ultimoToque: sql<
				string | null
			>`max(${touchAnchor}) filter (where ${interactions.status} = 'REALIZADA' or ${interactions.statusEnvio} in ('ENVIADO', 'ENTREGUE', 'LIDO'))`,
			// Débito de cadência: só contato que chegou (manual realizado ou campanha entregue+).
			ultimaSaidaRealizada: sql<
				string | null
			>`max(${touchAnchor}) filter (where ${interactions.status} = 'REALIZADA' or ${interactions.statusEnvio} in ('ENTREGUE', 'LIDO'))`,
			temPlanejadaPendente: sql<boolean>`bool_or(${interactions.status} = 'PLANEJADA')`,
		})
		.from(interactions)
		.where(and(eq(interactions.organizacaoId, organizacaoId), inArray(interactions.clienteId, clientIds)))
		.groupBy(interactions.clienteId);
	const touchesByClient = new Map(touchRows.map((row) => [row.clienteId, row]));

	// 3. Inbound recente (Atendimentos): cliente que acabou de falar conosco não entra na fila.
	const inboundRows = await db
		.select({
			clienteId: chats.clienteId,
			ultimaInteracaoCliente: sql<string | null>`max(${chats.ultimaInteracaoClienteData})`,
		})
		.from(chats)
		.where(and(eq(chats.organizacaoId, organizacaoId), inArray(chats.clienteId, clientIds)))
		.groupBy(chats.clienteId);
	const inboundByClient = new Map(inboundRows.map((row) => [row.clienteId, row.ultimaInteracaoCliente]));

	// 4. Peso de valor: LTV relativo dentro da carteira + limiar de "top cliente".
	const sortedValues = portfolioRows.map((row) => row.valorTotalCompras ?? 0).sort((a, b) => a - b);
	const maxValue = sortedValues[sortedValues.length - 1] || 0;
	const topClientThreshold = sortedValues[Math.floor(sortedValues.length * TOP_CLIENT_VALUE_QUANTILE)] ?? Number.POSITIVE_INFINITY;

	type TScoredCandidate = {
		client: TPortfolioClientRow;
		score: number;
		reasons: TQueueReason[];
		diasSemContato: number | null;
		cadenciaIdealDias: number;
		cicloMedioDias: number | null;
	};

	const candidates: TScoredCandidate[] = [];
	let totalEmDebito = 0;

	for (const client of portfolioRows) {
		const cadence = getCadenceForSegment(cadences, client.segmento);
		if (!cadence.ativo) continue;

		// Supressões absolutas.
		if (client.comunicacaoPausadaAte && dayjs(client.comunicacaoPausadaAte).isAfter(now)) continue;
		const touches = touchesByClient.get(client.clienteId);
		if (touches?.temPlanejadaPendente) continue;

		// Piso de fadiga: qualquer toque de saída ou inbound recente segura o cliente fora da fila.
		const lastAnyTouch = touches?.ultimoToque ? dayjs(touches.ultimoToque) : null;
		if (lastAnyTouch && now.diff(lastAnyTouch, "day") < cadence.diasMinimoEntreContatos) continue;
		const lastInbound = inboundByClient.get(client.clienteId);
		if (lastInbound && now.diff(dayjs(lastInbound), "day") < cadence.diasMinimoEntreContatos) continue;

		// Débito de cadência. Sem nenhum contato registrado, o relógio parte da última compra
		// (ou do cadastro) — cliente novo na base não entra como "devendo há anos".
		const cadenceAnchor = touches?.ultimaSaidaRealizada ?? client.ultimaCompraData ?? client.primeiraCompraData;
		const diasSemContato = cadenceAnchor ? now.diff(dayjs(cadenceAnchor), "day") : null;

		const reasons: TQueueReason[] = [];
		let score = 0;

		const emDebito = diasSemContato !== null && diasSemContato > cadence.diasIdealEntreContatos;
		if (emDebito) {
			totalEmDebito += 1;
			const saldoRelativo = Math.min(3, diasSemContato / cadence.diasIdealEntreContatos);
			const pesoValor = maxValue > 0 ? (client.valorTotalCompras ?? 0) / maxValue : 0;
			score += saldoRelativo * (0.5 + 0.5 * pesoValor);
			reasons.push({
				tipo: "DEBITO_CADENCIA",
				texto: `Sem contato há ${diasSemContato} dias — a cadência de ${cadence.segmento === "SEM SEGMENTO" ? "clientes sem segmento" : cadence.segmento.toLowerCase()} é ${cadence.diasIdealEntreContatos}.`,
			});
		}

		// Boosts de contexto (só valem para quem já está em débito — exceto aniversário,
		// que entra na fila por si só).
		const birthday = client.dataNascimento ? dayjs(client.dataNascimento) : null;
		const isBirthdayToday = birthday ? birthday.date() === now.date() && birthday.month() === now.month() : false;
		if (isBirthdayToday) {
			score += 2;
			reasons.push({ tipo: "ANIVERSARIO", texto: "Faz aniversário hoje." });
		}

		if (!emDebito && !isBirthdayToday) continue;

		if (
			client.segmento &&
			AT_RISK_SEGMENTS.has(client.segmento) &&
			client.segmentoUltimaAlteracao &&
			now.diff(dayjs(client.segmentoUltimaAlteracao), "day") <= SEGMENT_CHANGE_BOOST_WINDOW_DAYS
		) {
			score += 1.5;
			reasons.push({
				tipo: "MUDANCA_SEGMENTO",
				texto: `Entrou em ${client.segmento} em ${dayjs(client.segmentoUltimaAlteracao).format("DD/MM")}.`,
			});
		}

		const cicloMedioDias = computeAveragePurchaseCycleDays(client);
		const diasSemComprar = client.ultimaCompraData ? now.diff(dayjs(client.ultimaCompraData), "day") : null;
		if (cicloMedioDias && diasSemComprar !== null && diasSemComprar > cicloMedioDias) {
			score += 1;
			reasons.push({
				tipo: "CICLO_ESTOURADO",
				texto: `Sem comprar há ${diasSemComprar} dias — o ciclo de recompra é de ~${cicloMedioDias}.`,
			});
			if ((client.valorTotalCompras ?? 0) >= topClientThreshold) {
				score += 0.75;
				reasons.push({ tipo: "TOP_CLIENTE_FRIO", texto: "Um dos maiores clientes da sua carteira esfriando." });
			}
		}

		if (client.totalCompras === 1 && client.primeiraCompraData && now.diff(dayjs(client.primeiraCompraData), "day") <= SECOND_PURCHASE_WINDOW_DAYS) {
			score += 0.5;
			reasons.push({ tipo: "SEGUNDA_COMPRA", texto: "Primeira compra recente — janela ideal para garantir a segunda." });
		}

		candidates.push({
			client,
			score,
			reasons,
			diasSemContato,
			cadenciaIdealDias: cadence.diasIdealEntreContatos,
			cicloMedioDias,
		});
	}

	candidates.sort((a, b) => b.score - a.score);
	const capped = candidates.slice(0, QUEUE_DAILY_CAP);

	// 5. Enriquecimento só dos que vão para a tela: nomes de produtos e último contato.
	const productIds = [
		...new Set(capped.flatMap((candidate) => [candidate.client.produtoSugeridoId, candidate.client.produtoMaisCompradoId]).filter(Boolean)),
	] as string[];
	const productRows = productIds.length
		? await db.query.products.findMany({
				where: and(eq(products.organizacaoId, organizacaoId), inArray(products.id, productIds)),
				columns: { id: true, nome: true },
			})
		: [];
	const productNamesById = new Map(productRows.map((product) => [product.id, product.nome]));

	const cappedClientIds = capped.map((candidate) => candidate.client.clienteId);
	const lastTouchDetails = cappedClientIds.length
		? await db
				.select({
					clienteId: interactions.clienteId,
					titulo: interactions.titulo,
					canal: interactions.canal,
					iniciadoPor: interactions.iniciadoPor,
					statusEnvio: interactions.statusEnvio,
					campanhaId: interactions.campanhaId,
					dataInteracao: sql<string | null>`${touchAnchor}`,
					rowNumber: sql<number>`row_number() over (partition by ${interactions.clienteId} order by ${touchAnchor} desc nulls last)`,
				})
				.from(interactions)
				.where(
					and(
						eq(interactions.organizacaoId, organizacaoId),
						inArray(interactions.clienteId, cappedClientIds),
						sql`(${interactions.status} = 'REALIZADA' or ${interactions.statusEnvio} in ('ENVIADO', 'ENTREGUE', 'LIDO'))`,
					),
				)
		: [];
	const lastTouchByClient = new Map(lastTouchDetails.filter((row) => Number(row.rowNumber) === 1).map((row) => [row.clienteId, row]));

	const queue = capped.map((candidate) => {
		const lastTouch = lastTouchByClient.get(candidate.client.clienteId);
		return {
			cliente: {
				id: candidate.client.clienteId,
				nome: candidate.client.clienteNome,
				telefone: candidate.client.clienteTelefone,
				segmento: candidate.client.segmento,
				totalCompras: candidate.client.totalCompras ?? 0,
				valorTotalCompras: candidate.client.valorTotalCompras ?? 0,
				ultimaCompraData: candidate.client.ultimaCompraData,
			},
			score: Number(candidate.score.toFixed(3)),
			motivos: candidate.reasons,
			diasSemContato: candidate.diasSemContato,
			cadenciaIdealDias: candidate.cadenciaIdealDias,
			cicloMedioDias: candidate.cicloMedioDias,
			oferta: {
				produtoRecompraId: candidate.client.produtoMaisCompradoId,
				produtoRecompraNome: candidate.client.produtoMaisCompradoId ? (productNamesById.get(candidate.client.produtoMaisCompradoId) ?? null) : null,
				produtoSugeridoId: candidate.client.produtoSugeridoId,
				produtoSugeridoNome: candidate.client.produtoSugeridoId ? (productNamesById.get(candidate.client.produtoSugeridoId) ?? null) : null,
			},
			ultimoContato: lastTouch
				? {
						titulo: lastTouch.titulo,
						canal: lastTouch.canal,
						origem: lastTouch.campanhaId ? ("CAMPANHA" as const) : ("MANUAL" as const),
						statusEnvio: lastTouch.statusEnvio,
						data: lastTouch.dataInteracao,
					}
				: null,
		};
	});

	return { queue, totalEmDebito, carteiraTotal };
}
export type TRoutineQueue = Awaited<ReturnType<typeof buildRoutineQueue>>;

/** Follow-ups do dia (interações PLANEJADA com data até o fim de hoje, atrasadas inclusas). */
export async function getDayFollowUps({ organizacaoId, vendedorId }: { organizacaoId: string; vendedorId: string }) {
	const endOfDay = dayjs().endOf("day").toDate();
	const startOfDay = dayjs().startOf("day").toDate();

	const rows = await db.query.interactions.findMany({
		where: and(
			eq(interactions.organizacaoId, organizacaoId),
			eq(interactions.vendedorId, vendedorId),
			eq(interactions.status, "PLANEJADA"),
			lte(interactions.dataInteracao, endOfDay),
		),
		columns: { id: true, clienteId: true, titulo: true, descricao: true, canal: true, dataInteracao: true },
		with: {
			cliente: { columns: { id: true, nome: true, telefone: true } },
		},
		orderBy: (fields, { asc }) => [asc(fields.dataInteracao)],
	});

	return rows.map((row) => ({
		...row,
		atrasado: row.dataInteracao ? row.dataInteracao < startOfDay : false,
	}));
}
export type TDayFollowUps = Awaited<ReturnType<typeof getDayFollowUps>>;
