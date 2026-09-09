"use client";

import { BrandLogo } from "@/components/Brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { formatCashbackValue, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Gift, ImageIcon, LayoutGrid, List, Printer, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./cashback-rewards-display.module.css";

export type TCashbackRewardsPaperSize = "A4" | "A5" | "A6";
export type TCashbackRewardsPaperOrientation = "portrait" | "landscape";
type TRewardsLayout = "showcase" | "compact" | "dense";

type TPrize = {
	id: string;
	titulo: string;
	descricao: string | null;
	valor: number;
	imagemCapaUrl: string | null;
};

type CashbackRewardsDisplayPageProps = {
	organization: { nome: string; logoUrl: string | null };
	program: {
		titulo: string;
		descricao: string | null;
		terminologia: "DINHEIRO" | "PONTOS";
		acumuloTipo: "FIXO" | "PERCENTUAL";
		acumuloValor: number;
		acumuloRegraValorMinimo: number;
		expiracaoRegraValidadeValor: number;
	};
	prizes: TPrize[];
	initialSize: TCashbackRewardsPaperSize;
	initialOrientation: TCashbackRewardsPaperOrientation;
};

type TLayoutConfig = {
	showcaseLimit: number;
	compactLimit: number;
	denseCapacity: number;
	columns: Record<TRewardsLayout, number>;
};

const PAPER_DIMENSIONS: Record<TCashbackRewardsPaperSize, { width: number; height: number }> = {
	A4: { width: 210, height: 297 },
	A5: { width: 148, height: 210 },
	A6: { width: 105, height: 148 },
};

const LAYOUT_CONFIG: Record<`${TCashbackRewardsPaperSize}-${TCashbackRewardsPaperOrientation}`, TLayoutConfig> = {
	"A4-portrait": { showcaseLimit: 9, compactLimit: 20, denseCapacity: 30, columns: { showcase: 3, compact: 4, dense: 3 } },
	"A4-landscape": { showcaseLimit: 8, compactLimit: 20, denseCapacity: 32, columns: { showcase: 4, compact: 5, dense: 4 } },
	"A5-portrait": { showcaseLimit: 6, compactLimit: 12, denseCapacity: 18, columns: { showcase: 2, compact: 3, dense: 2 } },
	"A5-landscape": { showcaseLimit: 6, compactLimit: 12, denseCapacity: 18, columns: { showcase: 3, compact: 4, dense: 3 } },
	"A6-portrait": { showcaseLimit: 4, compactLimit: 6, denseCapacity: 10, columns: { showcase: 2, compact: 2, dense: 1 } },
	"A6-landscape": { showcaseLimit: 4, compactLimit: 8, denseCapacity: 12, columns: { showcase: 2, compact: 4, dense: 2 } },
};

const PAPER_SIZES = ["A4", "A5", "A6"] as const;

function chunkPrizes(prizes: TPrize[], size: number) {
	const chunks: TPrize[][] = [];
	for (let index = 0; index < prizes.length; index += size) chunks.push(prizes.slice(index, index + size));
	return chunks;
}

function getLayout(prizeCount: number, config: TLayoutConfig): TRewardsLayout {
	if (prizeCount <= config.showcaseLimit) return "showcase";
	if (prizeCount <= config.compactLimit) return "compact";
	return "dense";
}

function getAccumulationCopy(program: CashbackRewardsDisplayPageProps["program"]) {
	if (program.acumuloTipo === "PERCENTUAL") {
		return `${formatDecimalPlaces(program.acumuloValor)}% do valor de cada compra vira ${program.terminologia === "PONTOS" ? "pontos" : "saldo"}`;
	}
	return `${formatCashbackValue(program.acumuloValor, program.terminologia)} a cada compra válida`;
}

function getRequirementCopy(prize: TPrize, program: CashbackRewardsDisplayPageProps["program"]) {
	if (program.acumuloTipo === "PERCENTUAL") {
		if (program.acumuloValor <= 0) return "Acúmulo indisponível";
		return `Gasto estimado: ${formatToMoney(prize.valor / (program.acumuloValor / 100))}`;
	}
	if (program.acumuloValor <= 0) return "Acúmulo indisponível";
	const purchases = Math.ceil(prize.valor / program.acumuloValor);
	return program.acumuloRegraValorMinimo > 0
		? `${formatDecimalPlaces(purchases)} compras de ${formatToMoney(program.acumuloRegraValorMinimo)}+`
		: `${formatDecimalPlaces(purchases)} compras válidas`;
}

function updatePreviewUrl(size: TCashbackRewardsPaperSize, orientation: TCashbackRewardsPaperOrientation) {
	const url = new URL(window.location.href);
	url.searchParams.set("size", size);
	url.searchParams.set("orientation", orientation);
	window.history.replaceState(null, "", url);
}

export default function CashbackRewardsDisplayPage({ organization, program, prizes, initialSize, initialOrientation }: CashbackRewardsDisplayPageProps) {
	const [paperSize, setPaperSize] = useState(initialSize);
	const [orientation, setOrientation] = useState(initialOrientation);
	const dimensions = PAPER_DIMENSIONS[paperSize];
	const paperWidth = orientation === "portrait" ? dimensions.width : dimensions.height;
	const paperHeight = orientation === "portrait" ? dimensions.height : dimensions.width;
	const config = LAYOUT_CONFIG[`${paperSize}-${orientation}`];
	const layout = getLayout(prizes.length, config);
	const pageCapacity = layout === "showcase" ? config.showcaseLimit : layout === "compact" ? config.compactLimit : config.denseCapacity;
	const pages = useMemo(() => chunkPrizes(prizes, pageCapacity), [pageCapacity, prizes]);
	const columns = config.columns[layout];
	const layoutLabel = layout === "showcase" ? "Vitrine" : layout === "compact" ? "Grade compacta" : "Lista densa";

	function selectPaperSize(size: TCashbackRewardsPaperSize) {
		setPaperSize(size);
		updatePreviewUrl(size, orientation);
	}

	function selectOrientation(nextOrientation: TCashbackRewardsPaperOrientation) {
		setOrientation(nextOrientation);
		updatePreviewUrl(paperSize, nextOrientation);
	}

	return (
		<main className={styles.workspace}>
			<style>{`@page { size: ${paperWidth}mm ${paperHeight}mm; margin: 0; }`}</style>

			<section className={styles.toolbar} aria-label="Configurações de impressão">
				<div className={styles.toolbarHeading}>
					<span className="text-label text-primary">RESUMO PARA IMPRESSÃO</span>
					<strong>{pages.length === 1 ? "Tudo cabe em uma folha" : `${pages.length} folhas necessárias`}</strong>
					<small>{layoutLabel}, {columns} colunas, {prizes.length} recompensas</small>
				</div>
				<div className={styles.controls}>
					<div className={styles.segmented} aria-label="Tamanho do papel">
						{PAPER_SIZES.map((size) => (
							<button key={size} type="button" data-active={paperSize === size} onClick={() => selectPaperSize(size)}>
								{size}
							</button>
						))}
					</div>
					<div className={styles.segmented} aria-label="Orientação do papel">
						<button type="button" aria-label="Retrato" title="Retrato" data-active={orientation === "portrait"} onClick={() => selectOrientation("portrait")}>
							<RectangleVertical aria-hidden="true" />
						</button>
						<button type="button" aria-label="Paisagem" title="Paisagem" data-active={orientation === "landscape"} onClick={() => selectOrientation("landscape")}>
							<RectangleHorizontal aria-hidden="true" />
						</button>
					</div>
					<Button type="button" onClick={() => window.print()} className="gap-2 rounded-2xl">
						<Printer className="size-4" /> IMPRIMIR
					</Button>
				</div>
			</section>

			<div className={styles.pageStack}>
				{pages.map((pagePrizes, pageIndex) => {
					const rows = Math.ceil(pagePrizes.length / columns);
					return (
						<article
							key={`${paperSize}-${orientation}-${pageIndex}`}
							className={styles.paper}
							data-size={paperSize}
							data-orientation={orientation}
							data-layout={layout}
							style={{
								width: `${paperWidth}mm`,
								height: `${paperHeight}mm`,
								"--reward-columns": columns,
								"--reward-rows": rows,
							} as React.CSSProperties}
						>
							<header className={styles.header}>
								<div className={styles.identity}>
									{organization.logoUrl ? <img src={organization.logoUrl} alt={`Logo ${organization.nome}`} /> : <Gift aria-hidden="true" />}
									<div>
										<span>{organization.nome}</span>
										<h1>Escolha sua próxima recompensa</h1>
										<p>{program.titulo}</p>
									</div>
								</div>
								<div className={styles.count}>
									<strong>{prizes.length}</strong>
									<span>opções</span>
								</div>
							</header>

							<div className={styles.ruleBar}>
								<div><span>COMO ACUMULAR</span><strong>{getAccumulationCopy(program)}</strong></div>
								{program.expiracaoRegraValidadeValor > 0 ? <p>Saldo válido por {formatDecimalPlaces(program.expiracaoRegraValidadeValor)} dias.</p> : null}
							</div>

							<section className={styles.rewards} aria-label="Recompensas" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
								{pagePrizes.map((prize) => (
									<article key={prize.id} className={styles.reward}>
										<div className={styles.rewardImage}>
											{prize.imagemCapaUrl ? <img src={prize.imagemCapaUrl} alt="" /> : <ImageIcon aria-hidden="true" />}
										</div>
										<div className={styles.rewardCopy}>
											<h2>{prize.titulo}</h2>
											{prize.descricao ? <p>{prize.descricao}</p> : null}
											<div className={styles.rewardValue}>{formatCashbackValue(prize.valor, program.terminologia)}</div>
											<small>{getRequirementCopy(prize, program)}</small>
										</div>
									</article>
								))}
							</section>

							<footer className={styles.footer}>
								<p>Consulte disponibilidade e condições no atendimento. Valores sujeitos às regras do programa.</p>
								<div>
									{pages.length > 1 ? <span>{pageIndex + 1}/{pages.length}</span> : null}
									<small>Powered by</small>
									<BrandLogo lockup="horizontal" tone="blue" alt="RecompraCRM" />
								</div>
							</footer>
						</article>
					);
				})}
			</div>
		</main>
	);
}
