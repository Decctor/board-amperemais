import { easeBackInOut } from "d3-ease";

export const VisibleHiddenExitMotionVariants = {
	hidden: {
		opacity: 0.2,
		scale: 0.95, // Scale down slightly
		transition: {
			duration: 0.5,
			ease: easeBackInOut, // Use an easing function
		},
	},
	visible: {
		opacity: 1,
		scale: 1, // Scale down slightly
		transition: {
			duration: 0.5,
			ease: easeBackInOut, // Use an easing function
		},
	},
	exit: {
		opacity: 0.3,
		scale: 0.8, // Scale down slightly
		transition: {
			duration: 0.1,
			ease: easeBackInOut, // Use an easing function
		},
	},
};

export const SlideMotionVariants = {
	initial: {
		opacity: 0,
		y: 20,
		transition: {
			duration: 0.2,
		},
	},
	animate: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.2,
		},
	},
	exit: {
		opacity: 0,
		y: -20,
		transition: {
			duration: 0.2,
		},
	},
};
