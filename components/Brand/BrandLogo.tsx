import Image, { type ImageProps, type StaticImageData } from "next/image";
import HorizontalBadgeColorOnDark from "@/utils/svgs/logos/horizontal-badge-color-on-dark.svg";
import HorizontalBadgeColorOnLight from "@/utils/svgs/logos/horizontal-badge-color-on-light.svg";
import HorizontalBlack from "@/utils/svgs/logos/horizontal-black.svg";
import HorizontalBlue from "@/utils/svgs/logos/horizontal-blue.svg";
import HorizontalColorOnDark from "@/utils/svgs/logos/horizontal-color-on-dark.svg";
import HorizontalWhite from "@/utils/svgs/logos/horizontal-white.svg";
import IconBadgeColor from "@/utils/svgs/logos/icon-badge-color.svg";
import IconBlack from "@/utils/svgs/logos/icon-black.svg";
import IconBlue from "@/utils/svgs/logos/icon-blue.svg";
import IconColorOnDark from "@/utils/svgs/logos/icon-color-on-dark.svg";
import IconWhite from "@/utils/svgs/logos/icon-white.svg";
import StackedBlack from "@/utils/svgs/logos/stacked-black.svg";
import StackedBlue from "@/utils/svgs/logos/stacked-blue.svg";
import StackedColorOnDark from "@/utils/svgs/logos/stacked-color-on-dark.svg";
import StackedWhite from "@/utils/svgs/logos/stacked-white.svg";
import WordmarkBlack from "@/utils/svgs/logos/wordmark-black.svg";
import WordmarkBlue from "@/utils/svgs/logos/wordmark-blue.svg";
import WordmarkWhite from "@/utils/svgs/logos/wordmark-white.svg";

/**
 * Fonte única dos logos da RecompraCRM. Dois eixos:
 *
 * - `lockup` — o que aparece. `icon` (símbolo nu), `icon-badge` (símbolo na
 *   cápsula azul), `wordmark` (só o texto), `horizontal` (símbolo + texto lado
 *   a lado), `horizontal-badge` (cápsula + texto) e `stacked` (símbolo sobre
 *   o texto).
 * - `tone` — para qual fundo a variante foi aprovada.
 *
 * O sufixo `on-dark`/`on-light` aparece exatamente quando o asset tem um
 * elemento cujo contraste depende do fundo. Duas das cinco barras do símbolo
 * são brancas, então todo `color-on-dark` **some parcialmente em fundo claro**:
 * ali use um lockup `*-badge` (a cápsula azul devolve o contraste) ou um tom
 * monocromático. Os `*-badge` trazem o próprio fundo, por isso `icon-badge` é
 * `color` puro — serve em qualquer superfície.
 */
export const BRAND_LOGO_SOURCES = {
	icon: { "color-on-dark": IconColorOnDark, black: IconBlack, white: IconWhite, blue: IconBlue },
	"icon-badge": { color: IconBadgeColor },
	wordmark: { black: WordmarkBlack, white: WordmarkWhite, blue: WordmarkBlue },
	horizontal: { "color-on-dark": HorizontalColorOnDark, black: HorizontalBlack, white: HorizontalWhite, blue: HorizontalBlue },
	"horizontal-badge": { "color-on-light": HorizontalBadgeColorOnLight, "color-on-dark": HorizontalBadgeColorOnDark },
	stacked: { "color-on-dark": StackedColorOnDark, black: StackedBlack, white: StackedWhite, blue: StackedBlue },
} as const;

export type TBrandLogoLockup = keyof typeof BRAND_LOGO_SOURCES;
export type TBrandLogoTone<L extends TBrandLogoLockup> = keyof (typeof BRAND_LOGO_SOURCES)[L];

type BrandLogoProps<L extends TBrandLogoLockup> = {
	lockup: L;
	tone: TBrandLogoTone<L>;
} & Omit<ImageProps, "src" | "alt"> & { alt?: string };

export function BrandLogo<L extends TBrandLogoLockup>({ lockup, tone, alt = "RecompraCRM", ...imageProps }: BrandLogoProps<L>) {
	return <Image src={brandLogoSource(lockup, tone)} alt={alt} {...imageProps} />;
}

/**
 * Fonte estática de um logo, para os casos em que `<BrandLogo>` não serve:
 * `src` dinâmico (ex.: `org.logoUrl ?? brandLogoSource(...)`), `<img>` cru em
 * templates satori (que precisa de `.src`) ou repasse para outro componente.
 */
export function brandLogoSource<L extends TBrandLogoLockup>(lockup: L, tone: TBrandLogoTone<L>) {
	// Import estático do Next resolve para `StaticImageData` em runtime — o cast
	// preserva o `.src` que os `<img>` crus dos templates satori precisam.
	return BRAND_LOGO_SOURCES[lockup][tone] as StaticImageData;
}
