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

export const RecompraCRMIconColorful = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
	<svg ref={ref} {...props} className={cn(className)} viewBox="0 0 238 144" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect y="41.0068" width="41.0062" height="61.5094" rx="20.5031" fill="#E7000B" />
		<rect x="49.2078" width="41.0062" height="143.522" rx="20.5031" fill="white" />
		<rect x="98.4153" y="30.7549" width="41.0062" height="82.0125" rx="20.5031" fill="#E7000B" />
		<rect x="147.623" width="41.0062" height="143.522" rx="20.5031" fill="#FFB900" />
		<rect x="196.83" y="41.0068" width="41.0062" height="61.5094" rx="20.5031" fill="white" />
	</svg>
));
RecompraCRMIconColorful.displayName = "RecompraCRMIconColorful";

/**
 * Logotipo do iFood — é uma marca nominativa, não um símbolo: precisa de largura para ser legível,
 * então use altura pequena com largura automática (`h-3 w-auto`) em vez de encaixar num quadrado.
 */
export const IfoodIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
	<svg ref={ref} {...props} className={cn(className)} viewBox="0 0 1004 566" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
		<title>iFood</title>
		<path d="M0 304.6h76.41l42.46-211.2H42.45zM46.66 68.21h76.73L136 5.02H59.3zm59.47 295.82h76.42l46.69-228.18h57.31L295 93.4h-56.21l2.13-9.55c3.18-18 9.55-38.21 38.2-38.21 17 0 32.91 1.06 48.82 8.49l8.5-44.57A167.8 167.8 0 0 0 281.25 0c-61.56 0-104 36.09-119.93 93.4h-26.53l-8.49 42.45h26.53z" />
		<path d="M348.11 308.85c90.21 0 152.83-81.73 152.83-148.59 0-49.88-45.64-71.11-90.21-71.11-98.73 0-152.83 88.14-152.83 148.59 0 49.88 46.7 71.11 90.21 71.11m242 0c90.21 0 152.83-81.73 152.83-148.59 0-49.88-46.7-71.11-91.28-71.11-98.7 0-152.82 88.09-152.82 148.59 0 49.88 47.76 71.11 91.27 71.11m277-4.25h75.35L1004 4.29h-76.41l-18.05 89.15-31.84-3.18c-74.29 0-142.21 95.51-142.21 163.44 0 27.59 18 55.19 48.82 55.19 43.51 0 74.29-21.23 87-42.46h4.24zM631.48 462.74a295 295 0 0 1-212.26 66.86c-100.83-6.37-173-83.85-185.73-165.57h4.24c23.35 51 79.6 98.71 148.59 106.13 70 8.49 153.89-23.34 199.52-66.86l-50.94-39.27h153.89l-34 163.45-22.29-63.68z" />
	</svg>
));
IfoodIcon.displayName = "IfoodIcon";

export const MetaIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
	<svg ref={ref} {...props} className={cn(className)} viewBox="0 0 1505 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M1080 0C956.609 0 860.152 92.9359 772.836 210.993C652.847 58.2152 552.5 0 432.414 0C187.586 0 0 318.621 0 655.862C0 866.896 102.096 1000 273.104 1000C396.184 1000 484.703 941.974 642.069 666.897C642.069 666.897 707.666 551.055 752.794 471.258C768.607 496.79 785.262 524.302 802.759 553.793L876.552 677.931C1020.3 918.479 1100.39 1000 1245.52 1000C1412.11 1000 1504.83 865.077 1504.83 649.655C1504.83 296.552 1313.01 0 1080 0ZM522.069 592.414C394.483 792.414 350.345 837.241 279.31 837.241C206.207 837.241 162.759 773.063 162.759 658.621C162.759 413.793 284.828 163.448 430.345 163.448C509.146 163.448 574.999 208.958 675.867 353.361C580.088 500.272 522.069 592.414 522.069 592.414ZM1003.6 567.236L915.367 420.088C891.491 381.256 868.544 345.512 846.529 312.858C926.049 190.122 991.642 128.966 1069.66 128.966C1231.72 128.966 1361.38 367.587 1361.38 660.69C1361.38 772.414 1324.79 837.242 1248.97 837.242C1176.29 837.241 1141.58 789.247 1003.6 567.236Z"
			fill="currentColor"
		/>
	</svg>
));
MetaIcon.displayName = "MetaIcon";
export const WhatsappIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
	<svg ref={ref} {...props} className={cn(className)} viewBox="0 0 346 346" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M173 0C77.45 0 0 77.45 0 173C0 204.43 8.38 233.91 23.04 259.31L0 346L89.87 324.75C114.54 338.29 142.87 346 173 346C268.55 346 346 268.55 346 173C346 77.45 268.55 0 173 0ZM173 315.01C144.09 315.01 117.19 306.37 94.76 291.53L41.66 305.05L56.55 254.3C40.44 231.27 30.99 203.24 30.99 173C30.99 94.57 94.57 30.99 173 30.99C251.43 30.99 315.01 94.57 315.01 173C315.01 251.43 251.43 315.01 173 315.01Z"
			fill="currentColor"
		/>
		<path
			d="M213.54 195.839L255.4 215.569C257.32 216.479 258.55 218.419 258.38 220.539C257.93 226.049 255.72 237.089 245.82 246.979C217.89 274.909 167.73 243.309 165.69 242.089C153.35 235.459 141.63 226.599 130.52 215.479C119.41 204.369 110.54 192.639 103.91 180.309C102.69 178.269 71.09 128.119 99.02 100.179C108.92 90.2792 119.95 88.0792 125.46 87.6192C127.58 87.4492 129.53 88.6792 130.43 90.5992L150.16 132.459C151.09 134.439 150.68 136.789 149.14 138.339L134.43 153.049C131.25 156.229 130.31 161.179 132.51 165.109C137.88 174.739 145.1 184.009 153.46 192.539C161.99 200.899 171.26 208.119 180.89 213.489C184.82 215.679 189.77 214.749 192.95 211.569L207.66 196.859C209.21 195.309 211.56 194.899 213.54 195.839Z"
			fill="currentColor"
		/>
	</svg>
));
WhatsappIcon.displayName = "WhatsappIcon";
