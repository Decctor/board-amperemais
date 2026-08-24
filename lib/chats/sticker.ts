/**
 * Figurinhas do WhatsApp.
 *
 * Uma figurinha é um `image/webp` (animado ou não) que chega como mídia comum, por media id,
 * mas sem legenda — ver a referência do webhook de `sticker` da Cloud API. Ela é baixada e
 * armazenada como qualquer outra mídia; o que muda é a leitura: figurinha não passa pelo
 * modelo de visão, porque é conteúdo expressivo e não informativo, e o texto processado é fixo.
 */

export const STICKER_MIME_TYPE = "image/webp";

/** Ocupa o lugar da leitura por IA nas figurinhas — é o que agentes e prévias leem. */
export const STICKER_PROCESSED_TEXT = "Figurinha recebida.";

/** Rótulo curto para listas e prévias. */
export const STICKER_LABEL = "Figurinha";
