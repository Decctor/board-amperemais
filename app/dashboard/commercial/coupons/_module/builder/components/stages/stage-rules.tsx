"use client";

import TextareaInput from "@/components/Inputs/TextareaInput";
import CouponTargetsBlock from "@/components/Modals/Coupons/Blocks/Targets";
import type { TCouponBenefitScopeEnum, TCouponValidationModeEnum } from "@/schemas/enums";
import { ClipboardCheck, Package, ShoppingCart, Sparkles } from "lucide-react";
import { benefitIsItemScoped } from "../../helpers/benefits";
import { useBuilderCoupon } from "../builder-provider";
import ChoiceCards from "../choice-cards";

export default function StageRules() {
	const { state, updateCoupon, addCouponTarget, updateCouponTarget, removeCouponTarget } = useBuilderCoupon();
	const { coupon, couponTargets } = state;
	const itemScoped = benefitIsItemScoped(coupon.beneficioTipo);

	return (
		<div className="flex w-full flex-col gap-5">
			<ChoiceCards<TCouponValidationModeEnum>
				label="Como o resgate é validado?"
				value={coupon.validacaoModo}
				onChange={(value) => updateCoupon({ validacaoModo: value })}
				options={[
					{ value: "AUTOMATICA", label: "Automática", description: "O sistema confere as regras e aplica o desconto sozinho.", icon: Sparkles },
					{ value: "MANUAL", label: "Manual, no balcão", description: "O operador lê as condições e confere na hora do resgate.", icon: ClipboardCheck },
				]}
			/>

			{coupon.validacaoModo === "MANUAL" ? (
				<TextareaInput
					value={coupon.condicoesTexto ?? ""}
					label="CONDIÇÕES DE RESGATE"
					placeholder="Ex: Desconto válido apenas em calças. O operador deve conferir se há uma calça na compra..."
					handleChange={(value) => updateCoupon({ condicoesTexto: value })}
				/>
			) : (
				<>
					{itemScoped ? (
						<p className="text-xs font-medium text-muted-foreground">Este benefício vale sobre os produtos que você escolher abaixo.</p>
					) : (
						<ChoiceCards<TCouponBenefitScopeEnum>
							label="Onde o desconto vale?"
							value={coupon.beneficioAplicacao}
							onChange={(value) => updateCoupon({ beneficioAplicacao: value })}
							options={[
								{ value: "VENDA_TOTAL", label: "Na compra toda", description: "O desconto incide sobre o valor total da venda.", icon: ShoppingCart },
								{ value: "ITENS_ELEGIVEIS", label: "Em produtos específicos", description: "O desconto incide só sobre os produtos que você escolher.", icon: Package },
							]}
						/>
					)}
					<CouponTargetsBlock
						coupon={coupon}
						couponTargets={couponTargets}
						updateCoupon={updateCoupon}
						addCouponTarget={addCouponTarget}
						updateCouponTarget={updateCouponTarget}
						removeCouponTarget={removeCouponTarget}
					/>
				</>
			)}
		</div>
	);
}
