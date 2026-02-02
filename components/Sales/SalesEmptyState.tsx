"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import { ArrowRight, Cable, Lock, Plus, ShoppingCart, Zap } from "lucide-react";
import Link from "next/link";

type SalesEmptyStateProps = {
	organizationConfig: TOrganizationConfiguration | null;
};

export default function SalesEmptyState({ organizationConfig }: SalesEmptyStateProps) {
	const hasIntegrationAccess = organizationConfig?.recursos?.integracoes?.acesso ?? false;

	return (
		<div className="w-full h-full flex flex-col items-center justify-center gap-8 py-12">
			<div className="flex flex-col items-center gap-3 text-center max-w-lg">
				<div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
					<ShoppingCart className="w-10 h-10 text-primary" />
				</div>
				<h1 className="text-2xl font-bold tracking-tight">Registre sua primeira venda</h1>
				<p className="text-muted-foreground">
					Escolha uma das opções abaixo para começar a registrar suas vendas e acompanhar o desempenho do seu negócio.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
				{/* Integration Option */}
				<Card className={!hasIntegrationAccess ? "opacity-60" : "hover:border-primary/50 transition-colors"}>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center">
								<Cable className="w-6 h-6 text-violet-500" />
							</div>
							{!hasIntegrationAccess && (
								<div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
									<Lock className="w-3 h-3 text-muted-foreground" />
									<span className="text-xs text-muted-foreground">Recurso bloqueado</span>
								</div>
							)}
						</div>
						<CardTitle className="text-lg">Configurar Integração</CardTitle>
						<CardDescription>
							Conecte seu sistema de vendas (ERP, PDV) para sincronizar vendas automaticamente.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{hasIntegrationAccess ? (
							<>
								<div className="space-y-3 mb-4">
									<div className="flex items-center gap-2 text-sm">
										<Zap className="w-4 h-4 text-amber-500" />
										<span>Sincronização automática de vendas</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<Zap className="w-4 h-4 text-amber-500" />
										<span>Atualização em tempo real</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<Zap className="w-4 h-4 text-amber-500" />
										<span>Importação de histórico de vendas</span>
									</div>
								</div>
								<Button className="w-full gap-2" asChild>
									<Link href="/dashboard/settings?view=integration">
										Configurar integração
										<ArrowRight className="w-4 h-4" />
									</Link>
								</Button>
							</>
						) : (
							<>
								<p className="text-sm text-muted-foreground mb-4">
									Faça upgrade do seu plano para ter acesso às integrações com sistemas externos.
								</p>
								<Button variant="outline" className="w-full gap-2" asChild>
									<Link href="/dashboard/settings?view=subscription">
										Ver planos
										<ArrowRight className="w-4 h-4" />
									</Link>
								</Button>
							</>
						)}
					</CardContent>
				</Card>

				{/* Manual Sales / Point of Interaction Option */}
				<Card className="hover:border-primary/50 transition-colors">
					<CardHeader>
						<div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
							<Plus className="w-6 h-6 text-emerald-500" />
						</div>
						<CardTitle className="text-lg">Ponto de Venda (PDV)</CardTitle>
						<CardDescription>
							Registre vendas manualmente usando nosso sistema de ponto de venda integrado.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3 mb-4">
							<div className="flex items-center gap-2 text-sm">
								<Zap className="w-4 h-4 text-emerald-500" />
								<span>Interface simples e intuitiva</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Zap className="w-4 h-4 text-emerald-500" />
								<span>Busca e cadastro de clientes</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Zap className="w-4 h-4 text-emerald-500" />
								<span>Aplicação automática de cashback</span>
							</div>
						</div>
						<Button className="w-full gap-2" variant="default" asChild>
							<Link href="/dashboard/commercial/sales/new-sale">
								Fazer nova venda
								<ArrowRight className="w-4 h-4" />
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>

			<div className="text-center max-w-md">
				<p className="text-sm text-muted-foreground">
					Precisa de ajuda para começar?{" "}
					<Link href="/dashboard/help" className="text-primary hover:underline">
						Acesse nossa central de ajuda
					</Link>
				</p>
			</div>
		</div>
	);
}
