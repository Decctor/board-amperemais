import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { Building2, Globe, LayoutDashboard, ShoppingBag, Store, Truck } from "lucide-react";
import { SelectableCard } from "./SelectableCard";

type ActuationStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	updateOrganization: TUseOrganizationOnboardingState["updateOrganization"];
};

const BASE_SIZE_OPTIONS = [
	{ value: 50, label: "Até 50" },
	{ value: 100, label: "50 - 100" },
	{ value: 250, label: "100 - 250" },
	{ value: 500, label: "250 - 500" },
	{ value: 1000, label: "500 - 1000" },
	{ value: 2000, label: "+ 1000" },
];

const ERP_OPTIONS = [
	{ id: "bling", label: "Bling", value: "BLING" },
	{ id: "tiny", label: "Tiny", value: "TINY" },
	{ id: "omie", label: "Omie", value: "OMIE" },
	{ id: "contaazul", label: "Conta Azul", value: "CONTAAZUL" },
	{ id: "totvs", label: "TOTVS", value: "TOTVS" },
	{ id: "sankhya", label: "Sankhya", value: "SANKHYA" },
	{ id: "outro", label: "Outro", value: "OUTRO" },
];

const CHANNEL_OPTIONS = [
	{ id: "fisica", label: "Loja Física", value: "LOJA_FISICA", icon: <Store /> },
	{ id: "ecommerce", label: "E-commerce", value: "ECOMMERCE", icon: <Globe /> },
	{ id: "whatsapp", label: "WhatsApp", value: "WHATSAPP", icon: <ShoppingBag /> }, // Using ShoppingBag as a proxy or MessageCircle
	{ id: "marketplace", label: "Marketplace", value: "MARKETPLACE", icon: <LayoutDashboard /> },
	{ id: "delivery", label: "Delivery/Apps", value: "DELIVERY", icon: <Truck /> },
	{ id: "b2b", label: "B2B / Corporativo", value: "B2B", icon: <Building2 /> },
];

export function ActuationStage({ state, updateOrganization }: ActuationStageProps) {
	const handleMultiSelect = (field: "plataformasUtilizadas" | "atuacaoCanais", value: string) => {
		const currentString = state.organization[field] || "";
		const currentList = currentString ? currentString.split(",").filter(Boolean) : [];

		let newList: string[];
		if (currentList.includes(value)) {
			newList = currentList.filter((item) => item !== value);
		} else {
			newList = [...currentList, value];
		}

		updateOrganization({ [field]: newList.join(",") });
	};

	const isSelected = (field: "plataformasUtilizadas" | "atuacaoCanais", value: string) => {
		const currentString = state.organization[field] || "";
		const currentList = currentString ? currentString.split(",") : [];
		return currentList.includes(value);
	};

	return (
		<div className="w-full flex flex-col gap-6">
			<div className="w-full flex flex-col gap-3">
				<h3 className="text-lg font-medium tracking-tight">Qual o tamanho da sua base de clientes?</h3>
				<div className="w-full flex flex-wrap gap-x-4 gap-y-2">
					{BASE_SIZE_OPTIONS.map((option) => (
						<SelectableCard
							key={option.value}
							label={option.label}
							selected={state.organization.tamanhoBaseClientes === option.value}
							onSelect={() => updateOrganization({ tamanhoBaseClientes: option.value })}
							className="w-36 h-36"
						/>
					))}
				</div>
			</div>

			<div className="w-full flex flex-col gap-3">
				<h3 className="text-lg font-medium tracking-tight">Quais sistemas (ERPs) vocês utilizam?</h3>
				<div className="w-full flex flex-wrap gap-x-4 gap-y-2">
					{ERP_OPTIONS.map((option) => (
						<SelectableCard
							key={option.id}
							label={option.label}
							selected={isSelected("plataformasUtilizadas", option.value)}
							onSelect={() => handleMultiSelect("plataformasUtilizadas", option.value)}
							className="w-36 h-36"
						/>
					))}
				</div>
			</div>

			<div className="w-full flex flex-col gap-3">
				<h3 className="text-lg font-medium tracking-tight">Quais são seus canais de venda?</h3>
				<div className="w-full flex flex-wrap gap-x-4 gap-y-2">
					{CHANNEL_OPTIONS.map((option) => (
						<SelectableCard
							key={option.id}
							label={option.label}
							icon={option.icon}
							selected={isSelected("atuacaoCanais", option.value)}
							onSelect={() => handleMultiSelect("atuacaoCanais", option.value)}
							className="w-36 h-36"
						/>
					))}
				</div>
			</div>
		</div>
	);
}
