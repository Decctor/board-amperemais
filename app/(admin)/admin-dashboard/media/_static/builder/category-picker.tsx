"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: app/dashboard/growth/campaigns/_module/builder/components/category-picker.tsx (commit 19d8578).
 *
 * Mesmo JSX, sem `useBuilderUi`: a categoria selecionada chega por prop. `CategoryCard` é
 * importado do original — não tem hook nenhum, forkar só faria a peça divergir do produto.
 * Ao mexer no original, refaça o diff contra este arquivo.
 */

import { Sparkles, CalendarRange, Layers } from "lucide-react";
import {
	BUILDER_CATEGORIES,
	type TBuilderCategoryId,
} from "@/app/dashboard/growth/campaigns/_module/builder/helpers/categories";
import CategoryCard from "@/app/dashboard/growth/campaigns/_module/builder/components/category-card";

const noop = () => {};

const CATEGORY_ICONS: Record<TBuilderCategoryId, typeof Sparkles> = {
	EVENT: Sparkles,
	SCHEDULE: CalendarRange,
	RFM: Layers,
};

type CategoryPickerProps = {
	selectedCategory: TBuilderCategoryId;
};

export default function CategoryPicker({ selectedCategory }: CategoryPickerProps) {

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col">
				<h3 className="text-sm font-semibold tracking-tight">Como sua campanha será disparada?</h3>
				<p className="text-xs text-muted-foreground">
					Cada categoria tem um fluxo otimizado. Você poderá voltar e mudar a qualquer momento.
				</p>
			</div>
			<div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
				{BUILDER_CATEGORIES.map((category) => (
					<CategoryCard
						key={category.id}
						id={category.id}
						icon={CATEGORY_ICONS[category.id]}
						label={category.label}
						tagline={category.tagline}
						description={category.description}
						triggerCount={category.triggers.length}
						selected={selectedCategory === category.id}
						onClick={noop}
					/>
				))}
			</div>
		</div>
	);
}
