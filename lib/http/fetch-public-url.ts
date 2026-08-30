import { lookup, type LookupAddress } from "node:dns";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import createHttpError from "http-errors";

/**
 * Download server-side de uma URL informada por um agente externo.
 *
 * O servidor faz a requisição em nome do cliente MCP, então toda URL aqui é um vetor de SSRF: sem
 * estas barreiras, "baixe minha imagem" vira leitura de metadata da cloud (169.254.169.254), de
 * serviços internos ou do próprio Supabase com as credenciais de rede do servidor. As defesas, em
 * camadas:
 *
 * 1. `assertPublicHttpUrl` — só https, sem credenciais embutidas, recusa IP literal privado e
 *    hostname sem ponto (nomes internos como `intranet`).
 * 2. `lookup` customizado na requisição — valida os IPs resolvidos no momento da conexão, o que
 *    fecha DNS rebinding e truques de host que o parser normaliza para um IP privado.
 * 3. Redirects são seguidos manualmente e cada destino passa pelas mesmas barreiras.
 *
 * Alguns blocos públicos vizinhos de faixas reservadas (203.0.0.0/16, 198.51.0.0/16) ficam
 * bloqueados junto — o custo de falso positivo é irrelevante para imagens públicas.
 */

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isPublicIpv4(address: string): boolean {
	const parts = address.split(".").map(Number);
	if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
	const [a, b] = parts;
	if (a === 0 || a === 10 || a === 127) return false;
	if (a === 100 && b >= 64 && b <= 127) return false;
	if (a === 169 && b === 254) return false;
	if (a === 172 && b >= 16 && b <= 31) return false;
	if (a === 192 && (b === 0 || b === 168)) return false;
	if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
	if (a === 203 && b === 0) return false;
	if (a >= 224) return false;
	return true;
}

function isPublicIpv6(address: string): boolean {
	const lower = address.toLowerCase();
	const mappedIpv4 = lower.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
	if (mappedIpv4) return isPublicIpv4(mappedIpv4[1]);
	if (lower === "::" || lower === "::1") return false;
	if (/^fe[89ab]/.test(lower)) return false;
	if (lower.startsWith("fc") || lower.startsWith("fd")) return false;
	if (lower.startsWith("ff")) return false;
	if (lower.startsWith("2001:db8")) return false;
	if (lower.startsWith("64:ff9b")) return false;
	return true;
}

export function isPublicIpAddress(address: string): boolean {
	const family = isIP(address);
	if (family === 4) return isPublicIpv4(address);
	if (family === 6) return isPublicIpv6(address);
	return false;
}

export function assertPublicHttpUrl(rawUrl: string): URL {
	let url: URL;
	try {
		url = new URL(rawUrl.trim());
	} catch {
		throw new createHttpError.BadRequest("URL inválida.");
	}
	if (url.protocol !== "https:") throw new createHttpError.BadRequest("Apenas URLs https são aceitas.");
	if (url.username || url.password) throw new createHttpError.BadRequest("URLs com credenciais embutidas não são aceitas.");
	const hostname = url.hostname.replace(/^\[|\]$/g, "");
	if (isIP(hostname)) {
		if (!isPublicIpAddress(hostname)) throw new createHttpError.BadRequest("A URL aponta para um endereço de rede privado ou reservado.");
		return url;
	}
	const lowered = hostname.toLowerCase();
	if (
		!lowered.includes(".") ||
		lowered === "localhost" ||
		lowered.endsWith(".localhost") ||
		lowered.endsWith(".local") ||
		lowered.endsWith(".internal")
	) {
		throw new createHttpError.BadRequest("A URL aponta para um host interno.");
	}
	return url;
}

/**
 * `lookup` injetado na requisição: a validação acontece sobre os IPs que a conexão vai usar de
 * fato, não sobre uma resolução anterior — sem janela para rebinding entre checar e conectar.
 */
function guardedLookup(
	hostname: string,
	options: unknown,
	callback: (error: NodeJS.ErrnoException | null, address: unknown, family?: number) => void,
) {
	const lookupOptions = (typeof options === "function" ? {} : (options ?? {})) as { all?: boolean };
	const done = typeof options === "function" ? (options as typeof callback) : callback;
	lookup(hostname, { ...lookupOptions, all: true }, (error, addresses) => {
		if (error) return done(error, undefined);
		const list = addresses as LookupAddress[];
		if (list.length === 0 || list.some((entry) => !isPublicIpAddress(entry.address))) {
			return done(new createHttpError.BadRequest("A URL aponta para um endereço de rede privado ou reservado."), undefined);
		}
		if (lookupOptions.all) return done(null, list);
		done(null, list[0].address, list[0].family);
	});
}

type TSingleRequestResult = { kind: "redirect"; location: string } | { kind: "body"; buffer: Buffer; contentType: string | null };

function requestOnce(url: URL, { maxBytes, timeoutMs }: { maxBytes: number; timeoutMs: number }): Promise<TSingleRequestResult> {
	return new Promise((resolve, reject) => {
		const tooLargeError = new createHttpError.BadRequest(`O arquivo da URL excede o limite de ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
		const req = httpsRequest(
			url,
			{
				lookup: guardedLookup as never,
				headers: { accept: "image/*,*/*;q=0.8", "user-agent": "RecompraCRM-MediaFetcher/1.0" },
			},
			(res) => {
				const status = res.statusCode ?? 0;
				if (REDIRECT_STATUSES.has(status)) {
					const location = res.headers.location;
					res.resume();
					if (!location) return reject(new createHttpError.BadRequest("A URL redirecionou sem informar o destino."));
					return resolve({ kind: "redirect", location });
				}
				if (status < 200 || status >= 300) {
					res.resume();
					return reject(new createHttpError.BadRequest(`Não foi possível baixar a URL informada (HTTP ${status}).`));
				}
				const declaredLength = Number(res.headers["content-length"]);
				if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
					req.destroy(tooLargeError);
					return;
				}
				const chunks: Buffer[] = [];
				let total = 0;
				res.on("data", (chunk: Buffer) => {
					total += chunk.length;
					if (total > maxBytes) {
						req.destroy(tooLargeError);
						return;
					}
					chunks.push(chunk);
				});
				res.on("end", () => resolve({ kind: "body", buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] ?? null }));
				res.on("error", (error) => reject(error));
			},
		);
		const timer = setTimeout(() => req.destroy(new createHttpError.BadRequest("Tempo esgotado ao baixar a URL informada.")), timeoutMs);
		req.on("close", () => clearTimeout(timer));
		req.on("error", (error) => {
			if (createHttpError.isHttpError(error)) return reject(error);
			const code = (error as NodeJS.ErrnoException).code;
			if (code === "ENOTFOUND") return reject(new createHttpError.BadRequest("O domínio da URL informada não foi encontrado."));
			reject(new createHttpError.BadRequest("Não foi possível baixar a URL informada."));
		});
		req.end();
	});
}

export async function fetchPublicUrl(
	rawUrl: string,
	{ maxBytes, timeoutMs = 15_000, maxRedirects = 3 }: { maxBytes: number; timeoutMs?: number; maxRedirects?: number },
): Promise<{ buffer: Buffer; contentType: string | null; finalUrl: string }> {
	let url = assertPublicHttpUrl(rawUrl);
	for (let redirects = 0; ; redirects++) {
		const result = await requestOnce(url, { maxBytes, timeoutMs });
		if (result.kind === "body") return { buffer: result.buffer, contentType: result.contentType, finalUrl: url.toString() };
		if (redirects >= maxRedirects) throw new createHttpError.BadRequest("A URL informada redireciona vezes demais.");
		url = assertPublicHttpUrl(new URL(result.location, url).toString());
	}
}
