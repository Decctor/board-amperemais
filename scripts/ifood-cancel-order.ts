import "@/utils/scripts/load-next-env";

import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { getIfoodOrderCancellationReasons, requestIfoodOrderCancellation } from "@/lib/integrations/ifood/orders";
import { connection, db } from "@/services/drizzle";

const DEFAULT_ORGANIZATION_ID = "59c2b238-bc21-4710-b47b-db6e2a380079";

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const arg = process.argv.find((value) => value.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function printHelp() {
	console.log(`
Solicita o cancelamento de um pedido no iFood pela Order API, fora da UI. Serve para destravar a
homologação quando o botão do painel falha — a solicitação é a mesma que a UI faz.

Uso:
  npm run ifood:cancel-order -- (--order-id=<uuid> | --display-id=<numero>) [--code=<codigo>] [opções]

Identificação do pedido (uma das duas):
  --order-id        UUID do pedido no iFood (o \`sales.idExterno\`).
  --display-id      Número curto que aparece no painel (ex.: 8430). Resolvido pela tabela sales.

Opções:
  --code            Código do motivo (de /cancellationReasons). Sem ele, o script apenas LISTA os
                    motivos disponíveis e sai sem cancelar nada.
  --org             ID da organização. Padrão: ${DEFAULT_ORGANIZATION_ID}
  --integration-id  ID da linha de integrations (obrigatório com mais de uma conexão iFood ativa).
  --yes             Confirma o envio. Sem esta flag o script faz um dry-run e não chama a API.

Fluxo sugerido:
  1) npm run ifood:cancel-order -- --display-id=8430                 (lista os motivos)
  2) npm run ifood:cancel-order -- --display-id=8430 --code=501 --yes (envia)
`);
}

/**
 * O painel mostra o displayId (curto); a Order API exige o UUID. A venda ingerida guarda os dois:
 * \`idExterno\` é o UUID do iFood e \`documento\` recebe o displayId no mapper.
 */
async function resolveOrderId({ organizationId, displayId }: { organizationId: string; displayId: string }) {
	const normalized = displayId.replace(/^#/, "").trim();
	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizationId), eq(fields.documento, normalized)),
		columns: { id: true, idExterno: true, documento: true, statusAtendimento: true, statusVenda: true },
	});
	if (!sale) throw new Error(`Pedido #${normalized} não encontrado nas vendas da organização ${organizationId}.`);
	if (!sale.idExterno) throw new Error(`Venda ${sale.id} não tem idExterno — não é um pedido de canal integrado.`);
	console.log(`[IFOOD_CANCEL_ORDER] Pedido #${normalized} resolvido.`, {
		orderId: sale.idExterno,
		vendaId: sale.id,
		statusAtendimento: sale.statusAtendimento,
		statusVenda: sale.statusVenda,
	});
	return sale.idExterno;
}

async function main() {
	if (hasFlag("help")) {
		printHelp();
		return;
	}

	const organizationId = getArgValue("org") ?? process.env.IFOOD_TEST_ORGANIZATION_ID ?? DEFAULT_ORGANIZATION_ID;
	const integrationId = getArgValue("integration-id");
	const displayId = getArgValue("display-id");
	const explicitOrderId = getArgValue("order-id");
	const cancellationCode = getArgValue("code");

	if (!explicitOrderId && !displayId) {
		printHelp();
		throw new Error("Informe --order-id=<uuid> ou --display-id=<numero>.");
	}

	const orderId = explicitOrderId ?? (await resolveOrderId({ organizationId, displayId: displayId as string }));
	const context = await resolveIfoodManagementContext({ organizacaoId: organizationId, integrationId });

	const reasons = await getIfoodOrderCancellationReasons(context.client, orderId);
	console.log(`[IFOOD_CANCEL_ORDER] Motivos aceitos pelo iFood para este pedido (${reasons.length}):`);
	for (const reason of reasons) console.log(`  ${reason.codigo.padEnd(8)} ${reason.descricao}`);

	if (!cancellationCode) {
		console.log("\n[IFOOD_CANCEL_ORDER] Nenhum --code informado — nada foi enviado. Rode de novo com --code=<codigo> --yes.");
		return;
	}

	// O iFood recusa código fora da lista do pedido, e o erro dele não diz qual era válido —
	// barramos aqui para não gastar tentativa de homologação num 400 evitável.
	const chosen = reasons.find((reason) => reason.codigo === cancellationCode);
	if (!chosen) throw new Error(`Código "${cancellationCode}" não está entre os motivos aceitos para este pedido. Use um dos listados acima.`);

	if (!hasFlag("yes")) {
		console.log(`\n[IFOOD_CANCEL_ORDER] DRY-RUN: cancelaria ${orderId} com "${chosen.codigo} - ${chosen.descricao}". Repita com --yes para enviar.`);
		return;
	}

	console.log(`\n[IFOOD_CANCEL_ORDER] Enviando cancelamento de ${orderId} — "${chosen.codigo} - ${chosen.descricao}"...`);
	await requestIfoodOrderCancellation(context.client, orderId, chosen.codigo);
	console.log("[IFOOD_CANCEL_ORDER] Solicitação aceita (202). O desfecho chega pelo polling como CANCELLED ou CANCELLATION_REQUEST_FAILED.");
	console.log("[IFOOD_CANCEL_ORDER] Deixe `npm run ifood:homologation-polling -- --collect` rodando para consolidar o evento.");
}

main()
	.catch((error) => {
		console.error("[IFOOD_CANCEL_ORDER] Falha ao solicitar o cancelamento.");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
