import type { TFiscalDocumentLifecycleStatusEnum, TFiscalDocumentStatusEnum, TFiscalDocumentTypeEnum } from "@/schemas/enums";
import { FISCAL_DEADLINES, type TFiscalDeadlines } from "./constants";
import { FiscalReadinessError } from "./errors";

/**
 * Matriz de acoes de um documento fiscal — fonte unica para API (bloqueio) e UI (renderizacao).
 * Pura: recebe o documento, o relogio e o contexto opcional, e devolve o que pode ser feito, por
 * que nao pode e ate quando. Nao consulta banco nem provedor.
 */

export type TFiscalDocumentActionKey =
	| "CANCELAR"
	| "CARTA_CORRECAO"
	| "INUTILIZAR"
	| "DEVOLUCAO"
	| "REENVIAR"
	| "SINCRONIZAR"
	| "BAIXAR_XML"
	| "BAIXAR_PDF";

export type TFiscalDocumentAction = {
	acao: TFiscalDocumentActionKey;
	disponivel: boolean;
	// Texto pronto para o operador. null quando disponivel.
	motivoIndisponivel: string | null;
	// Janela legal, quando houver (cancelamento, inutilizacao). Preenchido mesmo quando expirada.
	prazoLimite: Date | null;
	// O que fazer no lugar quando indisponivel (ex.: CANCELAR fora do prazo -> DEVOLUCAO).
	alternativas: TFiscalDocumentActionKey[];
};

export type TFiscalDocumentForActions = {
	tipo: TFiscalDocumentTypeEnum;
	status: TFiscalDocumentStatusEnum;
	statusInterno: TFiscalDocumentLifecycleStatusEnum;
	numero: string | null;
	serie: string | null;
	chaveAcesso: string | null;
	vendaId: string | null;
	xmlStoragePath: string | null;
	pdfStoragePath: string | null;
	provedorDocumentoId: string | null;
	dataAutorizacao: Date | null;
	dataInsercao: Date;
};

export type TFiscalDocumentActionContext = {
	// Cartas de correcao ja registradas (limite legal de 20). Desconhecido = nao limita.
	correctionLettersIssued?: number | null;
	// Existe perfil de operacao DEVOLUCAO ativo? Desconhecido = assume que sim (a rota valida).
	hasReturnProfile?: boolean | null;
	// Existe devolucao autorizada referenciando este documento? Uma segunda nao faz sentido.
	hasAuthorizedReturn?: boolean | null;
	// Provedor MANUAL registra o fato localmente; nao ha SEFAZ para negar.
	provider?: string | null;
};

const TWO_DIGITS = (value: number) => String(value).padStart(2, "0");

function formatDeadline(date: Date) {
	return `${TWO_DIGITS(date.getDate())}/${TWO_DIGITS(date.getMonth() + 1)} ${TWO_DIGITS(date.getHours())}:${TWO_DIGITS(date.getMinutes())}`;
}

export function resolveCancellationDeadline({
	tipo,
	dataAutorizacao,
	deadlines = FISCAL_DEADLINES,
}: {
	tipo: TFiscalDocumentTypeEnum;
	dataAutorizacao: Date | null;
	deadlines?: TFiscalDeadlines;
}): Date | null {
	if (!dataAutorizacao) return null;
	const windowMs = tipo === "NFCE" ? deadlines.nfceCancellationMinutes * 60_000 : deadlines.nfeCancellationHours * 3_600_000;
	return new Date(dataAutorizacao.getTime() + windowMs);
}

// Inutilizacao: ate o dia N do mes seguinte ao da reserva da numeracao (fim do dia, hora local).
export function resolveInutilizationDeadline({
	dataInsercao,
	deadlines = FISCAL_DEADLINES,
}: {
	dataInsercao: Date;
	deadlines?: TFiscalDeadlines;
}): Date {
	return new Date(dataInsercao.getFullYear(), dataInsercao.getMonth() + 1, deadlines.inutilizationDayOfNextMonth, 23, 59, 59, 999);
}

function describeCancellationWindow(tipo: TFiscalDocumentTypeEnum, deadlines: TFiscalDeadlines) {
	return tipo === "NFCE" ? `${deadlines.nfceCancellationMinutes} min` : `${deadlines.nfeCancellationHours}h`;
}

const LIFECYCLE_EXPLANATION: Record<TFiscalDocumentLifecycleStatusEnum, string> = {
	RASCUNHO: "O documento ainda não foi enviado.",
	PRONTO_PARA_ENVIO: "O documento está na fila de envio.",
	EM_PROCESSAMENTO: "Aguarde o retorno do provedor e atualize o status.",
	AUTORIZADO: "O documento está autorizado.",
	REJEITADO: "Nada foi autorizado pela SEFAZ.",
	CANCELAMENTO_PENDENTE: "Há um cancelamento aguardando confirmação da SEFAZ.",
	CANCELADO: "O documento já foi cancelado.",
	INUTILIZADO: "A numeração deste documento foi inutilizada.",
	ERRO: "A emissão falhou antes de chegar à SEFAZ.",
};

export function resolveFiscalDocumentActions({
	document,
	now = new Date(),
	context = {},
	deadlines = FISCAL_DEADLINES,
}: {
	document: TFiscalDocumentForActions;
	now?: Date;
	context?: TFiscalDocumentActionContext;
	deadlines?: TFiscalDeadlines;
}): TFiscalDocumentAction[] {
	const status = document.statusInterno;
	const isAuthorized = status === "AUTORIZADO" && document.status === "AUTORIZADA";
	const isFailed = status === "ERRO" || status === "REJEITADO";
	const isClosed = status === "CANCELADO" || status === "INUTILIZADO";
	const isManualProvider = context.provider === "MANUAL";
	const explanation = LIFECYCLE_EXPLANATION[status];

	const cancelDeadline = resolveCancellationDeadline({ tipo: document.tipo, dataAutorizacao: document.dataAutorizacao, deadlines });
	const cancelWindowOpen = isManualProvider || !cancelDeadline || cancelDeadline.getTime() > now.getTime();

	const cancelar: TFiscalDocumentAction = (() => {
		if (isAuthorized && cancelWindowOpen) {
			return { acao: "CANCELAR", disponivel: true, motivoIndisponivel: null, prazoLimite: cancelDeadline, alternativas: [] };
		}
		if (isAuthorized && cancelDeadline) {
			const alternativas: TFiscalDocumentActionKey[] = document.tipo === "NFE" ? ["DEVOLUCAO", "CARTA_CORRECAO"] : ["DEVOLUCAO"];
			return {
				acao: "CANCELAR",
				disponivel: false,
				motivoIndisponivel: `Prazo de cancelamento (${describeCancellationWindow(document.tipo, deadlines)} após a autorização) encerrado às ${formatDeadline(cancelDeadline)}.`,
				prazoLimite: cancelDeadline,
				alternativas,
			};
		}
		if (status === "CANCELAMENTO_PENDENTE") {
			return {
				acao: "CANCELAR",
				disponivel: false,
				motivoIndisponivel: "Cancelamento já solicitado. Atualize o status para acompanhar.",
				prazoLimite: null,
				alternativas: ["SINCRONIZAR"],
			};
		}
		if (isFailed) {
			return {
				acao: "CANCELAR",
				disponivel: false,
				motivoIndisponivel: `${explanation} Não há o que cancelar.`,
				prazoLimite: null,
				alternativas: document.numero ? ["REENVIAR", "INUTILIZAR"] : ["REENVIAR"],
			};
		}
		if (isClosed) {
			return { acao: "CANCELAR", disponivel: false, motivoIndisponivel: explanation, prazoLimite: null, alternativas: [] };
		}
		return {
			acao: "CANCELAR",
			disponivel: false,
			motivoIndisponivel: `${explanation} Só documentos autorizados podem ser cancelados.`,
			prazoLimite: null,
			alternativas: status === "EM_PROCESSAMENTO" ? ["SINCRONIZAR"] : [],
		};
	})();

	const cartaCorrecao: TFiscalDocumentAction = (() => {
		if (document.tipo !== "NFE") {
			return {
				acao: "CARTA_CORRECAO",
				disponivel: false,
				motivoIndisponivel: "Carta de correção existe apenas para NF-e.",
				prazoLimite: null,
				alternativas: [],
			};
		}
		if (!isAuthorized) {
			return {
				acao: "CARTA_CORRECAO",
				disponivel: false,
				motivoIndisponivel: `${explanation} Só documentos autorizados aceitam carta de correção.`,
				prazoLimite: null,
				alternativas: [],
			};
		}
		const issued = context.correctionLettersIssued ?? 0;
		if (issued >= deadlines.correctionLetterMaxEvents) {
			return {
				acao: "CARTA_CORRECAO",
				disponivel: false,
				motivoIndisponivel: `Limite de ${deadlines.correctionLetterMaxEvents} cartas de correção atingido.`,
				prazoLimite: null,
				alternativas: ["DEVOLUCAO"],
			};
		}
		return { acao: "CARTA_CORRECAO", disponivel: true, motivoIndisponivel: null, prazoLimite: null, alternativas: [] };
	})();

	const inutilizar: TFiscalDocumentAction = (() => {
		if (isAuthorized || status === "CANCELAMENTO_PENDENTE") {
			return {
				acao: "INUTILIZAR",
				disponivel: false,
				motivoIndisponivel: "Não é possível inutilizar a numeração de um documento autorizado.",
				prazoLimite: null,
				alternativas: ["CANCELAR"],
			};
		}
		if (isClosed) {
			return { acao: "INUTILIZAR", disponivel: false, motivoIndisponivel: explanation, prazoLimite: null, alternativas: [] };
		}
		if (!document.numero || !document.serie) {
			return {
				acao: "INUTILIZAR",
				disponivel: false,
				motivoIndisponivel: "Nenhuma numeração foi reservada para este document.",
				prazoLimite: null,
				alternativas: [],
			};
		}
		if (!isFailed) {
			return {
				acao: "INUTILIZAR",
				disponivel: false,
				motivoIndisponivel: `${explanation} Aguarde o desfecho antes de inutilizar.`,
				prazoLimite: null,
				alternativas: ["SINCRONIZAR"],
			};
		}
		const deadline = resolveInutilizationDeadline({ dataInsercao: document.dataInsercao, deadlines });
		if (!isManualProvider && deadline.getTime() < now.getTime()) {
			return {
				acao: "INUTILIZAR",
				disponivel: false,
				motivoIndisponivel: `Prazo de inutilização (dia ${deadlines.inutilizationDayOfNextMonth} do mês seguinte) encerrado em ${formatDeadline(deadline)}. Fale com o contador.`,
				prazoLimite: deadline,
				alternativas: ["REENVIAR"],
			};
		}
		return { acao: "INUTILIZAR", disponivel: true, motivoIndisponivel: null, prazoLimite: deadline, alternativas: [] };
	})();

	const devolucao: TFiscalDocumentAction = (() => {
		if (!isAuthorized) {
			return {
				acao: "DEVOLUCAO",
				disponivel: false,
				motivoIndisponivel: `${explanation} A devolução só pode ser gerada a partir de um documento autorizado.`,
				prazoLimite: null,
				alternativas: [],
			};
		}
		if (!document.vendaId) {
			return { acao: "DEVOLUCAO", disponivel: false, motivoIndisponivel: "Documento sem venda vinculada.", prazoLimite: null, alternativas: [] };
		}
		if (!document.chaveAcesso) {
			return {
				acao: "DEVOLUCAO",
				disponivel: false,
				motivoIndisponivel: "Documento sem chave de acesso para referenciar.",
				prazoLimite: null,
				alternativas: ["SINCRONIZAR"],
			};
		}
		if (context.hasAuthorizedReturn) {
			return {
				acao: "DEVOLUCAO",
				disponivel: false,
				motivoIndisponivel: "Já existe uma devolução autorizada para este document.",
				prazoLimite: null,
				alternativas: [],
			};
		}
		if (context.hasReturnProfile === false) {
			return {
				acao: "DEVOLUCAO",
				disponivel: false,
				motivoIndisponivel: "Configure um perfil de operação fiscal de devolução (NF-e com finalidade DEVOLUÇÃO).",
				prazoLimite: null,
				alternativas: [],
			};
		}
		return { acao: "DEVOLUCAO", disponivel: true, motivoIndisponivel: null, prazoLimite: null, alternativas: [] };
	})();

	const reenviar: TFiscalDocumentAction = (() => {
		if (document.tipo === "NFSE") {
			return {
				acao: "REENVIAR",
				disponivel: false,
				motivoIndisponivel: "Reemissão de NFS-e ainda não está disponível.",
				prazoLimite: null,
				alternativas: [],
			};
		}
		if (!document.vendaId) {
			return {
				acao: "REENVIAR",
				disponivel: false,
				motivoIndisponivel: "Documento sem venda vinculada para reemissão.",
				prazoLimite: null,
				alternativas: [],
			};
		}
		if (isFailed || isClosed) {
			return { acao: "REENVIAR", disponivel: true, motivoIndisponivel: null, prazoLimite: null, alternativas: [] };
		}
		return {
			acao: "REENVIAR",
			disponivel: false,
			motivoIndisponivel: `${explanation} Só documentos com erro, rejeitados ou encerrados podem ser reemitidos.`,
			prazoLimite: null,
			alternativas: [],
		};
	})();

	const sincronizar: TFiscalDocumentAction =
		document.provedorDocumentoId || status === "EM_PROCESSAMENTO" || status === "CANCELAMENTO_PENDENTE"
			? { acao: "SINCRONIZAR", disponivel: true, motivoIndisponivel: null, prazoLimite: null, alternativas: [] }
			: {
					acao: "SINCRONIZAR",
					disponivel: false,
					motivoIndisponivel: "O documento ainda não foi enviado ao provedor.",
					prazoLimite: null,
					alternativas: [],
				};

	const hasAssets = isAuthorized || status === "CANCELADO";
	const baixarXml: TFiscalDocumentAction =
		document.xmlStoragePath || hasAssets
			? { acao: "BAIXAR_XML", disponivel: true, motivoIndisponivel: null, prazoLimite: null, alternativas: [] }
			: {
					acao: "BAIXAR_XML",
					disponivel: false,
					motivoIndisponivel: "XML disponível apenas para documentos autorizados ou cancelados.",
					prazoLimite: null,
					alternativas: [],
				};
	const baixarPdf: TFiscalDocumentAction =
		document.pdfStoragePath || hasAssets
			? { acao: "BAIXAR_PDF", disponivel: true, motivoIndisponivel: null, prazoLimite: null, alternativas: [] }
			: {
					acao: "BAIXAR_PDF",
					disponivel: false,
					motivoIndisponivel: "DANFE disponível apenas para documentos autorizados ou cancelados.",
					prazoLimite: null,
					alternativas: [],
				};

	return [cancelar, cartaCorrecao, inutilizar, devolucao, reenviar, sincronizar, baixarXml, baixarPdf];
}

export function getFiscalDocumentAction(actions: TFiscalDocumentAction[], key: TFiscalDocumentActionKey): TFiscalDocumentAction {
	const found = actions.find((action) => action.acao === key);
	if (!found) throw new Error(`Acao fiscal desconhecida: ${key}`);
	return found;
}

/**
 * Guarda de rota: lanca o mesmo motivo que a UI mostra. Assim API e tela nunca discordam.
 */
export function assertFiscalDocumentActionAvailable(actions: TFiscalDocumentAction[], key: TFiscalDocumentActionKey) {
	const action = getFiscalDocumentAction(actions, key);
	if (!action.disponivel) throw new FiscalReadinessError(action.motivoIndisponivel ?? "Ação indisponível para este document.");
	return action;
}
