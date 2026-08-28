import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { getIfoodMerchantStatus } from "@/lib/integrations/ifood/merchant";
import type { TIfoodMerchantStatusDTO } from "@/lib/integrations/ifood/merchant-types";
import { getIfoodOperationLabel } from "@/lib/integrations/ifood/operations";
import { canViewIntegrations } from "@/lib/integrations/mask";
import { normalizeShopSettingsConfiguration } from "@/lib/shop/config";
import { getShopAvailability } from "@/lib/shop/availability";
import type { TOrganizationMemberPermissions } from "@/schemas/organizations";
import { db } from "@/services/drizzle";

/**
 * Status operacional dos canais de venda de uma organização, para o trilho do header.
 *
 * Três regras moldam este módulo, e todas vêm de o header renderizar em TODA página do dashboard:
 *
 * 1. Nenhum canal derruba outro — cada um é resolvido isoladamente e uma falha vira `INDETERMINADO`.
 * 2. Prazo curto: o client do iFood tem timeout de 30s e re-tenta erros de rede, o que no pior caso
 *    seguraria o header por mais de um minuto. Aqui a consulta morre em `IFOOD_STATUS_TIMEOUT_MS`.
 * 3. Cache de `CACHE_TTL_MS` por organização, porque várias abas e recarregamentos duros não podem
 *    virar várias chamadas ao iFood.
 */

/** Vocabulário único de estado — é ele que deixa o pill do header genérico entre canais. */
export type TSalesChannelState = "ABERTA" | "FECHADA" | "ATENCAO" | "DESATIVADA" | "INDETERMINADO";
// Chave do trilho de STATUS do header (aberto/fechado por canal) — não confundir com o registro
// de canais de venda (`sales_channels`, enum POS|SHOP|COMANDA|IFOOD): vocabulários distintos,
// "LOJA_DIGITAL" aqui equivale a "SHOP" lá. Unificar quando o trilho migrar para o registro.
export type TSalesChannelStatusKey = "IFOOD" | "LOJA_DIGITAL";

export type TSalesChannelStatusDTO = {
	canal: TSalesChannelStatusKey;
	rotulo: string;
	estado: TSalesChannelState;
	detalhe: string | null;
	proximaAbertura: string | null;
	/** Quebra por operação (entrega, retirada...). Vazio para canais que não têm essa noção. */
	operacoes: { nome: string; disponivel: boolean }[];
	/** Quantas lojas do canal foram agregadas — o popover avisa quando é mais de uma. */
	lojas: number;
};

const CACHE_TTL_MS = 60_000;
const IFOOD_STATUS_TIMEOUT_MS = 5_000;
/** Teto de lojas consultadas por organização, para uma rede grande não virar uma rajada por minuto. */
const IFOOD_MAX_MERCHANTS = 5;

// ---------------------------------------------------------------------------
// Cache em memória por organização
// ---------------------------------------------------------------------------

type TCacheEntry = { expiresAt: number; canais: TSalesChannelStatusDTO[] };

const cache = new Map<string, TCacheEntry>();

function readCache(organizacaoId: string) {
	const entry = cache.get(organizacaoId);
	if (!entry) return null;
	if (entry.expiresAt <= Date.now()) {
		cache.delete(organizacaoId);
		return null;
	}
	return entry.canais;
}

function writeCache(organizacaoId: string, canais: TSalesChannelStatusDTO[]) {
	// Poda oportunista: sem isso o Map cresce com toda organização que já passou pelo processo.
	for (const [key, entry] of cache) {
		if (entry.expiresAt <= Date.now()) cache.delete(key);
	}
	cache.set(organizacaoId, { expiresAt: Date.now() + CACHE_TTL_MS, canais });
}

// ---------------------------------------------------------------------------
// iFood
// ---------------------------------------------------------------------------

/**
 * Reduz as operações de todas as lojas a um estado só. A pergunta que o pill responde é "dá para
 * receber pedido agora?", então qualquer operação disponível já vale como aberta — o popover é quem
 * mostra a quebra.
 */
function reduceIfoodOperations(operacoes: TIfoodMerchantStatusDTO[]) {
	const disponivel = operacoes.some((operacao) => operacao.disponivel);
	const temAlerta = operacoes.some((operacao) => {
		const estado = operacao.estado?.toUpperCase();
		return estado === "WARNING" || estado === "ERROR";
	});

	const estado: TSalesChannelState = disponivel ? "ABERTA" : temAlerta ? "ATENCAO" : "FECHADA";

	// O detalhe útil é o primeiro motivo que o iFood dá: a mensagem da operação ou uma validação pendente.
	const detalhe =
		operacoes.find((operacao) => !operacao.disponivel)?.mensagem?.titulo ??
		operacoes.flatMap((operacao) => operacao.validacoes).find((validacao) => validacao.titulo)?.titulo ??
		null;

	return { estado, detalhe };
}

async function buildIfoodChannel(organizacaoId: string): Promise<TSalesChannelStatusDTO | null> {
	const context = await resolveIfoodManagementContext({ organizacaoId });
	const merchantIds = context.merchantIds.slice(0, IFOOD_MAX_MERCHANTS);
	if (!merchantIds.length) return null;

	const base = { canal: "IFOOD" as const, rotulo: "iFood", proximaAbertura: null, lojas: merchantIds.length };

	try {
		const signal = AbortSignal.timeout(IFOOD_STATUS_TIMEOUT_MS);
		const porLoja = await Promise.all(merchantIds.map((merchantId) => getIfoodMerchantStatus(context.client, merchantId, { signal })));
		const operacoes = porLoja.flat();
		const { estado, detalhe } = reduceIfoodOperations(operacoes);

		// Nomes de operação repetem entre lojas; a união responde "esta operação está de pé em algum lugar?".
		// O rótulo é resolvido aqui porque o pill é genérico — ele não pode saber o que "DELIVERY" quer dizer.
		const porOperacao = new Map<string, boolean>();
		for (const operacao of operacoes) {
			const nome = getIfoodOperationLabel(operacao.operacao);
			porOperacao.set(nome, (porOperacao.get(nome) ?? false) || operacao.disponivel);
		}

		return {
			...base,
			estado,
			detalhe,
			operacoes: [...porOperacao].map(([nome, disponivel]) => ({ nome, disponivel })),
		};
	} catch (error) {
		console.error("[SALES_CHANNELS] Falha ao consultar o status do iFood:", error);
		return { ...base, estado: "INDETERMINADO", detalhe: "Não foi possível consultar o iFood agora.", operacoes: [] };
	}
}

// ---------------------------------------------------------------------------
// Loja digital
// ---------------------------------------------------------------------------

const SHOP_DETALHE_POR_MOTIVO: Record<string, string> = {
	INATIVA: "A loja digital está desativada nas configurações.",
	SEM_HORARIO: "Nenhum horário de funcionamento configurado.",
	FORA_DO_HORARIO: "Fora do horário de funcionamento.",
};

async function buildShopChannel(organizacaoId: string): Promise<TSalesChannelStatusDTO | null> {
	const settings = await db.query.shopSettings.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, organizacaoId),
		columns: { ativo: true, configuracoes: true },
	});
	if (!settings) return null;

	const disponibilidade = getShopAvailability({
		ativo: settings.ativo,
		configuracoes: normalizeShopSettingsConfiguration(settings.configuracoes),
	});

	const estado: TSalesChannelState = disponibilidade.status === "ABERTA" ? "ABERTA" : disponibilidade.status === "FECHADA" ? "FECHADA" : "DESATIVADA";

	return {
		canal: "LOJA_DIGITAL",
		rotulo: "Loja digital",
		estado,
		// A mensagem da exceção de data é mais específica que o motivo genérico, então vem primeiro.
		detalhe: disponibilidade.mensagem ?? SHOP_DETALHE_POR_MOTIVO[disponibilidade.motivo] ?? null,
		proximaAbertura: disponibilidade.proximaAbertura?.toISOString() ?? null,
		operacoes: [],
		lojas: 1,
	};
}

// ---------------------------------------------------------------------------
// Agregação
// ---------------------------------------------------------------------------

/** `null` de um canal significa "esta organização não tem esse canal" — o pill nem monta. */
async function settleChannel(build: () => Promise<TSalesChannelStatusDTO | null>) {
	try {
		return await build();
	} catch (error) {
		console.error("[SALES_CHANNELS] Canal ignorado após falha na resolução:", error);
		return null;
	}
}

export async function getSalesChannelsStatus({
	organizacaoId,
	permissoes,
}: {
	organizacaoId: string;
	permissoes: TOrganizationMemberPermissions | null | undefined;
}): Promise<TSalesChannelStatusDTO[]> {
	const cached = readCache(organizacaoId);
	const canais =
		cached ??
		(await Promise.all([settleChannel(() => buildIfoodChannel(organizacaoId)), settleChannel(() => buildShopChannel(organizacaoId))])).filter(
			(canal): canal is TSalesChannelStatusDTO => canal !== null,
		);

	if (!cached) writeCache(organizacaoId, canais);

	// A permissão é aplicada na leitura, não no cache: dois usuários da mesma organização com
	// permissões diferentes compartilham a mesma consulta ao iFood e enxergam recortes diferentes.
	const podeVerIntegracoes = canViewIntegrations(permissoes);
	return canais.filter((canal) => canal.canal !== "IFOOD" || podeVerIntegracoes);
}
