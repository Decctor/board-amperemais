"use client";

import { captureClientEvent } from "@/lib/analytics/posthog-client";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type TrackedLinkProps = ComponentPropsWithoutRef<typeof Link> & {
	children: ReactNode;
	event: string;
	controlEvent?: string;
	properties?: Record<string, unknown>;
};

export function TrackedLink({ children, event, controlEvent, properties, onClick, ...props }: TrackedLinkProps) {
	return (
		<Link
			{...props}
			onClick={(clickEvent) => {
				captureClientEvent({ event, controlEvent, properties });
				onClick?.(clickEvent);
			}}
		>
			{children}
		</Link>
	);
}

type TrackedAnchorProps = ComponentPropsWithoutRef<"a"> & {
	event: string;
	controlEvent?: string;
	properties?: Record<string, unknown>;
};

export function TrackedAnchor({ event, controlEvent, properties, onClick, ...props }: TrackedAnchorProps) {
	return (
		<a
			{...props}
			onClick={(clickEvent) => {
				captureClientEvent({ event, controlEvent, properties });
				onClick?.(clickEvent);
			}}
		/>
	);
}
