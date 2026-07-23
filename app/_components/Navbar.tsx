"use client";

import { BrandLogo } from "@/components/Brand/BrandLogo";
import { captureClientEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const ANCHOR_LINKS = [
	{ label: "Como funciona", href: "#como-funciona" },
	{ label: "Resultados", href: "#resultado" },
	{ label: "Funcionalidades", href: "#funcionalidades" },
	{ label: "Preço", href: "#planos" },
];

export default function NavbarV2() {
	const [scrolled, setScrolled] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const pathname = usePathname();
	const isHomePage = pathname === "/";

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 20);
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const handleAnchorClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement>, href: string, isMobileMenu: boolean) => {
			captureClientEvent({
				event: "landing_nav_click",
				properties: {
					target_section: href.replace("#", ""),
					is_mobile_menu: isMobileMenu,
				},
			});
			setMobileOpen(false);
			if (isHomePage) {
				e.preventDefault();
				const el = document.querySelector(href);
				if (el) el.scrollIntoView({ behavior: "smooth" });
			}
			// On other pages: let the browser navigate to /#section
		},
		[isHomePage],
	);

	return (
		<header className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-brand-secondary rounded-bl-lg rounded-br-lg")}>
			<div className="container mx-auto max-w-7xl px-6 lg:px-8 h-16 flex items-center justify-between">
				<Link href="/" className="relative w-36 h-10">
					<BrandLogo lockup="horizontal" tone="color-on-dark" alt="RecompraCRM" fill className="object-contain" priority />
				</Link>

				<nav className="hidden md:flex items-center gap-8">
					{ANCHOR_LINKS.map((link) => (
						<a
							key={link.href}
							href={isHomePage ? link.href : `/${link.href}`}
							onClick={(e) => handleAnchorClick(e, link.href, false)}
							className="text-sm font-medium text-brand-secondary-foreground transition-colors"
						>
							{link.label}
						</a>
					))}
					<Link href="/integrations" className="text-sm font-medium text-slate-600 hover:text-[#24549C] transition-colors">
						Integrações
					</Link>
					<Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-[#24549C] transition-colors">
						Blog
					</Link>
				</nav>

				<div className="hidden md:flex items-center gap-4">
					<Link href="/auth/signin" className="text-sm bg-brand text-brand-foreground px-4 py-2 rounded-lg font-bold transition-colors hover:bg-brand/90">
						ENTRAR
					</Link>
					<a
						href="https://wa.me/553499480791?text=Olá, gostaria de agendar uma demonstração."
						target="_blank"
						rel="noopener noreferrer"
						onClick={() =>
							captureClientEvent({
								event: "landing_cta_clicked",
								properties: {
									cta_id: "navbar_agendar_demo",
									location: "navbar",
								},
							})
						}
						className="bg-brand-secondary-foreground hover:bg-brand/90 hover:text-brand-foreground text-sm font-bold px-4 py-2 rounded-lg shadow-lg shadow-brand/15 hover:shadow-brand/25 hover:-translate-y-0.5 transition-all duration-300"
					>
						AGENDAR DEMO
					</a>
				</div>

				<button type="button" className="md:hidden p-2 text-slate-700" onClick={() => setMobileOpen(!mobileOpen)}>
					{mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
				</button>
			</div>

			{mobileOpen && (
				<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-white border-b border-slate-200 shadow-lg">
					<div className="container mx-auto max-w-7xl px-6 py-4 flex flex-col gap-4">
						{ANCHOR_LINKS.map((link) => (
							<a
								key={link.href}
								href={isHomePage ? link.href : `/${link.href}`}
								onClick={(e) => handleAnchorClick(e, link.href, true)}
								className="text-sm font-medium text-slate-700 py-2"
							>
								{link.label}
							</a>
						))}
						<Link href="/integrations" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-700 py-2">
							Integrações
						</Link>
						<Link href="/blog" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-slate-700 py-2">
							Blog
						</Link>
						<hr className="border-slate-200" />
						<Link href="/auth/signin" className="text-sm font-medium text-slate-600 py-2">
							Entrar
						</Link>
						<a
							href="https://wa.me/553499480791?text=Olá, gostaria de agendar uma demonstração."
							target="_blank"
							rel="noopener noreferrer"
							onClick={() =>
								captureClientEvent({
									event: "landing_cta_clicked",
									properties: {
										cta_id: "navbar_agendar_demo",
										location: "navbar_mobile",
									},
								})
							}
							className="bg-[#24549C] text-white text-sm font-bold px-6 py-3 rounded-full text-center"
						>
							Agendar Demo
						</a>
					</div>
				</motion.div>
			)}
		</header>
	);
}
