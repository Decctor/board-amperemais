// A logo da organização vive no Supabase Storage, mas o HTML do cupom é renderizado no servidor e
// impresso pela máquina do agent — que não necessariamente alcança o bucket (rede da loja, proxy,
// URL assinada expirada). Por isso embutimos a imagem como data URL no próprio HTML.
//
// Nada aqui pode lançar: logo é enfeite, e falhar a impressão do cupom por causa de um bucket fora
// do ar seria trocar um problema estético por um operacional.

const LOGO_FETCH_TIMEOUT_MS = 3000;
// Teto sobre os BYTES da imagem. O data URL vai inteiro para print_jobs.conteudo (text) e cresce
// ~33% em base64 — acima disso a linha do job fica pesada sem ganho nenhum numa térmica de 72mm.
const LOGO_MAX_BYTES = 400 * 1024;
const LOGO_CACHE_TTL_MS = 10 * 60 * 1000;

const logoCache = new Map<string, { dataUrl: string | null; expiraEm: number }>();

export async function fetchOrganizationLogoDataUrl(logoUrl: string | null | undefined): Promise<string | null> {
	if (!logoUrl) return null;

	const cached = logoCache.get(logoUrl);
	// Cacheia inclusive o `null`: uma logo quebrada não deve custar um fetch a cada cupom impresso.
	if (cached && cached.expiraEm > Date.now()) return cached.dataUrl;

	const dataUrl = await resolveLogoDataUrl(logoUrl);
	logoCache.set(logoUrl, { dataUrl, expiraEm: Date.now() + LOGO_CACHE_TTL_MS });
	return dataUrl;
}

async function resolveLogoDataUrl(logoUrl: string): Promise<string | null> {
	try {
		const response = await fetch(logoUrl, { signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS) });
		if (!response.ok) {
			console.error(`[PRINT_LOGO] Falha ao buscar a logo (${response.status}) em ${logoUrl}.`);
			return null;
		}

		const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
		if (!contentType.startsWith("image/")) {
			console.error(`[PRINT_LOGO] Conteúdo não é imagem (${contentType || "sem content-type"}) em ${logoUrl}.`);
			return null;
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.byteLength === 0) return null;
		if (buffer.byteLength > LOGO_MAX_BYTES) {
			console.error(`[PRINT_LOGO] Logo acima do limite (${buffer.byteLength} bytes) em ${logoUrl} — cupom impresso sem logo.`);
			return null;
		}

		return `data:${contentType};base64,${buffer.toString("base64")}`;
	} catch (error) {
		console.error(`[PRINT_LOGO] Erro ao embutir a logo de ${logoUrl}.`, error);
		return null;
	}
}
