"use client";

import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath } from "@xyflow/react";

export function FlowConditionEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
	markerEnd,
}: EdgeProps & { data?: { condicaoLabel?: string | null } }) {
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	});

	const label = data?.condicaoLabel;

	return (
		<>
			<BaseEdge id={id} path={edgePath} markerEnd={markerEnd} className="!stroke-muted-foreground/30" />
			{label && (
				<EdgeLabelRenderer>
					<div
						className="absolute pointer-events-none"
						style={{
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
						}}
					>
						<span
							className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-md ${
								label === "SIM"
									? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
									: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
							}`}
						>
							{label}
						</span>
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
}
