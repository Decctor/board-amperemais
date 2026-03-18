import { Button } from "@/components/ui/button";
import { Table, TableCaption, TableCell, TableRow, TableHead, TableHeader, TableBody, TableFooter } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatToMoney } from "@/lib/formatting";
import { TUsePurchaseState } from "@/state-hooks/use-purchase-state";
import { BoxIcon, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import NewPurchaseItem from "./Utils/NewPurchaseItem";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

type PurchaseItemsBlockProps = {
	purchaseItems: TUsePurchaseState["state"]["purchaseItems"];
	addPurchaseItem: TUsePurchaseState["addPurchaseItem"];
	updatePurchaseItem: TUsePurchaseState["updatePurchaseItem"];
	removePurchaseItem: TUsePurchaseState["removePurchaseItem"];
};
export default function PurchaseItemsBlock({ purchaseItems, addPurchaseItem, updatePurchaseItem, removePurchaseItem }: PurchaseItemsBlockProps) {
	const [newUpdateMenuIsOpen, setNewUpdateMenuIsOpen] = useState(false);
	return (
		<ResponsiveMenuSection title="ITENS" icon={<ShoppingCart className="h-4 min-h-4 w-4 min-w-4" />}>
			<Table className="w-full table-fixed overflow-hidden rounded-lg border">
				<colgroup>
					<col style={{ width: "40%" }} />
					<col style={{ width: "20%" }} />
					<col style={{ width: "20%" }} />
					<col style={{ width: "20%" }} />
				</colgroup>
				<TableCaption>A lista de produtos que compõe essa compra.</TableCaption>
				<TableHeader className="bg-accent/60">
					<TableRow className="hover:bg-accent/60">
						<TableHead className="w-[40%] font-semibold text-accent-foreground text-center align-middle">PRODUTO</TableHead>
						<TableHead className="w-[20%] font-semibold text-accent-foreground text-center align-middle">QUANTIDADE</TableHead>
						<TableHead className="w-[20%] font-semibold text-accent-foreground text-center align-middle">CUSTO UNITÁRIO</TableHead>
						<TableHead className="w-[20%] font-semibold text-accent-foreground text-center align-middle">VALOR TOTAL</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{purchaseItems.map((item, index) => (
						<PurchaseItemRow
							key={index}
							item={item}
							updatePurchaseItem={(changes) => updatePurchaseItem({ index, item: changes })}
							removePurchase={() => removePurchaseItem({ index })}
						/>
					))}
				</TableBody>
				<TableFooter>
					<TableRow className="hover:bg-transparent">
						<TableCell colSpan={4} className="p-1.5">
							<div className="flex w-full items-center justify-center">
								<Button
									onClick={() => setNewUpdateMenuIsOpen((prev) => !prev)}
									size="fit"
									variant="ghost"
									className="flex items-center gap-1 px-2 py-1 text-xs"
								>
									<Plus className="w-4 h-4 min-w-4 min-h-4" />
									ADICIONAR ITEM
								</Button>
							</div>
						</TableCell>
					</TableRow>
				</TableFooter>
			</Table>
			{newUpdateMenuIsOpen ? <NewPurchaseItem addPurchaseItem={addPurchaseItem} closeMenu={() => setNewUpdateMenuIsOpen(false)} /> : null}
		</ResponsiveMenuSection>
	);
}

type PurchaseItemRowProps = {
	item: TUsePurchaseState["state"]["purchaseItems"][number];
	updatePurchaseItem: (info: Parameters<TUsePurchaseState["updatePurchaseItem"]>[0]["item"]) => void;
	removePurchase: () => void;
};
function PurchaseItemRow({ item, updatePurchaseItem: _updatePurchaseItem, removePurchase: _removePurchase }: PurchaseItemRowProps) {
	const descontosTotal = Number(item.descontosTotal) || 0;
	const acrescimosTotal = Number(item.acrescimosTotal) || 0;
	const valorTotalBruto = Number(item.valorTotalBruto) || 0;
	const valorTotalLiquido = Number(item.valorTotalLiquido) || valorTotalBruto - descontosTotal + acrescimosTotal;

	return (
		<TableRow>
			<TableCell className="w-[40%]">
				<div className="flex min-w-0 items-center gap-1.5">
					{item.produto.imagemCapaUrl ? (
						<div className="relative aspect-square w-6 h-6 max-w-6 max-h-6 min-w-6 min-h-6 rounded-lg overflow-hidden">
							<Image src={item.produto.imagemCapaUrl} alt={item.produto.descricao} fill={true} objectFit="cover" />
						</div>
					) : (
						<div className="relative aspect-square w-6 h-6 max-w-6 max-h-6 min-w-6 min-h-6 rounded-lg overflow-hidden">
							<BoxIcon className="w-4 h-4" />
						</div>
					)}

					<p className="grow truncate text-sm font-medium">{item.produto.descricao}</p>
				</div>
			</TableCell>
			<TableCell className="w-[20%] text-center">{item.quantidade}</TableCell>
			<TableCell className="w-[20%] text-center">{formatToMoney(item.valorUnitarioBruto)}</TableCell>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<TableCell className="w-[20%] text-center">{formatToMoney(valorTotalLiquido)}</TableCell>
					</TooltipTrigger>
					<TooltipContent side="top" align="end" className="w-64 rounded-lg border p-3">
						<div className="flex flex-col gap-2 text-xs">
							<div className="flex flex-col">
								<p className="font-semibold">DETALHAMENTO DO ITEM</p>
								<p className="text-xs">{item.produto.descricao}</p>
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<span>TOTAL BRUTO</span>
								<span className="font-semibold px-1.5 py-0.5">{formatToMoney(valorTotalBruto)}</span>
							</div>
							<div className="flex items-center justify-between">
								<span>DESCONTOS</span>
								<span className="inline-flex items-center rounded-full border border-green-600 bg-green-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-green-700">
									-{formatToMoney(descontosTotal, "")}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span>ACRÉSCIMOS</span>
								<span className="inline-flex items-center rounded-full border border-red-600 bg-red-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-red-700">
									+{formatToMoney(acrescimosTotal, "")}
								</span>
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<span className="font-medium">TOTAL LÍQUIDO</span>
								<span className="font-semibold">{formatToMoney(valorTotalLiquido)}</span>
							</div>
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</TableRow>
	);
}
