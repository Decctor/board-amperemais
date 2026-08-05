"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_IDLE_SECONDS = 60;
const DEFAULT_WARNING_SECONDS = 15;
// Eventos que contam como "ainda tem alguém aqui". `pointerdown` cobre toque e mouse; `keydown`
// cobre o teclado físico do quiosque; `wheel`/`touchmove` cobrem quem está só lendo e rolando.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchmove"] as const;

type UseIdleResetOptions = {
	/** Desligado no celular do cliente e enquanto o cadastro está sendo enviado. */
	enabled: boolean;
	idleSeconds?: number;
	/** A partir de quantos segundos restantes o aviso aparece. */
	warningSeconds?: number;
	onIdle: () => void;
};

/**
 * Volta o assistente à tela do telefone quando ninguém interage por um tempo.
 *
 * Um tablet no balcão fica com o cadastro de outra pessoa aberto até alguém reparar — e o próximo
 * cliente encontraria o nome de um estranho meio digitado na tela. Sessenta segundos é conservador
 * de propósito: longo o bastante para quem está pensando na resposta, curto o bastante para que a
 * fila não veja os dados de quem passou antes.
 *
 * O aviso aparece só nos últimos segundos, com o número correndo — quem ainda está ali toca em
 * qualquer lugar e o relógio zera.
 */
export function useIdleReset({ enabled, idleSeconds = DEFAULT_IDLE_SECONDS, warningSeconds = DEFAULT_WARNING_SECONDS, onIdle }: UseIdleResetOptions) {
	const [secondsRemaining, setSecondsRemaining] = useState(idleSeconds);
	const lastActivityRef = useRef(Date.now());
	// O callback entra por ref para que trocá-lo não reinicie o relógio no meio da contagem.
	const onIdleRef = useRef(onIdle);
	onIdleRef.current = onIdle;

	const registerActivity = useCallback(() => {
		lastActivityRef.current = Date.now();
		setSecondsRemaining(idleSeconds);
	}, [idleSeconds]);

	useEffect(() => {
		if (!enabled) {
			setSecondsRemaining(idleSeconds);
			return;
		}

		lastActivityRef.current = Date.now();
		setSecondsRemaining(idleSeconds);

		const handleActivity = () => {
			lastActivityRef.current = Date.now();
		};
		for (const eventName of ACTIVITY_EVENTS) {
			window.addEventListener(eventName, handleActivity, { passive: true });
		}

		const interval = window.setInterval(() => {
			const elapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
			const remaining = Math.max(0, idleSeconds - elapsedSeconds);
			setSecondsRemaining(remaining);
			if (remaining === 0) onIdleRef.current();
		}, 1000);

		return () => {
			window.clearInterval(interval);
			for (const eventName of ACTIVITY_EVENTS) {
				window.removeEventListener(eventName, handleActivity);
			}
		};
	}, [enabled, idleSeconds]);

	return {
		secondsRemaining,
		isWarning: enabled && secondsRemaining <= warningSeconds,
		registerActivity,
	};
}
