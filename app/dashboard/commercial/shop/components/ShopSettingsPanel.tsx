"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/errors";
import { updateShopSettings } from "@/lib/mutations/shop";
import { useShopSettings } from "@/lib/queries/shop";
import type { TShopSettingsConfiguration } from "@/schemas/shop";
import { DEFAULT_SHOP_SETTINGS_CONFIGURATION } from "@/schemas/shop";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Loader2, Save, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ShopSettingsPanelProps = {
	settings: ReturnType<typeof useShopSettings>["data"];
};

export default function ShopSettingsPanel({ settings }: ShopSettingsPanelProps) {
	const queryClient = useQueryClient();
	const { queryKey } = useShopSettings();
	const [activeTab, setActiveTab] = useState<"geral" | "aparencia" | "produtos">("geral");
	const [ativo, setAtivo] = useState(settings?.ativo ?? false);
	const [modo, setModo] = useState<"CARDAPIO" | "CATALOGO">(settings?.modo ?? "CARDAPIO");
	const [configuracoes, setConfiguracoes] = useState<TShopSettingsConfiguration>(settings?.configuracoes ?? DEFAULT_SHOP_SETTINGS_CONFIGURATION);

	useEffect(() => {
		if (settings) {
			setAtivo(settings.ativo);
			setModo(settings.modo);
			setConfiguracoes(settings.configuracoes);
		}
	}, [settings]);

	const { mutate: saveSettings, isPending } = useMutation({
		mutationKey: ["update-shop-settings"],
		mutationFn: updateShopSettings,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const handleSave = () => {
		if (!configuracoes.aceitaRetirada && !configuracoes.aceitaEntrega) {
			toast.error("Selecione pelo menos uma modalidade: retirada ou entrega.");
			return;
		}

		if (configuracoes.produtos.modo === "INCLUIR" && configuracoes.produtos.produtoIds.length === 0) {
			toast.error("Selecione pelo menos um produto para o modo 'Incluir selecionados'.");
			return;
		}

		saveSettings({ ativo, modo, configuracoes });
	};

	const updateConfig = useCallback(<K extends keyof TShopSettingsConfiguration>(key: K, value: TShopSettingsConfiguration[K]) => {
		setConfiguracoes((prev) => ({ ...prev, [key]: value }));
	}, []);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Configuracoes</CardTitle>
					<CardDescription>Personalize sua loja digital</CardDescription>
				</div>
				<Button onClick={handleSave} disabled={isPending} className="gap-2">
					{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
					Salvar
				</Button>
			</CardHeader>

			<CardContent className="flex flex-col gap-6">
				<div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
					<div className="flex flex-col gap-1">
						<Label className="font-semibold">Status da loja</Label>
						<p className="text-sm text-muted-foreground">{ativo ? "Sua loja esta ativa e visivel." : "Sua loja esta inativa."}</p>
					</div>
					<Switch checked={ativo} onCheckedChange={setAtivo} />
				</div>

				<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "geral" | "aparencia" | "produtos")} className="w-full">
					<TabsList className="w-full justify-start">
						<TabsTrigger value="geral">Geral</TabsTrigger>
						<TabsTrigger value="aparencia">Aparencia</TabsTrigger>
						<TabsTrigger value="produtos">Produtos</TabsTrigger>
					</TabsList>

					<TabsContent value="geral" className="flex flex-col gap-4 mt-4">
						<div className="flex flex-col gap-3">
							<Label className="font-semibold">Modo da loja</Label>
							<div className="grid grid-cols-2 gap-3">
								<button
									type="button"
									onClick={() => setModo("CARDAPIO")}
									className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
										modo === "CARDAPIO" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
									}`}
								>
									<span className={`font-semibold ${modo === "CARDAPIO" && "text-primary"}`}>Cardapio</span>
									<span className="text-xs text-muted-foreground text-center">Ideal para restaurantes e delivery</span>
								</button>

								<button
									type="button"
									onClick={() => setModo("CATALOGO")}
									className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
										modo === "CATALOGO" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
									}`}
								>
									<span className={`font-semibold ${modo === "CATALOGO" && "text-primary"}`}>Catalogo</span>
									<span className="text-xs text-muted-foreground text-center">Ideal para lojas e ecommerce</span>
								</button>
							</div>
						</div>

						<div className="flex flex-col gap-3">
							<Label className="font-semibold">Modalidades de entrega</Label>
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between p-3 rounded-lg border">
									<Label htmlFor="aceita-retirada" className="cursor-pointer">
										Aceita retirada
									</Label>
									<Switch id="aceita-retirada" checked={configuracoes.aceitaRetirada} onCheckedChange={(checked) => updateConfig("aceitaRetirada", checked)} />
								</div>
								<div className="flex items-center justify-between p-3 rounded-lg border">
									<Label htmlFor="aceita-entrega" className="cursor-pointer">
										Aceita entrega
									</Label>
									<Switch id="aceita-entrega" checked={configuracoes.aceitaEntrega} onCheckedChange={(checked) => updateConfig("aceitaEntrega", checked)} />
								</div>
							</div>
							{!configuracoes.aceitaRetirada && !configuracoes.aceitaEntrega && <p className="text-xs text-red-500">Selecione pelo menos uma opcao.</p>}
						</div>
					</TabsContent>

					<TabsContent value="aparencia" className="flex flex-col gap-4 mt-4">
						<div className="flex flex-col gap-3">
							<Label className="font-semibold">Capa do cabecalho</Label>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => updateConfig("headerCoverTipo", "IMAGEM")}
									className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
										configuracoes.headerCoverTipo === "IMAGEM" ? "border-primary bg-primary/5" : "border-border"
									}`}
								>
									<ImageIcon className="w-4 h-4" />
									<span className="text-sm font-medium">Imagem</span>
								</button>
								<button
									type="button"
									onClick={() => updateConfig("headerCoverTipo", "VIDEO")}
									className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
										configuracoes.headerCoverTipo === "VIDEO" ? "border-primary bg-primary/5" : "border-border"
									}`}
								>
									<Video className="w-4 h-4" />
									<span className="text-sm font-medium">Video</span>
								</button>
							</div>
							<Input
								placeholder="URL da imagem ou video"
								value={configuracoes.headerCoverUrl || ""}
								onChange={(e) => updateConfig("headerCoverUrl", e.target.value || null)}
							/>
							{configuracoes.headerCoverUrl && (
								<div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
									{configuracoes.headerCoverTipo === "VIDEO" ? (
										<video src={configuracoes.headerCoverUrl} className="w-full h-full object-cover" muted autoPlay loop />
									) : (
										<img src={configuracoes.headerCoverUrl} alt="Preview" className="w-full h-full object-cover" />
									)}
								</div>
							)}
						</div>

						<div className="flex flex-col gap-3">
							<Label className="font-semibold">Blocos de composicao</Label>
							<div className="flex flex-col gap-2">
								{configuracoes.blocosComposicao.map((bloco, index) => (
									<div key={bloco.tipo} className="flex items-center justify-between p-3 rounded-lg border">
										<Label className="cursor-pointer">
											{bloco.tipo === "EM_DESTAQUE" ? "Em destaque" : bloco.tipo === "MAIS_PEDIDOS" ? "Mais pedidos" : "Grupos de produtos"}
										</Label>
										<Switch
											checked={bloco.ativo}
											onCheckedChange={(checked) => {
												const newBlocos = [...configuracoes.blocosComposicao];
												newBlocos[index] = { ...bloco, ativo: checked };
												updateConfig("blocosComposicao", newBlocos);
											}}
										/>
									</div>
								))}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="produtos" className="flex flex-col gap-4 mt-4">
						<div className="flex flex-col gap-3">
							<Label className="font-semibold">Modo de exibicao de produtos</Label>
							<div className="flex flex-col gap-2">
								<button
									type="button"
									onClick={() => updateConfig("produtos", { ...configuracoes.produtos, modo: "ATIVOS" })}
									className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-colors text-left ${
										configuracoes.produtos.modo === "ATIVOS" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
									}`}
								>
									<span className="font-semibold text-sm">Todos ativos</span>
									<span className="text-xs text-muted-foreground">Exibe todos os produtos ativos da organizacao.</span>
								</button>

								<button
									type="button"
									onClick={() => updateConfig("produtos", { ...configuracoes.produtos, modo: "INCLUIR" })}
									className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-colors text-left ${
										configuracoes.produtos.modo === "INCLUIR" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
									}`}
								>
									<span className="font-semibold text-sm">Incluir selecionados</span>
									<span className="text-xs text-muted-foreground">Exibe apenas os produtos selecionados.</span>
								</button>

								<button
									type="button"
									onClick={() => updateConfig("produtos", { ...configuracoes.produtos, modo: "EXCLUIR" })}
									className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-colors text-left ${
										configuracoes.produtos.modo === "EXCLUIR" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
									}`}
								>
									<span className="font-semibold text-sm">Excluir selecionados</span>
									<span className="text-xs text-muted-foreground">Exibe todos exceto os selecionados.</span>
								</button>
							</div>

							{configuracoes.produtos.modo !== "ATIVOS" && (
								<div className="p-3 rounded-lg bg-muted/50 border">
									<p className="text-sm text-muted-foreground">Selecao de produtos disponivel na pagina de produtos.</p>
								</div>
							)}
						</div>

						<div className="flex flex-col gap-3">
							<Label className="font-semibold">Produtos em destaque</Label>
							<p className="text-sm text-muted-foreground">Configure os produtos em destaque na pagina de produtos.</p>
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
