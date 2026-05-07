import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ChevronLeft, Clock, Mail, Shield, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DataExclusionRequestForm } from "./data-exclusion-request-form";
import Image from "next/image";
import RecompraCRMLogo from "@/utils/images/logos/RECOMPRA - COMPLETE - HORIZONTAL- COLORFUL.png";
export const metadata: Metadata = {
	title: "Exclusão de dados",
	description: "Instruções para solicitar a exclusão de dados pessoais tratados pelo RecompraCRM.",
};

const contactEmail = "lucas@syncroniza.com.br";

export default function DataExclusionPage() {
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="container mx-auto flex-1 max-w-7xl px-4 py-8">
				<div className="mx-auto flex flex-col gap-8 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:py-6">
					<section className="space-y-6">
						<div className="flex items-center gap-3">
							<div className="space-y-2">
								<div className="w-48 h-36 relative">
									<Image src={RecompraCRMLogo} alt="Exclusão de dados" fill className="object-cover" />
								</div>
								<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Solicitação de exclusão de dados</h1>
								<p className="max-w-xl text-base leading-relaxed text-gray-600">
									Use esta página para solicitar a exclusão de dados pessoais tratados pelo RecompraCRM, incluindo dados associados a integrações com produtos
									da Meta, como WhatsApp e Facebook.
								</p>
							</div>
						</div>

						<Card className="border-primary/20 shadow-xs">
							<CardHeader>
								<CardTitle className="text-lg text-gray-900">Como funciona</CardTitle>
								<CardDescription className="text-gray-600">O que esperar após enviar sua solicitação.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4 text-sm leading-relaxed text-gray-700">
								<ul className="space-y-4">
									<li className="flex gap-3">
										<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
										<span>Após recebermos a solicitação, verificaremos as informações necessárias para localizar os dados relacionados ao titular.</span>
									</li>
									<li className="flex gap-3">
										<Shield className="mt-0.5 h-5 w-5 shrink-0 text-gray-900" />
										<span>Podemos solicitar confirmação de identidade ou vínculo com a empresa cliente para proteger dados de terceiros.</span>
									</li>
									<li className="flex gap-3">
										<Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
										<span>Responderemos em até 15 dias úteis, salvo quando houver obrigação legal ou contratual de retenção.</span>
									</li>
								</ul>
							</CardContent>
						</Card>

						<Card className="border-primary/20 bg-primary/5 shadow-xs">
							<CardContent className="pt-6 text-sm leading-relaxed text-gray-700">
								<div className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
									<Mail className="h-4 w-4 text-primary" />
									Contato direto
								</div>
								<p>
									Se preferir, envie sua solicitação para{" "}
									<a href={`mailto:${contactEmail}`} className="font-medium text-primary underline underline-offset-4 hover:text-primary/90">
										{contactEmail}
									</a>
									. Informe nome, e-mail, telefone e uma descrição dos dados que deseja excluir.
								</p>
							</CardContent>
						</Card>
					</section>

					<section className="space-y-6">
						<div className="space-y-2">
							<h2 className="text-2xl font-bold tracking-tight text-gray-900">Enviar solicitação</h2>
							<p className="text-sm leading-relaxed text-gray-600">
								As informações abaixo serão usadas apenas para processar o pedido de exclusão e entrar em contato sobre o andamento da solicitação.
							</p>
						</div>

						<DataExclusionRequestForm />

						<Separator className="bg-border" />

						<p className="text-xs leading-relaxed text-muted-foreground">
							Esta URL pode ser informada no painel da Meta como URL de instruções de exclusão de dados do usuário. Para mais detalhes sobre privacidade,
							consulte nossos{" "}
							<Link href="/legal" className="font-medium text-gray-900 underline underline-offset-4 hover:text-primary">
								Termos de Uso e Política de Privacidade
							</Link>
							.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
