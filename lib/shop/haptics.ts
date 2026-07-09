// Web Vibration API. Supported on Android (Chrome/Firefox); a silent no-op on
// iOS Safari, which never implemented it, and in any non-browser context.
export function triggerHaptic(pattern: number | number[] = 12) {
	if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
	try {
		navigator.vibrate(pattern);
	} catch {
		// Some engines throw if called outside a user gesture; the feedback is
		// non-essential, so swallow it.
	}
}
