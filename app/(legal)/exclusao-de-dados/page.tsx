import { CheckCircle2, Clock, Mail, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DataExclusionRequestForm } from "./data-exclusion-request-form";
import Image from "next/image";
import RecompraCRMLogo from "@/utils/images/logos/icon-color-on-dark.png";

export const metadata: Metadata = {
	title: "Exclusão de dados",
	description: "Instruções para solicitar a exclusão de dados pessoais tratados pelo RecompraCRM.",
};

const contactEmail = "lucas@syncroniza.com.br";

export default function DataExclusionPage() {
	return (
		<div className="min-h-screen flex flex-col md:flex-row">
			{/* Left panel — branding & info */}
			<div
				className="w-full md:w-[45%] flex flex-col justify-between px-10 py-12 text-white"
				style={{ background: "linear-gradient(150deg, #1a3f7a 0%, #24549c 55%, #1c4585 100%)" }}
			>
				<div className="space-y-10">
					{/* Logo + brand */}
					<div className="flex items-center gap-3">
						<div className="relative w-11 h-11 shrink-0">
							<Image src={RecompraCRMLogo} alt="RecompraCRM" fill className="object-contain" />
						</div>
						<span className="text-xs font-semibold tracking-[0.18em] uppercase text-white/50">RecompraCRM</span>
					</div>

					{/* Headline */}
					<div className="space-y-4">
						<div className="w-8 h-0.5 bg-brand" />
						<h1 className="text-3xl font-bold tracking-tight leading-tight">
							Solicitação de
							<br />
							exclusão de dados
						</h1>
						<p className="text-sm leading-relaxed text-white/65 max-w-sm">
							Use esta página para solicitar a exclusão de dados pessoais tratados pelo RecompraCRM, incluindo dados associados a integrações com produtos da
							Meta, como WhatsApp e Facebook.
						</p>
					</div>

					{/* How it works */}
					<div className="space-y-5">
						<p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">Como funciona</p>
						<ul className="space-y-5">
							<li className="flex gap-3 items-start">
								<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
								<span className="text-sm leading-relaxed text-white/75">
									Após recebermos a solicitação, verificaremos as informações necessárias para localizar os dados relacionados ao titular.
								</span>
							</li>
							<li className="flex gap-3 items-start">
								<Shield className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
								<span className="text-sm leading-relaxed text-white/75">
									Podemos solicitar confirmação de identidade ou vínculo com a empresa cliente para proteger dados de terceiros.
								</span>
							</li>
							<li className="flex gap-3 items-start">
								<Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
								<span className="text-sm leading-relaxed text-white/75">
									Responderemos em até 15 dias úteis, salvo quando houver obrigação legal ou contratual de retenção.
								</span>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom contact */}
				<div className="mt-10 pt-6 border-t border-white/10 space-y-1.5">
					<div className="flex items-center gap-2">
						<Mail className="h-3.5 w-3.5 text-white/40" />
						<span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">Contato direto</span>
					</div>
					<p className="text-sm leading-relaxed text-white/60">
						Se preferir, envie sua solicitação para{" "}
						<a href={`mailto:${contactEmail}`} className="text-brand font-medium hover:text-brand/80 underline underline-offset-4">
							{contactEmail}
						</a>
						. Informe nome, e-mail, telefone e uma descrição dos dados que deseja excluir.
					</p>
				</div>
			</div>

			{/* Right panel — form */}
			<div className="w-full md:w-[55%] flex flex-col justify-center px-8 md:px-16 py-12 bg-background">
				<div className="w-full max-w-md mx-auto space-y-5">
					<DataExclusionRequestForm />

					<p className="text-xs leading-relaxed text-muted-foreground text-center px-2">
						Para mais detalhes sobre privacidade, consulte nossos{" "}
						<Link href="/legal" className="font-medium text-brand underline underline-offset-4 hover:text-brand/80">
							Termos de Uso e Política de Privacidade
						</Link>
						.
					</p>
				</div>
			</div>
		</div>
	);
}
