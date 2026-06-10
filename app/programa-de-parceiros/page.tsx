import type { Metadata } from "next";
import "../_components/ledger/ledger.css";
import { LedgerFooter } from "../_components/ledger/Footer";
import { LedgerNavbar } from "../_components/ledger/Navbar";
import { PartnersCalculator } from "./_components/PartnersCalculator";
import { PartnersClosingCTA } from "./_components/PartnersClosingCTA";
import { PartnersForWho } from "./_components/PartnersForWho";
import { PartnersHero } from "./_components/PartnersHero";
import { PartnersHowItWorks } from "./_components/PartnersHowItWorks";
import { PartnersPayment } from "./_components/PartnersPayment";

export const metadata: Metadata = {
	title: "Programa de Parcerias | RecompraCRM",
	description:
		"Indique lojas para o RecompraCRM e ganhe comissão recorrente: 100% da primeira mensalidade e 20% das seguintes, com painel próprio e pagamento mensal via PIX.",
	openGraph: {
		title: "Programa de Parcerias | RecompraCRM",
		description: "Transforme suas indicações de lojistas em receita recorrente. Painel próprio e pagamento mensal via PIX.",
	},
};

export default function PartnerProgramPage() {
	return (
		<div className="min-h-screen bg-[#fafaf7] text-[#171717] selection:bg-[#ffb900]/35 selection:text-[#171717]">
			<LedgerNavbar />
			<main>
				<PartnersHero />
				<PartnersHowItWorks />
				<PartnersPayment />
				<PartnersCalculator />
				<PartnersForWho />
				<PartnersClosingCTA />
			</main>
			<LedgerFooter />
		</div>
	);
}
