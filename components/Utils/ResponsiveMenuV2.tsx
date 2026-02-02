import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import type { PropsWithChildren, ReactNode } from "react";

import { useMediaQuery } from "@/lib/hooks/use-media-query";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import { LoadingButton } from "../loading-button";
import { Button } from "../ui/button";

// --- Variantes de Animação ---
const contentAnimation = {
	initial: { opacity: 0, y: 10 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -10 },
	transition: { duration: 0.2, ease: "easeInOut" },
};

// --- Variantes de Estilo (CVA) ---
const responsiveMenuV2Variants = cva("flex flex-col", {
	variants: {
		dialogVariant: {
			fit: "h-fit w-fit max-w-fit min-h-fit",
			sm: "max-h-[90%]",
			md: "h-[70%] min-h-[70%] max-h-[70%] lg:max-h-[70%] w-[60%] min-w-[60%] max-w-[60%] lg:max-w-[60%]",
			lg: "h-[90%] min-h-[90%] max-h-[90%] lg:max-h-[90%] w-[80%] min-w-[80%] max-w-[80%] lg:max-w-[80%]",
			xl: "h-[95%] min-h-[95%] max-h-[95%] lg:max-h-[95%] w-[95%] min-w-[95%] max-w-[95%] lg:max-w-[95%]",
		},
	},
	defaultVariants: {
		dialogVariant: "sm",
	},
});

const drawerVariants = cva("flex flex-col", {
	variants: {
		drawerVariant: {
			fit: "flex flex-col min-h-fit h-fit max-h-[90vh]",
			sm: "flex flex-col min-h-fit h-fit max-h-[70vh]",
			md: "flex flex-col min-h-fit h-fit max-h-[80vh]",
			lg: "flex flex-col min-h-fit h-fit max-h-[90vh]",
			xl: "flex flex-col min-h-fit h-fit max-h-[95vh]",
		},
	},
	defaultVariants: {
		drawerVariant: "sm",
	},
});

// --- Tipagem ---
type ResponsiveMenuV2Props = PropsWithChildren & {
	dialogContentClassName?: string;
	drawerContentClassName?: string;
	menuTitle: string;
	menuDescription: string;
	menuActionButtonText: string;
	menuActionButtonClassName?: string;
	menuSecondaryActionButtonText?: string;
	menuSecondaryActionButtonClassName?: string;
	menuCancelButtonText: string;
	actionFunction: () => void;
	secondaryActionFunction?: () => void;
	actionIsLoading: boolean;
	stateIsLoading: boolean;
	stateError?: string | null;
	closeMenu: () => void;
	dialogVariant?: "fit" | "sm" | "md" | "lg" | "xl";
	drawerVariant?: "fit" | "sm" | "md" | "lg" | "xl";
	dialogShowFooter?: boolean;
	drawerShowFooter?: boolean;
	// Novas props para flexibilidade
	successContent?: ReactNode;
	customLoadingComponent?: ReactNode;
	customErrorComponent?: (error: string) => ReactNode;
};

// --- Componente de Troca de Estado (Interno) ---
const MenuContentSwitcher = ({
	stateIsLoading,
	stateError,
	successContent,
	customLoadingComponent,
	customErrorComponent,
	children,
}: Partial<ResponsiveMenuV2Props>) => {
	return (
		<AnimatePresence mode="wait">
			{stateIsLoading ? (
				<motion.div key="loading" {...contentAnimation} className="flex flex-1 items-center justify-center p-6">
					{customLoadingComponent || <LoadingComponent />}
				</motion.div>
			) : stateError ? (
				<motion.div key="error" {...contentAnimation} className="p-6">
					{customErrorComponent ? customErrorComponent(stateError) : <ErrorComponent msg={stateError} />}
				</motion.div>
			) : successContent ? (
				<motion.div key="success" {...contentAnimation} className="flex flex-1 flex-col items-center justify-center p-6">
					{successContent}
				</motion.div>
			) : (
				<motion.div
					key="main-content"
					{...contentAnimation}
					className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex flex-1 flex-col gap-3 overflow-auto px-4 py-2 lg:px-0"
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
};

// --- Componente Principal ---
function ResponsiveMenuV2(props: ResponsiveMenuV2Props) {
	const {
		children,
		menuTitle,
		menuDescription,
		menuActionButtonText,
		menuActionButtonClassName,
		menuSecondaryActionButtonText,
		menuSecondaryActionButtonClassName,
		menuCancelButtonText,
		closeMenu,
		actionFunction,
		secondaryActionFunction,
		stateIsLoading,
		stateError,
		actionIsLoading,
		dialogContentClassName,
		drawerContentClassName,
		dialogVariant = "sm",
		drawerVariant = "sm",
		dialogShowFooter = true,
		drawerShowFooter = true,
		successContent,
	} = props;

	const isDesktop = useMediaQuery("(min-width: 768px)");

	const footerButtons = (
		<>
			<Button variant="outline" onClick={closeMenu}>
				{menuCancelButtonText}
			</Button>
			{menuSecondaryActionButtonText && secondaryActionFunction && (
				<LoadingButton
					loading={actionIsLoading || stateIsLoading}
					onClick={() => secondaryActionFunction()}
					className={menuSecondaryActionButtonClassName}
				>
					{menuSecondaryActionButtonText}
				</LoadingButton>
			)}
			<LoadingButton loading={actionIsLoading || stateIsLoading} onClick={() => actionFunction()} className={menuActionButtonClassName}>
				{menuActionButtonText}
			</LoadingButton>
		</>
	);

	if (isDesktop) {
		return (
			<Dialog onOpenChange={(v) => (v ? null : closeMenu())} open>
				<DialogContent className={cn(responsiveMenuV2Variants({ dialogVariant }), dialogContentClassName)}>
					<DialogHeader>
						<DialogTitle>{menuTitle}</DialogTitle>
						<DialogDescription>{menuDescription}</DialogDescription>
					</DialogHeader>

					<MenuContentSwitcher {...props} />

					{/* Oculta o footer padrão em caso de sucesso para focar no conteúdo de sucesso */}
					{!successContent && dialogShowFooter && <DialogFooter className="flex-wrap gap-y-2">{footerButtons}</DialogFooter>}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer onOpenChange={(v) => (v ? null : closeMenu())} open>
			<DrawerContent className={cn(drawerVariants({ drawerVariant }), drawerContentClassName)}>
				<DrawerHeader className="text-left">
					<DrawerTitle>{menuTitle}</DrawerTitle>
					<DrawerDescription>{menuDescription}</DrawerDescription>
				</DrawerHeader>

				<MenuContentSwitcher {...props} />

				{!successContent && drawerShowFooter && <DrawerFooter>{footerButtons}</DrawerFooter>}
			</DrawerContent>
		</Drawer>
	);
}

export default ResponsiveMenuV2;
