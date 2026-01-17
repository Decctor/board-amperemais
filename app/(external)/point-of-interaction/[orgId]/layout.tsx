"use client";

import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const KIOSK_MODE_STORAGE_KEY = "pdi-kiosk-mode";

type KioskModeContextType = {
	isActive: boolean;
	toggleKioskMode: () => Promise<void>;
};

const KioskModeContext = createContext<KioskModeContextType | null>(null);

export function useKioskMode() {
	const context = useContext(KioskModeContext);
	if (!context) {
		throw new Error("useKioskMode must be used within KioskModeProvider");
	}
	return context;
}

function KioskModeProvider({ children }: { children: React.ReactNode }) {
	const [isActive, setIsActive] = useState(false);
	const wakeLockRef = useRef<WakeLockSentinel | null>(null);
	const hasInitialized = useRef(false);

	const requestWakeLock = useCallback(async () => {
		if (!("wakeLock" in navigator)) {
			console.warn("Wake Lock API não suportada neste navegador");
			return;
		}

		try {
			wakeLockRef.current = await navigator.wakeLock.request("screen");
			console.log("Wake Lock ativado - tela não irá desligar");
		} catch (error) {
			console.error("Erro ao ativar Wake Lock:", error);
		}
	}, []);

	const releaseWakeLock = useCallback(async () => {
		if (wakeLockRef.current) {
			await wakeLockRef.current.release();
			wakeLockRef.current = null;
			console.log("Wake Lock desativado");
		}
	}, []);

	const activateKioskMode = useCallback(async () => {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
			}
			await requestWakeLock();
			setIsActive(true);
			localStorage.setItem(KIOSK_MODE_STORAGE_KEY, "true");
		} catch (error) {
			console.error("Erro ao ativar modo kiosk:", error);
		}
	}, [requestWakeLock]);

	const deactivateKioskMode = useCallback(async () => {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			}
			await releaseWakeLock();
			setIsActive(false);
			localStorage.removeItem(KIOSK_MODE_STORAGE_KEY);
		} catch (error) {
			console.error("Erro ao desativar modo kiosk:", error);
		}
	}, [releaseWakeLock]);

	// Inicialização: verifica localStorage e restaura o modo kiosk se necessário
	useEffect(() => {
		if (hasInitialized.current) return;
		hasInitialized.current = true;

		const savedState = localStorage.getItem(KIOSK_MODE_STORAGE_KEY);
		if (savedState === "true") {
			// Pequeno delay para garantir que o DOM está pronto
			const timer = setTimeout(() => {
				activateKioskMode();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [activateKioskMode]);

	// Sincroniza o estado com mudanças externas de fullscreen (ex: usuário pressiona ESC)
	useEffect(() => {
		const handleFullscreenChange = () => {
			const isFullscreen = !!document.fullscreenElement;

			// Se saiu do fullscreen externamente (ESC), desativa o modo kiosk
			if (!isFullscreen && isActive) {
				releaseWakeLock();
				setIsActive(false);
				localStorage.removeItem(KIOSK_MODE_STORAGE_KEY);
			}
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, [isActive, releaseWakeLock]);

	// Re-adquire o Wake Lock quando a página volta a ficar visível (se estiver em modo kiosk)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && isActive) {
				requestWakeLock();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [isActive, requestWakeLock]);

	// Cleanup ao desmontar
	useEffect(() => {
		return () => {
			releaseWakeLock();
		};
	}, [releaseWakeLock]);

	const toggleKioskMode = useCallback(async () => {
		if (isActive) {
			await deactivateKioskMode();
		} else {
			await activateKioskMode();
		}
	}, [isActive, activateKioskMode, deactivateKioskMode]);

	return <KioskModeContext.Provider value={{ isActive, toggleKioskMode }}>{children}</KioskModeContext.Provider>;
}

function KioskModeToggleButton() {
	const { isActive, toggleKioskMode } = useKioskMode();

	return (
		<Button
			onClick={toggleKioskMode}
			variant="ghost"
			size="icon"
			className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm hover:bg-background"
			title={isActive ? "Sair do modo kiosk" : "Entrar no modo kiosk (tela cheia + tela sempre ligada)"}
		>
			{isActive ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
		</Button>
	);
}

export default function PointOfInteractionLayout({ children }: { children: React.ReactNode }) {
	return (
		<KioskModeProvider>
			<KioskModeToggleButton />
			{children}
		</KioskModeProvider>
	);
}
