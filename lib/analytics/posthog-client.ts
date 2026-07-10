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

	// Control forwarding is opt-in: only events that explicitly declare a
	// `controlEvent` reach the Control SDK. This keeps operational/analytics
	// noise (pageviews, view_* events, scroll depth, etc.) out of Control while
	// PostHog still receives everything.
	if (!controlEvent) return;

	if (window.ctrl?.track) {
		window.ctrl.track(controlEvent, properties);
		return;
	}
	window.ctrl = window.ctrl || { q: [] };
	window.ctrl.q = window.ctrl.q || [];
	window.ctrl.q.push(["track", controlEvent, properties ?? {}]);
}
