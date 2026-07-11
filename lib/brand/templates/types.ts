import type { ReactElement } from "react";

/**
 * Contrato de um template de brand asset. Cada template declara suas
 * dimensões e variantes, e sabe renderizar o elemento satori de cada
 * variante (carregando os logos/assets que precisar).
 */
export type TBrandTemplate = {
	description: string;
	width: number;
	height: number;
	variants: readonly string[];
	render: (variant: string) => Promise<ReactElement>;
};
