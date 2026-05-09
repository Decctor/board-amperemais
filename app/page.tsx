import FooterV2 from "./_components/Footer";
import LandingAnalyticsTracker from "./_components/LandingAnalyticsTracker";
import NavbarV2 from "./_components/Navbar";
import SimpleCase from "./_components/SimpleCase";
import SimpleFeatures from "./_components/SimpleFeatures";
import SimpleHero from "./_components/SimpleHero";
import SimpleHowItWorks from "./_components/SimpleHowItWorks";
import SimplePricing from "./_components/SimplePricing";

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-white">
			<LandingAnalyticsTracker />
			<NavbarV2 />
			<SimpleHero />
			<SimpleHowItWorks />
			<SimpleCase />
			<SimpleFeatures />
			<SimplePricing />
			<FooterV2 />
		</div>
	);
}
