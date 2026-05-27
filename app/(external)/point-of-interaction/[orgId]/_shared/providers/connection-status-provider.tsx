"use client";

import { WifiOff } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ConnectionStatus = "online" | "reconnecting" | "offline";

type ConnectionStatusContextType = {
	status: ConnectionStatus;
	countdown: number;
	retry: () => void;
};

const ConnectionStatusContext = createContext<ConnectionStatusContextType | null>(null);

export function useConnectionStatus() {
	const context = useContext(ConnectionStatusContext);
	if (!context) {
		throw new Error("useConnectionStatus must be used within ConnectionStatusProvider");
	}
	return context;
}

const GRACE_PERIOD_SECONDS = 10;
const BACKGROUND_CHECK_INTERVAL_MS = 5000;

export function ConnectionStatusProvider({ children }: { children: React.ReactNode }) {
	const [status, setStatus] = useState<ConnectionStatus>("online");
	const [countdown, setCountdown] = useState(GRACE_PERIOD_SECONDS);

	const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const backgroundCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const statusRef = useRef<ConnectionStatus>("online");

	useEffect(() => {
		statusRef.current = status;
	}, [status]);

	const clearAllIntervals = useCallback(() => {
		if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
		if (backgroundCheckIntervalRef.current) clearInterval(backgroundCheckIntervalRef.current);
		countdownIntervalRef.current = null;
		backgroundCheckIntervalRef.current = null;
	}, []);

	const goOnline = useCallback(() => {
		clearAllIntervals();
		setStatus("online");
		setCountdown(GRACE_PERIOD_SECONDS);
	}, [clearAllIntervals]);

	// Extracted logic to start the background check safely
	const startBackgroundCheck = useCallback(() => {
		if (backgroundCheckIntervalRef.current) return;

		backgroundCheckIntervalRef.current = setInterval(() => {
			// Optional: Add a fetch('ping') here for true internet check
			if (navigator.onLine) {
				goOnline();
			}
		}, BACKGROUND_CHECK_INTERVAL_MS);
	}, [goOnline]);

	const startReconnecting = useCallback(() => {
		if (statusRef.current !== "online") return;

		clearAllIntervals();
		setStatus("reconnecting");
		setCountdown(GRACE_PERIOD_SECONDS);

		countdownIntervalRef.current = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(countdownIntervalRef.current!);
					countdownIntervalRef.current = null;
					setStatus("offline");
					startBackgroundCheck(); // Call this outside the state setter logic
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	}, [clearAllIntervals, startBackgroundCheck]);

	const retry = useCallback(() => {
		if (navigator.onLine) goOnline();
	}, [goOnline]);

	useEffect(() => {
		const handleOnline = () => goOnline();
		const handleOffline = () => startReconnecting();

		if (!navigator.onLine) startReconnecting();

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			clearAllIntervals();
		};
	}, [goOnline, startReconnecting, clearAllIntervals]);

	// FIX: Memoize the context value
	const contextValue = useMemo(
		() => ({
			status,
			countdown,
			retry,
		}),
		[status, countdown, retry],
	);

	return (
		<ConnectionStatusContext.Provider value={contextValue}>
			{children}
			<ConnectionBanner status={status} countdown={countdown} />
			<OfflineOverlay status={status} retry={retry} />
		</ConnectionStatusContext.Provider>
	);
}

// ============================================
// ConnectionBanner - Shown during RECONNECTING
// ============================================

function ConnectionBanner({ status, countdown }: { status: ConnectionStatus; countdown: number }) {
	if (status !== "reconnecting") return null;

	return (
		<div
			className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-300"
			role="alert"
		>
			<WifiOff className="w-5 h-5 flex-shrink-0" />
			<p className="text-sm font-medium text-center">
				Conexão de Internet perdida. Tentando restabelecer por <span className="font-bold tabular-nums">{countdown}</span> segundos
			</p>
		</div>
	);
}

// ============================================
// OfflineOverlay - Shown during OFFLINE
// ============================================

function OfflineOverlay({ status, retry }: { status: ConnectionStatus; retry: () => void }) {
	if (status !== "offline") return null;

	return (
		<div
			className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="offline-title"
		>
			<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6">
				{/* Icon */}
				<div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
					<WifiOff className="w-10 h-10 text-orange-500" />
				</div>

				{/* Title */}
				<h2 id="offline-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
					Conexão de internet perdida.
				</h2>

				{/* Subtitle */}
				<p className="text-gray-600 dark:text-gray-400 text-sm">Verifique sua conexão e tente novamente.</p>

				{/* Retry Button */}
				<button
					type="button"
					onClick={retry}
					className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
				>
					TENTAR NOVAMENTE
				</button>
			</div>
		</div>
	);
}
