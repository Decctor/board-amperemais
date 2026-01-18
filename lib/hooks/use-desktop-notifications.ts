"use client";

import { useCallback, useEffect, useState } from "react";

type NotificationOptions = {
	title: string;
	body?: string;
	icon?: string;
	tag?: string;
	onClick?: () => void;
};

export function useDesktopNotifications() {
	const [permission, setPermission] = useState<NotificationPermission>("default");
	const [isSupported, setIsSupported] = useState(false);

	useEffect(() => {
		// Check if notifications are supported
		if (typeof window !== "undefined" && "Notification" in window) {
			setIsSupported(true);
			setPermission(Notification.permission);
		}
	}, []);

	const requestPermission = useCallback(async () => {
		if (!isSupported) return "denied";

		try {
			const result = await Notification.requestPermission();
			setPermission(result);
			return result;
		} catch (error) {
			console.error("Error requesting notification permission:", error);
			return "denied";
		}
	}, [isSupported]);

	const showNotification = useCallback(
		({ title, body, icon, tag, onClick }: NotificationOptions) => {
			if (!isSupported || permission !== "granted") return null;

			// Don't show notification if tab is focused
			if (document.hasFocus()) return null;

			try {
				const notification = new Notification(title, {
					body,
					icon: icon || "/favicon.ico",
					tag,
					badge: "/favicon.ico",
				});

				if (onClick) {
					notification.onclick = () => {
						window.focus();
						onClick();
						notification.close();
					};
				}

				// Auto-close after 5 seconds
				setTimeout(() => notification.close(), 5000);

				return notification;
			} catch (error) {
				console.error("Error showing notification:", error);
				return null;
			}
		},
		[isSupported, permission],
	);

	return {
		isSupported,
		permission,
		requestPermission,
		showNotification,
	};
}
