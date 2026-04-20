"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { PiorDiaCtaStrip } from "./pior-dia-cta-strip";
import { PiorDiaHeadlineBlock } from "./pior-dia-headline-block";
import { PiorDiaKickerBadge } from "./pior-dia-kicker-badge";
import { PiorDiaWorkflow } from "./pior-dia-workflow";
import { PiorDiaWorkflowFitColumn } from "./pior-dia-workflow-fit-column";
import type { PiorDiaLayoutTokens } from "../scale";

type PiorDiaQuadradoMainRowProps = {
	tokens: PiorDiaLayoutTokens;
	colGap: number;
	columnGap: number;
	copyCtaGap: number;
	headlineSize: number;
	bodySize: number;
	ctaLineSize: number;
};

/**
 * Duas colunas do post quadrado: copy+CTA (esq.) e workflow (dir.).
 * O CTA fica no menor `top` possível que satisfaça duas regras:
 *  1. não encostar no bloco de copy;
 *  2. alinhar a base com o fim visual do workflow (step 3 já escalado).
 */
export function PiorDiaQuadradoMainRow({
	tokens,
	colGap,
	columnGap,
	copyCtaGap,
	headlineSize,
	bodySize,
	ctaLineSize,
}: PiorDiaQuadradoMainRowProps) {
	const rowRef = useRef<HTMLDivElement>(null);
	const workflowColRef = useRef<HTMLDivElement>(null);
	const copyLeadRef = useRef<HTMLDivElement>(null);
	const ctaRef = useRef<HTMLDivElement>(null);
	const [ctaTop, setCtaTop] = useState<number | null>(null);

	const syncCtaPosition = useCallback(() => {
		const row = rowRef.current;
		const workflowCol = workflowColRef.current;
		const copyLead = copyLeadRef.current;
		const cta = ctaRef.current;
		if (!row || !workflowCol || !copyLead || !cta) return;

		const clip = workflowCol.querySelector<HTMLElement>('[data-design-role="pior-dia-workflow-clip"]');
		if (!clip) return;

		const rowRect = row.getBoundingClientRect();
		const clipRect = clip.getBoundingClientRect();
		const copyLeadRect = copyLead.getBoundingClientRect();
		const ctaRect = cta.getBoundingClientRect();

		const naturalTop = copyLeadRect.bottom - rowRect.top + copyCtaGap;
		const workflowBottom = clipRect.bottom - rowRect.top;
		const alignedTop = workflowBottom - ctaRect.height;

		setCtaTop(Math.max(naturalTop, alignedTop));
	}, [copyCtaGap]);

	useLayoutEffect(() => {
		syncCtaPosition();
		const ro = new ResizeObserver(() => syncCtaPosition());
		const row = rowRef.current;
		const workflowCol = workflowColRef.current;
		const copyLead = copyLeadRef.current;
		const cta = ctaRef.current;
		const clip = workflowCol?.querySelector<HTMLElement>('[data-design-role="pior-dia-workflow-clip"]');
		if (row) ro.observe(row);
		if (workflowCol) ro.observe(workflowCol);
		if (clip) ro.observe(clip);
		if (copyLead) ro.observe(copyLead);
		if (cta) ro.observe(cta);
		return () => ro.disconnect();
	}, [syncCtaPosition]);

	return (
		<div
			ref={rowRef}
			style={{
				display: "flex",
				flexDirection: "row",
				gap: colGap,
				width: "100%",
				minHeight: 0,
				alignItems: "stretch",
			}}
		>
			<div
				style={{
					flex: "0 0 48%",
					minWidth: 0,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					alignSelf: "stretch",
					position: "relative",
				}}
			>
				<div
					ref={copyLeadRef}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: columnGap,
						width: "100%",
						boxSizing: "border-box",
					}}
				>
					<PiorDiaKickerBadge tokens={tokens} />
					<PiorDiaHeadlineBlock tokens={tokens} headlineSize={headlineSize} bodySize={bodySize} showBody />
				</div>

				<div
					ref={ctaRef}
					style={{
						position: "absolute",
						top: ctaTop ?? 0,
						left: 0,
						right: 0,
						width: "100%",
					}}
				>
					<PiorDiaCtaStrip tokens={tokens} ctaLineSize={ctaLineSize} flexDirection="column" buttonFontMultiplier={14} />
				</div>
			</div>

			<div
				ref={workflowColRef}
				style={{
					flex: 1,
					minWidth: 0,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<PiorDiaWorkflowFitColumn>
					<PiorDiaWorkflow tokens={tokens} />
				</PiorDiaWorkflowFitColumn>
			</div>
		</div>
	);
}
