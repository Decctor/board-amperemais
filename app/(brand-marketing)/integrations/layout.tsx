import BrandHeader from "@/app/_components/BrandHeader";
import FooterV2 from "@/app/_components/Footer";

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-white">
			<BrandHeader />
			{children}
			<FooterV2 />
		</div>
	);
}
