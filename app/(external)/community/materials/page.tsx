"use client";

import { CommunityHeader } from "@/components/Community/CommunityHeader";
import { CommunityPageShell } from "@/components/Community/CommunityPageShell";
import { CommunitySearchBar } from "@/components/Community/CommunitySearchBar";
import { ContentListSkeleton } from "@/components/Community/ContentListSkeleton";
import { EmptyContentPlaceholder } from "@/components/Community/EmptyContentPlaceholder";
import { MaterialRow } from "@/components/Community/MaterialRow";
import { usePublicCommunityMaterials } from "@/lib/queries/community";
import { BookText } from "lucide-react";
import { useMemo, useState } from "react";

export default function MaterialsPage() {
	const [search, setSearch] = useState("");
	const { data: materials = [], isLoading } = usePublicCommunityMaterials();

	const filteredMaterials = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return materials;
		return materials.filter(
			(material) =>
				material.titulo.toLowerCase().includes(query) ||
				material.descricao?.toLowerCase().includes(query) ||
				material.tipo.toLowerCase().includes(query),
		);
	}, [materials, search]);

	return (
		<CommunityPageShell className="flex flex-col gap-8">
			<CommunityHeader breadcrumbs={[{ label: "Início", href: "/community" }, { label: "Materiais" }]} />

			<CommunitySearchBar
				value={search}
				onChange={setSearch}
				title="Materiais"
				description="eBooks, guias, planilhas e documentos para consulta e download."
				size="default"
				placeholder="Buscar materiais..."
			/>

			{isLoading ? <ContentListSkeleton count={6} /> : null}

			{!isLoading && filteredMaterials.length === 0 ? (
				<EmptyContentPlaceholder
					icon={BookText}
					title={search.trim() ? "Nenhum material encontrado" : "Nenhum material disponível"}
					description={search.trim() ? "Tente buscar por outros termos." : "Em breve teremos materiais disponíveis."}
				/>
			) : null}

			{!isLoading && filteredMaterials.length > 0 ? (
				<div className="flex flex-col gap-2">
					{filteredMaterials.map((material) => (
						<MaterialRow key={material.id} material={material} />
					))}
				</div>
			) : null}
		</CommunityPageShell>
	);
}
