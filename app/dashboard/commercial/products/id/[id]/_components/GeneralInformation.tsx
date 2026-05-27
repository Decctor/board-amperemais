import { TGetProductsOutputById } from "@/app/api/products/route";
import { SectionWrapper, SectionWrapperDataRow } from "@/components/ui/section-wrapper";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { Tag, Code, LayoutGrid, Package, BadgeDollarSign, Pencil, Percent } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ControlPartialProduct from "@/components/Modals/Products/ControlPartialProduct";
import type { TAuthUserSession } from "@/lib/authentication/types";
type ProductGeneralInformationProps = {
	product: TGetProductsOutputById;
	sessionUser: TAuthUserSession["user"];
	sessionUserMembership: NonNullable<TAuthUserSession["membership"]>;
};
export default function ProductGeneralInformation({ product, sessionUser, sessionUserMembership }: ProductGeneralInformationProps) {
	const [editMenuIsOpen, setEditMenuIsOpen] = useState(false);
	return (
		<SectionWrapper
			icon={<LayoutGrid className="w-4" />}
			title="INFORMAÇÕES GERAIS DO PRODUTO"
			actions={
				<Button variant="ghost" size="xs" onClick={() => setEditMenuIsOpen(true)} className="flex items-center gap-1">
					<Pencil className="w-4 h-4 min-w-4 min-h-4" />
					EDITAR
				</Button>
			}
		>
			<div className="w-full flex flex-col gap-3">
				<h2 className="text-xs leading-none tracking-tight">DADOS DO PRODUTO</h2>
				<div className="w-full flex flex-col gap-1.5">
					<SectionWrapperDataRow icon={<Tag className="w-4 h-4" />} label="DESCRIÇÃO" value={product.descricao || "NÃO INFORMADO"} />
					<SectionWrapperDataRow icon={<Code className="w-4 h-4" />} label="CÓDIGO" value={product.codigo || "NÃO INFORMADO"} />
					<SectionWrapperDataRow icon={<Tag className="w-4 h-4" />} label="UNIDADE" value={product.unidade || "NÃO INFORMADO"} />
					<SectionWrapperDataRow icon={<Tag className="w-4 h-4" />} label="GRUPO" value={product.grupo || "NÃO INFORMADO"} />
				</div>
			</div>

			<div className="w-full flex flex-col gap-3">
				<h2 className="text-xs leading-none tracking-tight">PREÇOS</h2>
				<div className="w-full flex flex-col gap-1.5">
					<SectionWrapperDataRow
						icon={<BadgeDollarSign className="w-4 h-4" />}
						label="PREÇO DE CUSTO"
						value={product.precoCusto != null ? formatToMoney(product.precoCusto) : "NÃO INFORMADO"}
					/>
					<SectionWrapperDataRow
						icon={<BadgeDollarSign className="w-4 h-4" />}
						label="PREÇO DE VENDA"
						value={product.precoVenda != null ? formatToMoney(product.precoVenda) : "NÃO INFORMADO"}
					/>
					{product.precoVenda && product.precoCusto ? (
						<SectionWrapperDataRow
							icon={<Percent className="w-4 h-4" />}
							label="MARGEM DE LUCRO"
							value={formatToMoney(((product.precoVenda - product.precoCusto) / product.precoCusto) * 100)}
						/>
					) : null}
				</div>
			</div>
			{product.rastreamentoEstoqueAtivo ? (
				<div className="w-full flex flex-col gap-3">
					<h2 className="text-xs leading-none tracking-tight">ESTOQUE</h2>
					<div className="w-full flex flex-col gap-1.5">
						<SectionWrapperDataRow
							icon={<Package className="w-4 h-4" />}
							label="QUANTIDADE"
							value={product.quantidade != null ? formatDecimalPlaces(product.quantidade) : "NÃO INFORMADO"}
						/>
					</div>
				</div>
			) : null}
			{editMenuIsOpen ? (
				<ControlPartialProduct
					sessionUser={sessionUser}
					sessionUserMembership={sessionUserMembership}
					initialUpdateType="general"
					productId={product.id}
					closeModal={() => setEditMenuIsOpen(false)}
				/>
			) : null}
		</SectionWrapper>
	);
}
