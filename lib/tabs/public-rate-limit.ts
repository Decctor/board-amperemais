import createHttpError from "http-errors";

// Rate limit simples em memoria (janela deslizante) para as rotas publicas de QR.
// Por instancia de servidor — suficiente como primeira barreira de abuso na v1;
// um limitador distribuido (Redis/upstash) entra se/quando houver multi-instancia.
const requestLog = new Map<string, number[]>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

export function enforcePublicRateLimit({ key }: { key: string }) {
	const now = Date.now();
	const windowStart = now - WINDOW_MS;
	const timestamps = (requestLog.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

	if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
		throw new createHttpError.TooManyRequests("Muitas solicitacoes. Aguarde um instante e tente novamente.");
	}

	timestamps.push(now);
	requestLog.set(key, timestamps);

	// Poda oportunista para o mapa nao crescer indefinidamente.
	if (requestLog.size > 10_000) {
		for (const [entryKey, entryTimestamps] of requestLog) {
			if (entryTimestamps.every((timestamp) => timestamp <= windowStart)) requestLog.delete(entryKey);
		}
	}
}
