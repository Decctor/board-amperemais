import { cn } from "@/lib/utils";
import { type SVGProps, forwardRef } from "react";

const AnimatedSpinner = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
	<svg ref={ref} {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={cn(className)}>
		<title>Loading</title>
		<g className="animated-spinner">
			<rect x="11" y="1" width="2" height="5" opacity=".14" />
			<rect x="11" y="1" width="2" height="5" transform="rotate(30 12 12)" opacity=".29" />
			<rect x="11" y="1" width="2" height="5" transform="rotate(60 12 12)" opacity=".43" />
			<rect x="11" y="1" width="2" height="5" transform="rotate(90 12 12)" opacity=".57" />
			<rect x="11" y="1" width="2" height="5" transform="rotate(120 12 12)" opacity=".71" />
			<rect x="11" y="1" width="2" height="5" transform="rotate(150 12 12)" opacity=".86" />
			<rect x="11" y="1" width="2" height="5" transform="rotate(180 12 12)" />
		</g>
	</svg>
));
AnimatedSpinner.displayName = "AnimatedSpinner";

const CreditCard = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		ref={ref}
		{...props}
		viewBox="0 0 24 24"
		className={cn(className)}
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<title>Credit Card</title>
		<rect x="2" y="5" width="20" height="14" rx="2" />
		<line x1="2" y1="10" x2="22" y2="10" />
	</svg>
));
CreditCard.displayName = "CreditCard";

export { AnimatedSpinner, CreditCard };

export {
	EyeOpenIcon,
	EyeNoneIcon as EyeCloseIcon,
	SunIcon,
	MoonIcon,
	ExclamationTriangleIcon,
	ExitIcon,
	EnterIcon,
	GearIcon,
	RocketIcon,
	PlusIcon,
	HamburgerMenuIcon,
	Pencil2Icon,
	UpdateIcon,
	CheckCircledIcon,
	PlayIcon,
	TrashIcon,
	ArchiveIcon,
	ResetIcon,
	DiscordLogoIcon,
	FileTextIcon,
	IdCardIcon,
	PlusCircledIcon,
	FilePlusIcon,
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	DotsHorizontalIcon,
	ArrowLeftIcon,
} from "@radix-ui/react-icons";

export const RecompraCRMIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
	<svg ref={ref} {...props} className={cn(className)} viewBox="0 0 238 144" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<title>RecompraCRM</title>
		<rect y="41.0068" width="41.0062" height="61.5094" rx="20.5031" />
		<rect x="49.2078" width="41.0062" height="143.522" rx="20.5031" />
		<rect x="98.4153" y="30.7549" width="41.0062" height="82.0125" rx="20.5031" />
		<rect x="147.623" width="41.0062" height="143.522" rx="20.5031" />
		<rect x="196.83" y="41.0068" width="41.0062" height="61.5094" rx="20.5031" />
	</svg>
));
RecompraCRMIcon.displayName = "RecompraCRMIcon";
