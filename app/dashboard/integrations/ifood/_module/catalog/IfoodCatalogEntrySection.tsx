"use client";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { BookOpen, Store } from "lucide-react";
import Link from "next/link";
import { IfoodSectionEmpty } from "../shared/IfoodSectionEmpty";

type IfoodCatalogEntrySectionProps = {
	merchantId: string | null;
};

/**
 * Porta de entrada do catálogo. A gestão em si vive em rota própria porque a tabela de itens
 * precisa de largura e de uma barra de alterações que não cabem no acordeão desta página.
 */
export function IfoodCatalogEntrySection({ merchantId }: IfoodCatalogEntrySectionProps) {
	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<BookOpen className="h-4 w-4 min-h-4 min-w-4" />
				</Section.Icon>
				<Section.Title>CATÁLOGO</Section.Title>
			</Section.Header>
			<Section.Body>
				{!merchantId ? (
					<IfoodSectionEmpty icon={Store} message="Selecione uma loja para gerenciar o catálogo." />
				) : (
					<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="max-w-[60ch] text-sm text-muted-foreground">
							Categorias, itens, preços, disponibilidade e complementos desta loja — tudo editável em tabela.
						</p>
						<Button variant="outline" size="sm" className="shrink-0 self-start sm:self-auto" asChild>
							<Link href={`/dashboard/integrations/ifood/catalog?merchantId=${merchantId}`}>ABRIR CATÁLOGO</Link>
						</Button>
					</div>
				)}
			</Section.Body>
		</Section.Root>
	);
}
