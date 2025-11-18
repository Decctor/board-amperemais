import { useEffect, useRef } from "react";

export function useKey(key: string, cb: () => void) {
	const callbackRef = useRef(cb);
	useEffect(() => {
		callbackRef.current = cb;
	}, [cb]);
	useEffect(() => {
		function handle(event: any) {
			if (event.code === key) {
				// @ts-expect-error
				callbackRef.current(event);
			}
		}
		document.addEventListener("keydown", handle);
		return () => document.removeEventListener("keypress", handle);
	}, [key]);
}
