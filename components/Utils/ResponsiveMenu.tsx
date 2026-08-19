import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import type { PropsWithChildren } from "react";

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

type ResponsiveMenuBaseProps = PropsWithChildren & {
	dialogContentClassName?: string;
	drawerContentClassName?: string;
	headerClassName?: string;
	contentClassName?: string;
	titleClassName?: string;
	descriptionClassName?: string;
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

function ResponsiveMenu(props: ResponsiveMenuProps) {
	const {
		children,
		menuTitle,
		menuDescription,
		closeMenu,
		stateIsLoading,
		stateError,
		dialogContentClassName,
		drawerContentClassName,
		headerClassName,
		contentClassName,
		titleClassName,
		descriptionClassName,
		dialogVariant = "sm",
		drawerVariant = "sm",
		lockClose = false,
	} = props;
	const isDesktop = useMediaQuery("(min-width: 768px)");
	return isDesktop ? (
		<Dialog
			onOpenChange={(v) => {
				if (v || lockClose) return;
				closeMenu();
			}}
			open
		>
			<DialogContent
				data-dialog-container
				className={cn(responsiveMenuVariants({ dialogVariant }), dialogContentClassName)}
				onEscapeKeyDown={(event) => {
					if (!lockClose) return;
					event.preventDefault();
				}}
				onPointerDownOutside={(event) => {
					if (!lockClose) return;
					event.preventDefault();
				}}
			>
				<DialogHeader className={headerClassName}>
					<DialogTitle className={titleClassName}>{menuTitle}</DialogTitle>
					<DialogDescription className={descriptionClassName}>{menuDescription}</DialogDescription>
				</DialogHeader>
				{stateIsLoading ? (
					<LoadingComponent />
				) : stateError ? (
					<ErrorComponent msg={stateError} />
				) : (
					<div
						className={cn(
							"scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex flex-1 flex-col gap-3 overflow-auto px-4 py-2 lg:px-0",
							contentClassName,
						)}
					>
						{children}
					</div>
				)}

				{props.mode !== "read-only" ? (
					<DialogFooter className="flex-wrap gap-y-2">
						<DialogClose asChild>
							<Button variant="outline" disabled={lockClose}>
								{props.menuCancelButtonText}
							</Button>
						</DialogClose>
						{props.menuSecondaryActionButtonText && props.secondaryActionFunction ? (
							<LoadingButton
								loading={props.actionIsLoading || stateIsLoading}
								disabled={props.menuSecondaryActionButtonDisabled}
								onClick={props.secondaryActionFunction}
								variant={props.menuSecondaryActionButtonVariant}
								className={props.menuSecondaryActionButtonClassName}
							>
								{props.menuSecondaryActionButtonText}
							</LoadingButton>
						) : null}
						<LoadingButton
							loading={props.actionIsLoading || stateIsLoading}
							disabled={props.menuActionButtonDisabled}
							onClick={props.actionFunction}
							variant={props.menuActionButtonVariant}
							className={props.menuActionButtonClassName}
						>
							{props.menuActionButtonText}
						</LoadingButton>
					</DialogFooter>
				) : (
					<DialogFooter className="flex-wrap gap-y-2">
						<DialogClose asChild>
							<Button variant="outline" disabled={lockClose}>
								{props.menuCancelButtonText ?? "FECHAR"}
							</Button>
						</DialogClose>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	) : (
		<Drawer
			onOpenChange={(v) => {
				if (v || lockClose) return;
				closeMenu();
			}}
			open
		>
			<DrawerContent className={cn(drawerVariants({ drawerVariant }), drawerContentClassName)}>
				<DrawerHeader className={cn("text-left", headerClassName)}>
					<DrawerTitle className={titleClassName}>{menuTitle}</DrawerTitle>
					<DrawerDescription className={descriptionClassName}>{menuDescription}</DrawerDescription>
				</DrawerHeader>

				{stateIsLoading ? (
					<LoadingComponent />
				) : stateError ? (
					<ErrorComponent msg={stateError} />
				) : (
					<div
						className={cn(
							"scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex flex-1 flex-col gap-3 overflow-auto px-4 py-2 lg:px-0",
							contentClassName,
						)}
					>
						{children}
					</div>
				)}

				{props.mode !== "read-only" ? (
					<DrawerFooter>
						<DrawerClose asChild>
							<Button variant="outline" disabled={lockClose}>
								{props.menuCancelButtonText}
							</Button>
						</DrawerClose>
						{props.menuSecondaryActionButtonText && props.secondaryActionFunction ? (
							<LoadingButton
								loading={props.actionIsLoading || stateIsLoading}
								disabled={props.menuSecondaryActionButtonDisabled}
								onClick={props.secondaryActionFunction}
								variant={props.menuSecondaryActionButtonVariant}
								className={props.menuSecondaryActionButtonClassName}
							>
								{props.menuSecondaryActionButtonText}
							</LoadingButton>
						) : null}
						<LoadingButton
							loading={props.actionIsLoading || stateIsLoading}
							disabled={props.menuActionButtonDisabled}
							onClick={props.actionFunction}
							variant={props.menuActionButtonVariant}
							className={props.menuActionButtonClassName}
						>
							{props.menuActionButtonText}
						</LoadingButton>
					</DrawerFooter>
				) : (
					<DrawerFooter>
						<DrawerClose asChild>
							<Button variant="outline" className="h-11" disabled={lockClose}>
								{props.menuCancelButtonText ?? "FECHAR"}
							</Button>
						</DrawerClose>
					</DrawerFooter>
				)}
			</DrawerContent>
		</Drawer>
	);
}

export default ResponsiveMenu;
