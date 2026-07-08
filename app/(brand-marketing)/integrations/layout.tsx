import FooterV2 from "@/app/_components/Footer";
import NavbarV2 from "@/app/_components/Navbar";

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-white">
			<NavbarV2 />
			{children}
			<FooterV2 />
		</div>
	);
}
