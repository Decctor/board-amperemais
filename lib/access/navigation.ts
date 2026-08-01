import { canAccessDashboardCapability, type TCapabilityContext, type TDashboardCapability } from "./capabilities";

export type TNavigationItem = {
	id: string;
	capability?: TDashboardCapability;
	items?: TNavigationItem[] | null;
};

export function filterNavigationItems<T extends TNavigationItem>(items: T[], context: TCapabilityContext): T[] {
	return items
		.filter((item) => !item.capability || canAccessDashboardCapability(item.capability, context))
		.map((item) => {
			if (!item.items) return item;
			return { ...item, items: filterNavigationItems(item.items, context) };
		})
		.filter((item) => !item.items || item.items.length > 0);
}
