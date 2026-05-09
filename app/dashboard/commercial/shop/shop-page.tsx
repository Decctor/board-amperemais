"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useShopSettings } from "@/lib/queries/shop";
import ShopOrdersQueue from "./components/ShopOrdersQueue";
import ShopSettingsPanel from "./components/ShopSettingsPanel";
import ShopShareCard from "./components/ShopShareCard";
import { getErrorMessage } from "@/lib/errors";
import SectionWrapper from "@/components/ui/section-wrapper";
import { CircleCheck, Diamond, Pencil, Settings, Store, Truck, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { TGetShopSettingsOutput } from "@/app/api/shop/settings/route";
import { Badge } from "@/components/ui/badge";
import { ShopModeOptions } from "@/utils/select-options";
import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateShopSettings } from "@/lib/mutations/shop";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ShopPageProps = {
	organizationId: string;
};

export default function ShopPage({ organizationId }: ShopPageProps) {
	const queryClient = useQueryClient();
	const { data: settings, isLoading, isError, error, queryKey } = useShopSettings();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<ShopOrdersQueue />

			<div className="w-full flex items-strech gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<ShopConfig settings={settings} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
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
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
function ShopConfig({ settings, callbacks }: ShopConfigProps) {
	const [editMenuIsOpen, setEditMenuIsOpen] = useState(false);

	const shopModeDetail = useMemo(() => {
		return ShopModeOptions.find((option) => option.value === settings.modo)?.label ?? "NÃO DEFINIDO";
	}, [settings.modo]);

	const { mutate: handleUpdateShopSettings, isPending } = useMutation({
		mutationKey: ["update-shop-settings"],
		mutationFn: updateShopSettings,
		onMutate: () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});
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
					<div className="w-full flex flex-col gap-3">
						<div className="w-full flex items-center justify-between gap-1.5">
							<div className="flex items-center gap-1.5">
								<CircleCheck className="w-4 h-4" />
								<h3 className="text-sm font-semibold tracking-tighter text-primary/80">STATUS DA LOJA DIGITAL</h3>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant={settings.ativo ? "success-light" : "destructive-light"}
										size="fit"
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
									>
										{settings.ativo ? <Check className="w-4 h-4 min-w-4 min-h-4" /> : <X className="w-4 h-4 min-w-4 min-h-4" />}
										<h1 className="text-xs font-medium">{settings.ativo ? "ATIVO" : "DESATIVADO"}</h1>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuLabel>STATUS</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => handleUpdateShopSettings({ ...settings, ativo: true })}>
										<CircleCheck className="w-3 h-3" />
										ATIVAR
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => handleUpdateShopSettings({ ...settings, ativo: false })}>
										<XCircle className="w-3 h-3" />
										DESATIVAR
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<div className="w-full flex items-center justify-between gap-1.5">
							<div className="flex items-center gap-1.5">
								<Diamond className="w-4 h-4" />
								<h3 className="text-sm font-semibold tracking-tighter text-primary/80">MODO DA INTERFACE</h3>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="secondary" size="fit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
										{ShopModeOptions.find((option) => option.value === settings.modo)?.icon}
										<h1 className="text-xs font-medium">{shopModeDetail}</h1>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuLabel>MODO</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{ShopModeOptions.map((option) => (
										<DropdownMenuItem key={option.value} onClick={() => handleUpdateShopSettings({ ...settings, modo: option.value })}>
											{option.icon}
											{option.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<div className="w-full flex items-center justify-between gap-1.5">
							<div className="flex items-center gap-1.5">
								<Truck className="w-4 h-4" />
								<h3 className="text-sm font-semibold tracking-tighter text-primary/80">ACEITA ENTREGA</h3>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant={settings.configuracoes.aceitaEntrega ? "success-light" : "destructive-light"}
										size="fit"
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
									>
										<h1 className="text-xs font-medium">{settings.configuracoes.aceitaEntrega ? "SIM" : "NÃO"}</h1>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuLabel>ACEITA ENTREGA</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() =>
											handleUpdateShopSettings({
												...settings,
												configuracoes: {
													...settings.configuracoes,
													aceitaEntrega: true,
												},
											})
										}
									>
										<CircleCheck className="w-3 h-3" />
										SIM
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											handleUpdateShopSettings({
												...settings,
												configuracoes: {
													...settings.configuracoes,
													aceitaEntrega: false,
												},
											})
										}
									>
										<XCircle className="w-3 h-3" />
										NÃO
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<div className="w-full flex items-center justify-between gap-1.5">
							<div className="flex items-center gap-1.5">
								<Store className="w-4 h-4" />
								<h3 className="text-sm font-semibold tracking-tighter text-primary/80">ACEITA RETIRADA</h3>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant={settings.configuracoes.aceitaRetirada ? "success-light" : "destructive-light"}
										size="fit"
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
									>
										<h1 className="text-xs font-medium">{settings.configuracoes.aceitaRetirada ? "SIM" : "NÃO"}</h1>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuLabel>ACEITA RETIRADA</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() =>
											handleUpdateShopSettings({
												...settings,
												configuracoes: {
													...settings.configuracoes,
													aceitaRetirada: true,
												},
											})
										}
									>
										<CircleCheck className="w-3 h-3" />
										SIM
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											handleUpdateShopSettings({
												...settings,
												configuracoes: {
													...settings.configuracoes,
													aceitaRetirada: false,
												},
											})
										}
									>
										<XCircle className="w-3 h-3" />
										NÃO
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
			</div>
		</SectionWrapper>
	);
}
