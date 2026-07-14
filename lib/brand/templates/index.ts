import { instagramCarteirasTemplate } from "./instagram-carteiras";
import { meetingBackgroundTemplate } from "./meeting-background";
import type { TBrandTemplate } from "./types";

/**
 * Registry de templates de brand assets. Para adicionar um novo template:
 * 1. Crie `lib/brand/templates/<nome>.tsx` exportando um `TBrandTemplate`.
 * 2. Registre-o aqui com um nome kebab-case.
 * 3. Exporte com `npm run brand:export -- --template <nome>`.
 */
export const BRAND_TEMPLATES: Record<string, TBrandTemplate> = {
	"meeting-background": meetingBackgroundTemplate,
	"instagram-carteiras": instagramCarteirasTemplate,
};
