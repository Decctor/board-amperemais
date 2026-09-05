"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ComponentProps } from "react";
import ResponsiveMenu from "./ResponsiveMenu";

const AnimatedBody = motion.create(ResponsiveMenu.Body);

/** Optional transitions for flows that replace their body (loading, error, success). */
export function ResponsiveMenuAnimatedBody({ stateKey, ...props }: ComponentProps<typeof AnimatedBody> & { stateKey: string }) {
	const reducedMotion = useReducedMotion();
	return (
		<AnimatePresence mode="wait">
			<AnimatedBody
				{...props}
				key={stateKey}
				initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: reducedMotion ? 0 : -10 }}
				transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeInOut" }}
			/>
		</AnimatePresence>
	);
}
