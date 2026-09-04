import { useEffect, useState } from "react";

/**
 * Debounce para campos de texto controlados. Mantém a digitação imediata e só
 * publica o valor estável depois do período sem alterações.
 */
export function useDebouncedText(value: string, delayMs = 450) {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
		return () => window.clearTimeout(timeoutId);
	}, [delayMs, value]);

	return debouncedValue;
}
