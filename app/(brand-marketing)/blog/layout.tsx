import FooterV2 from "@/app/_components/Footer";
import NavbarV2 from "@/app/_components/Navbar";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-white min-h-screen">
			<NavbarV2 />
			{children}
			<FooterV2 />
		</div>
	);
}
