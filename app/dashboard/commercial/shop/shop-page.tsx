"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useShopSettings } from "@/lib/queries/shop";
import { getErrorMessage } from "@/lib/errors";
import SectionWrapper from "@/components/ui/section-wrapper";
import { CircleCheck, Copy, Diamond, ExternalLink, ListIcon, Pencil, Settings, ShoppingCart, Store, Truck, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { TGetShopSettingsOutput } from "@/app/api/shop/settings/route";
import { ShopModeOptions } from "@/utils/select-options";
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
import { copyToClipboard } from "@/lib/utils";
import Image from "next/image";
import { ShopProductsModeOptions } from "@/utils/select-options";
import { TShopProductsModeEnum } from "@/schemas/enums";

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

	if (!settings) return <ErrorComponent msg="Configurações da loja digital não encontradas." />;
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end">
				<div className="flex items-center justify-center gap-3">
					<div className="w-full lg:w-1/2">
						<Button
							variant="brand"
							className="w-full flex items-center gap-1.5"
							onClick={() => window.open(`/shop/${organizationId}`, "_blank")}
							disabled={!settings?.ativo}
						>
							<ExternalLink className="w-4 h-4" />
							{settings?.ativo ? "ACESSAR LOJA" : "ATIVE A LOJA PARA VISUALIZAR"}
						</Button>
					</div>
					<div className="w-full lg:w-1/2">
						<Button
							variant="secondary"
							className="w-full flex items-center gap-1.5"
							onClick={() => copyToClipboard(`${window.location.origin}/shop/${organizationId}`)}
						>
							<Copy className="w-4 h-4" />
							COPIAR LINK
						</Button>
					</div>
				</div>
			</div>
			<div className="w-full flex items-strech gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<ShopConfig settings={settings} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
				</div>
				<div className="w-full lg:w-1/2">
					<ShopConfigProducts settings={settings} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
				</div>
			</div>
		</div>
	);
}

type ShopConfigProps = {
	settings: NonNullable<TGetShopSettingsOutput["data"]>;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
function ShopConfig({ settings, callbacks }: ShopConfigProps) {
	const shopModeDetail = useMemo(() => {
		return ShopModeOptions.find((option) => option.value === settings?.modo)?.label ?? "NÃO DEFINIDO";
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
		<SectionWrapper title="CONFIGURAÇÕES DA LOJA" icon={<Settings className="w-4 h-4 min-w-4 min-h-4" />} wrapperClassName="h-full">
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

type ShopConfigProductsProps = {
	settings: NonNullable<TGetShopSettingsOutput["data"]>;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
function ShopConfigProducts({ settings, callbacks }: ShopConfigProductsProps) {
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
		<SectionWrapper title="PRODUTOS DISPONÍVEIS" icon={<ShoppingCart className="w-4 h-4 min-w-4 min-h-4" />} wrapperClassName="h-full">
			<div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-brand/10 rounded-lg p-3 text-brand">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" disabled={isPending} size="fit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
							{settings.configuracoes.produtos.modo === "ATIVOS" ? (
								<>
									<CircleCheck className="w-4 h-4" />
									<h3 className="text-sm font-semibold tracking-tighter">TODOS OS PRODUTOS</h3>
								</>
							) : settings.configuracoes.produtos.modo === "INCLUIR" ? (
								<>
									<ListIcon className="w-4 h-4" />
									<h3 className="text-sm font-semibold tracking-tighter">PRODUTOS SELECIONADOS</h3>
								</>
							) : (
								<>
									<XCircle className="w-4 h-4" />
									<h3 className="text-sm font-semibold tracking-tighter">PRODUTOS EXCLUÍDOS</h3>
								</>
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>MODO</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{ShopProductsModeOptions.map((option) => (
							<DropdownMenuItem
								key={option.value}
								onClick={() =>
									handleUpdateShopSettings({
										...settings,
										configuracoes: { ...settings.configuracoes, produtos: { ...settings.configuracoes.produtos, modo: option.value } },
									})
								}
							>
								{option.icon}
								{option.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				<p className="text-sm font-medium tracking-tighter">Exibindo todos os produtos ativos da organizacao.</p>
			</div>
		</SectionWrapper>
	);
}
