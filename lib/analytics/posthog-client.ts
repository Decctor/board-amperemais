"use client";

import posthog from "posthog-js";

declare global {
	interface Window {
		ctrl?: {
			track?: (event: string, properties?: Record<string, unknown>) => void;
			identify?: (userId: string, traits?: Record<string, unknown>) => void;
			q?: unknown[][];
		};
	}
}

type TCaptureClientEventInput = {
	event: string;
	properties?: Record<string, unknown>;
	controlEvent?: string;
};

export function captureClientEvent({ event, properties, controlEvent }: TCaptureClientEventInput) {
	if (typeof window === "undefined") return;
	posthog.capture(event, properties);
	const eventForControl = controlEvent ?? event;
	if (window.ctrl?.track) {
		window.ctrl.track(eventForControl, properties);
		return;
	}
	window.ctrl = window.ctrl || { q: [] };
	window.ctrl.q = window.ctrl.q || [];
	window.ctrl.q.push(["track", eventForControl, properties ?? {}]);
}
