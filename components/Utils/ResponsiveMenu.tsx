"use client";

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { createContext, use, useState, type ComponentProps, type PropsWithChildren } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import { LoadingButton } from "../loading-button";
import { Button, type ButtonProps } from "../ui/button";

const responsiveMenuVariants = cva("flex flex-col", {
	variants: {
		dialogVariant: {
			fit: "h-fit w-fit max-w-fit min-h-fit max-h-[90%]",
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
			full: "h-[92dvh] min-h-[92dvh] max-h-[92dvh] data-[vaul-drawer-direction=bottom]:max-h-[92dvh]",
			fit: "flex flex-col h-fit max-h-[90dvh]",
			sm: "flex flex-col h-fit min-h-[50dvh] max-h-[90dvh]",
			md: "flex flex-col h-fit min-h-[50dvh] max-h-[80dvh]",
			lg: "flex flex-col h-fit min-h-[70dvh] max-h-[90dvh]",
			xl: "flex flex-col h-fit min-h-[80dvh] max-h-[95dvh]",
		},
	},
	defaultVariants: {
		drawerVariant: "sm",
	},
});

export type ResponsiveMenuChangeDetails = {
	reason: string;
	cancel: () => void;
};

type ResponsiveMenuContextValue = {
	isDesktop: boolean;
	lockClose: boolean;
};
const ResponsiveMenuContext = createContext<ResponsiveMenuContextValue | null>(null);
function useResponsiveMenu() {
	const context = use(ResponsiveMenuContext);
	if (!context) throw new Error("ResponsiveMenu parts must be inside ResponsiveMenu.Root.");
	return context;
}

type ResponsiveMenuRootProps = PropsWithChildren<{
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean, details: ResponsiveMenuChangeDetails) => void;
	lockClose?: boolean;
}>;
function ResponsiveMenuRoot({ children, open: controlledOpen, defaultOpen = false, onOpenChange, lockClose = false }: ResponsiveMenuRootProps) {
	const parent = use(ResponsiveMenuContext);
	const matchesDesktop = useMediaQuery("(min-width: 768px)");
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = controlledOpen ?? uncontrolledOpen;
	// Keep the primitive stable during an open session so resizing cannot remount form state.
	const [isDesktop, setIsDesktop] = useState(matchesDesktop);
	if (!open && isDesktop !== matchesDesktop) setIsDesktop(matchesDesktop);
	const changeOpen = (nextOpen: boolean, primitiveDetails?: ResponsiveMenuChangeDetails) => {
		if (!nextOpen && lockClose) {
			primitiveDetails?.cancel();
			return;
		}
		let canceled = false;
		onOpenChange?.(nextOpen, {
			reason: primitiveDetails?.reason ?? "drawer-change",
			cancel: () => {
				canceled = true;
				primitiveDetails?.cancel();
			},
		});
		if (!canceled && controlledOpen === undefined) setUncontrolledOpen(nextOpen);
	};
	const DrawerRoot = parent && !parent.isDesktop ? DrawerPrimitive.NestedRoot : Drawer;
	return (
		<ResponsiveMenuContext value={{ isDesktop, lockClose }}>
			{isDesktop ? (
				<Dialog open={open} onOpenChange={changeOpen}>
					{children}
				</Dialog>
			) : (
				<DrawerRoot open={open} onOpenChange={changeOpen} dismissible={!lockClose}>
					{children}
				</DrawerRoot>
			)}
		</ResponsiveMenuContext>
	);
}

type ResponsiveMenuContentProps = ComponentProps<"div"> & {
	dialogVariant?: "fit" | "sm" | "md" | "lg" | "xl";
	drawerVariant?: "fit" | "sm" | "md" | "lg" | "xl" | "full";
	dialogClassName?: string;
	drawerClassName?: string;
	showCloseButton?: boolean;
};
function ResponsiveMenuContent({
	dialogVariant = "sm",
	drawerVariant = "sm",
	className,
	dialogClassName,
	drawerClassName,
	showCloseButton = true,
	...props
}: ResponsiveMenuContentProps) {
	const { isDesktop, lockClose } = useResponsiveMenu();
	return isDesktop ? (
		<DialogContent
			{...props}
			data-dialog-container
			showCloseButton={showCloseButton && !lockClose}
			className={cn(responsiveMenuVariants({ dialogVariant }), className, dialogClassName)}
		/>
	) : (
		<DrawerContent {...props} data-dialog-container className={cn(drawerVariants({ drawerVariant }), className, drawerClassName)} />
	);
}
function ResponsiveMenuHeader({ className, ...props }: ComponentProps<"div">) {
	const { isDesktop } = useResponsiveMenu();
	return isDesktop ? <DialogHeader {...props} className={className} /> : <DrawerHeader {...props} className={cn("text-left", className)} />;
}
function ResponsiveMenuTitle(props: ComponentProps<"h2">) {
	const { isDesktop } = useResponsiveMenu();
	return isDesktop ? <DialogTitle {...props} /> : <DrawerTitle {...props} />;
}
function ResponsiveMenuDescription(props: ComponentProps<"p">) {
	const { isDesktop } = useResponsiveMenu();
	return isDesktop ? <DialogDescription {...props} /> : <DrawerDescription {...props} />;
}
function ResponsiveMenuBody({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			{...props}
			className={cn(
				"scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto px-4 py-2 lg:px-0",
				className,
			)}
		/>
	);
}
function ResponsiveMenuFooter({ className, visibleOn = "all", ...props }: ComponentProps<"div"> & { visibleOn?: "all" | "desktop" | "mobile" }) {
	const { isDesktop } = useResponsiveMenu();
	if ((visibleOn === "desktop" && !isDesktop) || (visibleOn === "mobile" && isDesktop)) return null;
	return isDesktop ? <DialogFooter {...props} className={cn("flex-wrap gap-y-2", className)} /> : <DrawerFooter {...props} className={className} />;
}
// Both adapters render the same native Button API; primitive-specific composition stays private.
function ResponsiveMenuTrigger(props: Omit<ButtonProps, "asChild"> & { ref?: ComponentProps<typeof Button>["ref"] }) {
	const { isDesktop } = useResponsiveMenu();
	return isDesktop ? (
		<DialogTrigger render={<Button {...props} />} />
	) : (
		<DrawerTrigger asChild>
			<Button {...props} />
		</DrawerTrigger>
	);
}
function ResponsiveMenuClose({ disabled, ...props }: Omit<ButtonProps, "asChild"> & { ref?: ComponentProps<typeof Button>["ref"] }) {
	const { isDesktop, lockClose } = useResponsiveMenu();
	return isDesktop ? (
		<DialogClose disabled={disabled || lockClose} render={<Button {...props} />} />
	) : (
		<DrawerClose asChild>
			<Button {...props} disabled={disabled || lockClose} />
		</DrawerClose>
	);
}

type ResponsiveMenuBaseProps = PropsWithChildren & {
	dialogContentClassName?: string;
	drawerContentClassName?: string;
	headerClassName?: string;
	contentClassName?: string;
	titleClassName?: string;
	descriptionClassName?: string;
	footerClassName?: string;
	menuTitle: string;
	menuDescription: string;
	stateIsLoading: boolean;
	stateError?: string | null;
	closeMenu: () => void;
	dialogVariant?: "fit" | "sm" | "md" | "lg" | "xl";
	drawerVariant?: "fit" | "sm" | "md" | "lg" | "xl";
	lockClose?: boolean;
};

type ResponsiveMenuActionProps = {
	mode?: "actionable";
	menuActionButtonText: string;
	menuActionButtonVariant?: ButtonProps["variant"];
	menuActionButtonClassName?: string;
	menuActionButtonDisabled?: boolean;
	menuSecondaryActionButtonText?: string;
	menuSecondaryActionButtonVariant?: ButtonProps["variant"];
	menuSecondaryActionButtonClassName?: string;
	menuSecondaryActionButtonDisabled?: boolean;
	menuCancelButtonText: string;
	actionFunction: () => void;
	secondaryActionFunction?: () => void;
	actionIsLoading: boolean;
};

type ResponsiveMenuReadOnlyProps = {
	mode: "read-only";
	menuActionButtonText?: never;
	menuActionButtonVariant?: never;
	menuActionButtonClassName?: never;
	menuActionButtonDisabled?: never;
	menuSecondaryActionButtonText?: never;
	menuSecondaryActionButtonVariant?: never;
	menuSecondaryActionButtonClassName?: never;
	menuSecondaryActionButtonDisabled?: never;
	menuCancelButtonText?: string;
	actionFunction?: never;
	secondaryActionFunction?: never;
	actionIsLoading?: never;
};

type ResponsiveMenuProps = ResponsiveMenuBaseProps & (ResponsiveMenuActionProps | ResponsiveMenuReadOnlyProps);

/** Compatibility adapter for existing forms. New consumers compose Root/Content/Body/Footer. */
function ResponsiveMenuLegacy(props: ResponsiveMenuProps) {
	return (
		<ResponsiveMenuRoot
			open
			lockClose={props.lockClose}
			onOpenChange={(open) => {
				if (!open) props.closeMenu();
			}}
		>
			<ResponsiveMenuContent
				dialogVariant={props.dialogVariant}
				drawerVariant={props.drawerVariant}
				dialogClassName={props.dialogContentClassName}
				drawerClassName={props.drawerContentClassName}
			>
				<ResponsiveMenuHeader className={props.headerClassName}>
					<ResponsiveMenuTitle className={props.titleClassName}>{props.menuTitle}</ResponsiveMenuTitle>
					<ResponsiveMenuDescription className={props.descriptionClassName}>{props.menuDescription}</ResponsiveMenuDescription>
				</ResponsiveMenuHeader>
				{props.stateIsLoading ? (
					<LoadingComponent />
				) : props.stateError ? (
					<ErrorComponent msg={props.stateError} />
				) : (
					<ResponsiveMenuBody className={props.contentClassName}>{props.children}</ResponsiveMenuBody>
				)}
				<ResponsiveMenuFooter className={props.footerClassName}>
					<ResponsiveMenuClose variant="outline" className={props.mode === "read-only" ? "max-md:h-11" : undefined}>
						{props.menuCancelButtonText ?? "FECHAR"}
					</ResponsiveMenuClose>
					{props.mode !== "read-only" ? (
						<>
							{props.menuSecondaryActionButtonText && props.secondaryActionFunction ? (
								<LoadingButton
									loading={props.actionIsLoading || props.stateIsLoading}
									disabled={props.menuSecondaryActionButtonDisabled}
									onClick={props.secondaryActionFunction}
									variant={props.menuSecondaryActionButtonVariant}
									className={props.menuSecondaryActionButtonClassName}
								>
									{props.menuSecondaryActionButtonText}
								</LoadingButton>
							) : null}
							<LoadingButton
								loading={props.actionIsLoading || props.stateIsLoading}
								disabled={props.menuActionButtonDisabled}
								onClick={props.actionFunction}
								variant={props.menuActionButtonVariant}
								className={props.menuActionButtonClassName}
							>
								{props.menuActionButtonText}
							</LoadingButton>
						</>
					) : null}
				</ResponsiveMenuFooter>
			</ResponsiveMenuContent>
		</ResponsiveMenuRoot>
	);
}

const ResponsiveMenu = Object.assign(ResponsiveMenuLegacy, {
	Root: ResponsiveMenuRoot,
	Trigger: ResponsiveMenuTrigger,
	Content: ResponsiveMenuContent,
	Header: ResponsiveMenuHeader,
	Title: ResponsiveMenuTitle,
	Description: ResponsiveMenuDescription,
	Body: ResponsiveMenuBody,
	Footer: ResponsiveMenuFooter,
	Close: ResponsiveMenuClose,
});
export { ResponsiveMenu };
export default ResponsiveMenu;
