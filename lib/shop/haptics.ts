// A small, deliberate vocabulary of haptic patterns. Keep it to these three so
// the feedback stays legible: the finger learns to tell a commit from a reward
// from an error. Reach for a new pattern only when a moment genuinely differs.
export const HAPTICS = {
	// Light single tap: a committed step forward — add to cart, advance a checkout
	// step, apply a coupon, a CEP that resolved.
	tap: 12,
	// Two rising pulses: a milestone worth celebrating — order placed.
	success: [16, 44, 28],
	// Two heavier pulses: something needs attention — submit failed, CEP not found.
	warning: [30, 40, 30],
} as const;

// Web Vibration API. Supported on Android (Chrome/Firefox); a silent no-op on
// iOS Safari, which never implemented it, and in any non-browser context.
export function triggerHaptic(pattern: number | readonly number[] = HAPTICS.tap) {
	if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
	try {
		navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
	} catch {
		// Some engines throw if called outside a user gesture; the feedback is
		// non-essential, so swallow it.
	}
}
