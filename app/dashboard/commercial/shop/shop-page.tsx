"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useShopSettings } from "@/lib/queries/shop";
import ShopOrdersQueue from "./components/ShopOrdersQueue";
import ShopSettingsPanel from "./components/ShopSettingsPanel";
import ShopShareCard from "./components/ShopShareCard";
import { getErrorMessage } from "@/lib/errors";
import SectionWrapper from "@/components/ui/section-wrapper";
import { CircleCheck, Diamond, Pencil, Settings, Store, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import { TGetShopSettingsOutput } from "@/app/api/shop/settings/route";
import { Badge } from "@/components/ui/badge";
import { ShopModeOptions } from "@/utils/select-options";

type ShopPageProps = {
	organizationId: string;
};

export default function ShopPage({ organizationId }: ShopPageProps) {
	const { data: settings, isLoading, isError, error } = useShopSettings();

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<ShopOrdersQueue />

			<div className="w-full flex items-strech gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<ShopConfig settings={settings} />
				</div>
				<div className="w-full lg:w-1/2">
					<ShopShareCard organizationId={organizationId} isActive={settings?.ativo ?? false} />
				</div>
			</div>
		</div>
	);
}

type ShopConfigProps = {
	settings: TGetShopSettingsOutput["data"]["settings"];
};
function ShopConfig({ settings }: ShopConfigProps) {
	const [editMenuIsOpen, setEditMenuIsOpen] = useState(false);

	const shopModeDetail = useMemo(() => {
		return ShopModeOptions.find((option) => option.value === settings.modo)?.label ?? "NÃO DEFINIDO";
	}, [settings.modo]);
	return (
		<SectionWrapper
			title="CONFIGURAÇÕES DA LOJA"
			icon={<Settings className="w-4 h-4 min-w-4 min-h-4" />}
			actions={
				<Button variant="ghost" size="xs" onClick={() => setEditMenuIsOpen(true)} className="flex items-center gap-1">
					<Pencil className="w-4 h-4 min-w-4 min-h-4" />
					EDITAR
				</Button>
			}
			wrapperClassName="h-full"
		>
			<div className="flex w-full grow flex-col gap-4">
				<div className="w-full flex flex-col gap-3">
					<h1 className="text-xs leading-none tracking-tight">INFORMAÇÕES GERAIS</h1>
					<div className="w-full flex flex-col gap-3">
						<div className="w-full flex items-center gap-1.5">
							<CircleCheck className="w-4 h-4" />
							<h3 className="text-sm font-semibold tracking-tighter text-primary/80">ATIVO</h3>
							<Badge className="flex min-w-fit items-center gap-1 rounded-lg bg-green-200 text-green-600 px-2 py-1 shadow-none">
								<h1 className="text-[0.65rem] font-medium">{settings.ativo ? "SIM" : "NÃO"}</h1>
							</Badge>
						</div>
						<div className="w-full flex items-center gap-1.5">
							<Diamond className="w-4 h-4" />
							<h3 className="text-sm font-semibold tracking-tighter text-primary/80">MODO</h3>
							<Badge className="flex min-w-fit items-center gap-1 rounded-lg px-2 py-1 shadow-none">
								{ShopModeOptions.find((option) => option.value === settings.modo)?.icon}
								<h1 className="text-[0.65rem] font-medium">{shopModeDetail}</h1>
							</Badge>
						</div>
						<div className="w-full flex items-center gap-1.5">
							<Truck className="w-4 h-4" />
							<h3 className="text-sm font-semibold tracking-tighter text-primary/80">ACEITA ENTREGA</h3>
							<Badge className="flex min-w-fit items-center gap-1 rounded-lg bg-green-200 text-green-600 px-2 py-1 shadow-none">
								<h1 className="text-[0.65rem] font-medium">{settings.configuracoes.aceitaEntrega ? "SIM" : "NÃO"}</h1>
							</Badge>
						</div>
						<div className="w-full flex items-center gap-1.5">
							<Store className="w-4 h-4" />
							<h3 className="text-sm font-semibold tracking-tighter text-primary/80">ACEITA RETIRADA</h3>
							<Badge className="flex min-w-fit items-center gap-1 rounded-lg bg-green-200 text-green-600 px-2 py-1 shadow-none">
								<h1 className="text-[0.65rem] font-medium">{settings.configuracoes.aceitaRetirada ? "SIM" : "NÃO"}</h1>
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</SectionWrapper>
	);
}
