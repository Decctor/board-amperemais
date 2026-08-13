"use client";

import { useEffect, useState } from "react";

const DEVICE_KEY_STORAGE = "ampmais:public-ordering-device-key:v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Credencial anonima e versionada do navegador para o fluxo de QR. O servidor
 * recebe o UUID, mas persiste somente seu SHA-256.
 */
export function usePublicOrderingDeviceKey() {
	const [deviceKey, setDeviceKey] = useState<string | null>(null);

	useEffect(() => {
		const stored = window.localStorage.getItem(DEVICE_KEY_STORAGE);
		if (stored && UUID_PATTERN.test(stored)) {
			setDeviceKey(stored);
			return;
		}

		const generated = crypto.randomUUID();
		window.localStorage.setItem(DEVICE_KEY_STORAGE, generated);
		setDeviceKey(generated);
	}, []);

	return deviceKey;
}
