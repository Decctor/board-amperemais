"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CheckCircle2, CircleDashed, Settings2 } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

export type TIntegrationProviderDefinition = {
	id: string;
	nome: string;
	descricao: string;
	logo?: StaticImageData;
	href: string;
	brandColor: string;
};

type IntegrationProviderCardProps = {
	provider: TIntegrationProviderDefinition;
	isConnected: boolean;
};

/** Card de um provedor na galeria de integrações, com estado de conexão e CTA para a subpágina. */
export function IntegrationProviderCard({ provider, isConnected }: IntegrationProviderCardProps) {
	return (
		<div className="bg-card border-border flex w-full max-w-[450px] flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex w-full items-start justify-between gap-2">
				<div className="relative h-12 w-32">
					{provider.logo ? (
						<Image src={provider.logo} alt={provider.nome} fill className="object-contain object-left" />
					) : (
						<div
							className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
							style={{ backgroundColor: provider.brandColor }}
						>
							{provider.nome.slice(0, 2)}
						</div>
					)}
				</div>
				{isConnected ? (
					<Chip.Root variant="success" size="md">
						<Chip.Icon>
							<CheckCircle2 className="h-4 w-4 min-h-4 min-w-4" />
						</Chip.Icon>
						<Chip.Label>CONECTADO</Chip.Label>
					</Chip.Root>
				) : (
					<Chip.Root variant="muted" size="md">
						<Chip.Icon>
							<CircleDashed className="h-4 w-4 min-h-4 min-w-4" />
						</Chip.Icon>
						<Chip.Label>NÃO CONECTADO</Chip.Label>
					</Chip.Root>
				)}
			</div>
			<div className="flex w-full flex-col gap-1.5">
				<h3 className="w-full text-start text-lg font-semibold">{provider.nome}</h3>
				<p className="text-sm leading-relaxed text-muted-foreground">{provider.descricao}</p>
				<Button asChild variant="default" size="fit" className="flex items-center gap-1.5 self-end rounded-xl px-3 py-2 font-bold">
					<Link href={provider.href}>
						<Settings2 className="h-4 w-4" />
						{isConnected ? "GERENCIAR" : "CONECTAR"}
					</Link>
				</Button>
			</div>
		</div>
	);
}
