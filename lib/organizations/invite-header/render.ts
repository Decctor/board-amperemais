import { renderBrandAssetPng } from "@/lib/brand/render";
import { uploadPublicAsset } from "@/lib/files-storage/public-assets";
import { buildOrganizationInviteHeaderElement, INVITE_HEADER_HEIGHT, INVITE_HEADER_WIDTH } from "./template";

const LOGO_FETCH_TIMEOUT_IN_MS = 3000;

/**
 * Baixa o logo da organização e devolve como data URL para o satori.
 * Falha aqui não é fatal: sem logo o cabeçalho cai para a inicial da organização.
 */
export async function fetchOrganizationLogoAsDataUrl(logoUrl: string | null | undefined): Promise<string | null> {
	if (!logoUrl?.trim()) return null;

	try {
		const response = await fetch(logoUrl, { signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_IN_MS) });
		if (!response.ok) {
			console.warn(`[WARN] [ORGANIZATION_INVITE_HEADER] Logo respondeu ${response.status}; seguindo sem logo.`);
			return null;
		}

		const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
		const buffer = Buffer.from(await response.arrayBuffer());
		return `data:${contentType};base64,${buffer.toString("base64")}`;
	} catch (error) {
		console.warn("[WARN] [ORGANIZATION_INVITE_HEADER] Falha ao baixar o logo da organização; seguindo sem logo.", error);
		return null;
	}
}

type RenderOrganizationInviteHeaderParams = {
	organizationName: string;
	organizationLogoUrl?: string | null;
};

export async function renderOrganizationInviteHeaderPng({
	organizationName,
	organizationLogoUrl,
}: RenderOrganizationInviteHeaderParams): Promise<Buffer> {
	const organizationLogoDataUrl = await fetchOrganizationLogoAsDataUrl(organizationLogoUrl);
	const element = await buildOrganizationInviteHeaderElement({ organizationName, organizationLogoDataUrl });

	return renderBrandAssetPng({
		element,
		width: INVITE_HEADER_WIDTH,
		height: INVITE_HEADER_HEIGHT,
	});
}

type RenderAndUploadOrganizationInviteHeaderParams = RenderOrganizationInviteHeaderParams & {
	organizacaoId: string;
	invitationId: string;
};

/**
 * Renderiza o cabeçalho e devolve a URL pública para o parâmetro de imagem do template.
 *
 * Devolve `null` se render ou upload falharem — o cabeçalho é obrigatório no
 * template aprovado, então sem imagem o envio por WhatsApp é pulado (o e-mail,
 * que é o canal principal, segue normalmente).
 */
export async function renderAndUploadOrganizationInviteHeader({
	organizacaoId,
	invitationId,
	organizationName,
	organizationLogoUrl,
}: RenderAndUploadOrganizationInviteHeaderParams): Promise<string | null> {
	try {
		const pngBuffer = await renderOrganizationInviteHeaderPng({ organizationName, organizationLogoUrl });
		const { publicUrl } = await uploadPublicAsset({
			storagePath: `/public/invites/headers/${organizacaoId}/${invitationId}.png`,
			body: pngBuffer,
			contentType: "image/png",
			errorLabel: "imagem do convite",
		});
		return publicUrl;
	} catch (error) {
		console.error("[ERROR] [ORGANIZATION_INVITE_HEADER] Falha ao gerar o cabeçalho do convite.", error);
		return null;
	}
}
