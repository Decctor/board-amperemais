import CheckboxInput from "@/components/Inputs/CheckboxInput";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useUsers } from "@/lib/queries/users";
import { resolveDiscountAuthority } from "@/lib/permissions/discounts";
import type { TDiscountLimitTypeEnum } from "@/schemas/enums";
import type { TUseUserState } from "@/state-hooks/use-user-state";
import { Shield } from "lucide-react";
import PermissionsScope from "./Utils/PermissionsScope";

type UsersPermissionsBlockProps = {
	userId?: string;
	permissionsHolder: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
	organizationHasERPAccess: boolean;
};
export default function UsersPermissionsBlock({
	userId,
	permissionsHolder,
	updateUserPermissions,
	organizationHasERPAccess,
}: UsersPermissionsBlockProps) {
	return (
		<ResponsiveMenuSection title="PERMISSÕES" icon={<Shield className="h-4 min-h-4 w-4 min-w-4" />}>
			<CompanyPermissions permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			<ResultsPermissions userId={userId} permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			<GoalsPermissions permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			<UsersPermissions permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			<ChatServicesPermissions permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			{organizationHasERPAccess ? (
				<>
					<SalesPermissions permissions={permissionsHolder} updateUserPermissions={updateUserPermissions} />
					<SalesDiscountsPermissions permissions={permissionsHolder} updateUserPermissions={updateUserPermissions} />
					<PurchasesPermissions permissions={permissionsHolder} updateUserPermissions={updateUserPermissions} />
					<FiscalPermissions permissions={permissionsHolder} updateUserPermissions={updateUserPermissions} />
					<FinancesPermissions permissions={permissionsHolder} updateUserPermissions={updateUserPermissions} />
				</>
			) : null}
		</ResponsiveMenuSection>
	);
}

type CompanyPermissionsProps = {
	permissionsHolder: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function CompanyPermissions({ permissionsHolder, updateUserPermissions }: CompanyPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-1">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE EMPRESA</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR EMPRESA"
					labelFalse="APTO A VISUALIZAR EMPRESA"
					checked={permissionsHolder.empresa.visualizar}
					handleChange={(value) => updateUserPermissions({ empresa: { ...permissionsHolder.empresa, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR EMPRESA"
					labelFalse="APTO A EDITAR EMPRESA"
					checked={permissionsHolder.empresa.editar}
					handleChange={(value) => updateUserPermissions({ empresa: { ...permissionsHolder.empresa, editar: value } })}
				/>
			</div>
		</div>
	);
}
type ResultsPermissionsProps = {
	userId?: string;
	permissionsHolder: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function ResultsPermissions({ userId, permissionsHolder, updateUserPermissions }: ResultsPermissionsProps) {
	const { data: users } = useUsers({ initialFilters: {} });
	return (
		<div className="w-full flex flex-col gap-1">
			<div className="w-full flex flex-col items-start gap-1">
				<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE RESULTADOS</h2>
				<PermissionsScope
					referenceId={userId || null}
					options={users?.map((user) => ({ id: user.id, label: user.nome, value: user.id })) || []}
					selected={permissionsHolder.resultados.escopo ?? null}
					handleScopeSelection={(value) => updateUserPermissions({ resultados: { ...permissionsHolder.resultados, escopo: value as string[] } })}
				/>
			</div>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR RESULTADOS"
					labelFalse="APTO A VISUALIZAR RESULTADOS"
					checked={permissionsHolder.resultados.visualizar}
					handleChange={(value) => updateUserPermissions({ resultados: { ...permissionsHolder.resultados, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR DADOS SENSÍVEIS"
					labelFalse="APTO A VISUALIZAR DADOS SENSÍVEIS"
					checked={permissionsHolder.resultados.visualizarSensiveis}
					handleChange={(value) => updateUserPermissions({ resultados: { ...permissionsHolder.resultados, visualizarSensiveis: value } })}
				/>
			</div>
		</div>
	);
}

type GoalsPermissionsProps = {
	permissionsHolder: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function GoalsPermissions({ permissionsHolder, updateUserPermissions }: GoalsPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-1">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE METAS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A CRIAR METAS"
					labelFalse="APTO A CRIAR METAS"
					checked={permissionsHolder.resultados.criarMetas}
					handleChange={(value) => updateUserPermissions({ resultados: { ...permissionsHolder.resultados, criarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR METAS"
					labelFalse="APTO A VISUALIZAR METAS"
					checked={permissionsHolder.resultados.visualizarMetas}
					handleChange={(value) => updateUserPermissions({ resultados: { ...permissionsHolder.resultados, visualizarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR METAS"
					labelFalse="APTO A EDITAR METAS"
					checked={permissionsHolder.resultados.editarMetas}
					handleChange={(value) => updateUserPermissions({ resultados: { ...permissionsHolder.resultados, editarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR METAS"
					labelFalse="APTO A EXCLUIR METAS"
					checked={permissionsHolder.resultados.excluirMetas}
					handleChange={(value) => updateUserPermissions({ resultados: { ...permissionsHolder.resultados, excluirMetas: value } })}
				/>
			</div>
		</div>
	);
}

type UsersPermissionsProps = {
	permissionsHolder: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function UsersPermissions({ permissionsHolder, updateUserPermissions }: UsersPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-1">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE USUÁRIOS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR USUÁRIOS"
					labelFalse="APTO A VISUALIZAR USUÁRIOS"
					checked={permissionsHolder.usuarios.visualizar}
					handleChange={(value) => updateUserPermissions({ usuarios: { ...permissionsHolder.usuarios, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CRIAR USUÁRIOS"
					labelFalse="APTO A CRIAR USUÁRIOS"
					checked={permissionsHolder.usuarios.criar}
					handleChange={(value) => updateUserPermissions({ usuarios: { ...permissionsHolder.usuarios, criar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR USUÁRIOS"
					labelFalse="APTO A EDITAR USUÁRIOS"
					checked={permissionsHolder.usuarios.editar}
					handleChange={(value) => updateUserPermissions({ usuarios: { ...permissionsHolder.usuarios, editar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR USUÁRIOS"
					labelFalse="APTO A EXCLUIR USUÁRIOS"
					checked={permissionsHolder.usuarios.excluir}
					handleChange={(value) => updateUserPermissions({ usuarios: { ...permissionsHolder.usuarios, excluir: value } })}
				/>
			</div>
		</div>
	);
}

type ChatServicesPermissionsProps = {
	permissionsHolder: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function ChatServicesPermissions({ permissionsHolder, updateUserPermissions }: ChatServicesPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-1">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE ATENDIMENTOS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR ATENDIMENTOS"
					labelFalse="APTO A VISUALIZAR ATENDIMENTOS"
					checked={permissionsHolder.atendimentos.visualizar}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...permissionsHolder.atendimentos, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A INICIAR ATENDIMENTOS"
					labelFalse="APTO A INICIAR ATENDIMENTOS"
					checked={permissionsHolder.atendimentos.iniciar}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...permissionsHolder.atendimentos, iniciar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A RESPONDER ATENDIMENTOS"
					labelFalse="APTO A RESPONDER ATENDIMENTOS"
					checked={permissionsHolder.atendimentos.responder}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...permissionsHolder.atendimentos, responder: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A FINALIZAR ATENDIMENTOS"
					labelFalse="APTO A FINALIZAR ATENDIMENTOS"
					checked={permissionsHolder.atendimentos.finalizar}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...permissionsHolder.atendimentos, finalizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A RECEBER TRANSFERÊNCIAS DE ATENDIMENTOS"
					labelFalse="APTO A RECEBER TRANSFERÊNCIAS DE ATENDIMENTOS"
					checked={!!permissionsHolder.atendimentos.receberTransferencias}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...permissionsHolder.atendimentos, receberTransferencias: value } })}
				/>
			</div>
		</div>
	);
}

type SalesPermissionsProps = {
	permissions: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function SalesPermissions({ permissions, updateUserPermissions }: SalesPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE VENDAS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR VENDAS"
					labelFalse="APTO A VISUALIZAR VENDAS"
					checked={permissions.vendas.visualizar}
					handleChange={(value) => updateUserPermissions({ vendas: { ...permissions.vendas, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CRIAR VENDAS"
					labelFalse="APTO A CRIAR VENDAS"
					checked={permissions.vendas.criar}
					handleChange={(value) => updateUserPermissions({ vendas: { ...permissions.vendas, criar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR VENDAS"
					labelFalse="APTO A EDITAR VENDAS"
					checked={permissions.vendas.editar}
					handleChange={(value) => updateUserPermissions({ vendas: { ...permissions.vendas, editar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR VENDAS"
					labelFalse="APTO A EXCLUIR VENDAS"
					checked={permissions.vendas.excluir}
					handleChange={(value) => updateUserPermissions({ vendas: { ...permissions.vendas, excluir: value } })}
				/>
			</div>
		</div>
	);
}

type SalesDiscountsPermissionsProps = {
	permissions: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function SalesDiscountsPermissions({ permissions, updateUserPermissions }: SalesDiscountsPermissionsProps) {
	// Membros legados podem não ter o bloco `descontos` no jsonb: resolve a semântica de ausência
	// (liberado sem teto) e materializa o bloco completo ao primeiro toque em qualquer campo.
	const descontos = resolveDiscountAuthority(permissions);
	const updateDescontos = (updates: Partial<typeof descontos>) =>
		updateUserPermissions({ vendas: { ...permissions.vendas, descontos: { ...descontos, ...updates } } });
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE DESCONTOS (VENDAS)</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A APLICAR DESCONTOS"
					labelFalse="APTO A APLICAR DESCONTOS"
					checked={descontos.aplicar}
					handleChange={(value) => updateDescontos({ aplicar: value })}
				/>
				{descontos.aplicar ? (
					<div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2">
						<SelectInput
							label="TIPO DO LIMITE DE DESCONTO"
							value={descontos.limiteTipo}
							options={[
								{ id: "FIXO", value: "FIXO", label: "VALOR FIXO (R$)" },
								{ id: "PERCENTUAL", value: "PERCENTUAL", label: "PERCENTUAL (%)" },
							]}
							resetOptionLabel="SEM LIMITE"
							handleChange={(value) => updateDescontos({ limiteTipo: value as TDiscountLimitTypeEnum, limiteValor: descontos.limiteValor ?? 0 })}
							onReset={() => updateDescontos({ limiteTipo: null, limiteValor: null })}
						/>
						{descontos.limiteTipo ? (
							<NumberInput
								label={descontos.limiteTipo === "PERCENTUAL" ? "LIMITE DE DESCONTO (%)" : "LIMITE DE DESCONTO (R$)"}
								placeholder={descontos.limiteTipo === "PERCENTUAL" ? "Ex: 5 (para 5%)" : "Ex: 20,00"}
								value={descontos.limiteValor}
								handleChange={(value) => updateDescontos({ limiteValor: Math.max(0, value) })}
							/>
						) : null}
					</div>
				) : (
					<p className="text-[0.65rem] text-muted-foreground">Sem esta permissão, qualquer desconto aplicado por este membro exigirá aprovação.</p>
				)}
				<CheckboxInput
					labelTrue="APTO A APROVAR DESCONTOS DE TERCEIROS"
					labelFalse="APTO A APROVAR DESCONTOS DE TERCEIROS"
					checked={descontos.aprovar}
					handleChange={(value) => updateDescontos({ aprovar: value })}
				/>
			</div>
		</div>
	);
}

type PurchasesPermissionsProps = {
	permissions: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function PurchasesPermissions({ permissions, updateUserPermissions }: PurchasesPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE COMPRAS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR COMPRAS"
					labelFalse="APTO A VISUALIZAR COMPRAS"
					checked={permissions.compras.visualizar}
					handleChange={(value) => updateUserPermissions({ compras: { ...permissions.compras, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CRIAR COMPRAS"
					labelFalse="APTO A CRIAR COMPRAS"
					checked={permissions.compras.criar}
					handleChange={(value) => updateUserPermissions({ compras: { ...permissions.compras, criar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR COMPRAS"
					labelFalse="APTO A EDITAR COMPRAS"
					checked={permissions.compras.editar}
					handleChange={(value) => updateUserPermissions({ compras: { ...permissions.compras, editar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR COMPRAS"
					labelFalse="APTO A EXCLUIR COMPRAS"
					checked={permissions.compras.excluir}
					handleChange={(value) => updateUserPermissions({ compras: { ...permissions.compras, excluir: value } })}
				/>
			</div>
		</div>
	);
}

type FiscalPermissionsProps = {
	permissions: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function FiscalPermissions({ permissions, updateUserPermissions }: FiscalPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DO MÓDULO FISCAL</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR RECURSOS"
					labelFalse="APTO A VISUALIZAR RECURSOS"
					checked={permissions.fiscal.visualizar}
					handleChange={(value) => updateUserPermissions({ fiscal: { ...permissions.fiscal, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CONFIGURAR RECURSOS"
					labelFalse="APTO A CONFIGURAR RECURSOS"
					checked={permissions.fiscal.configurar}
					handleChange={(value) => updateUserPermissions({ fiscal: { ...permissions.fiscal, configurar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EMISSÃO DE DOCUMENTOS FISCAIS"
					labelFalse="APTO A EMISSÃO DE DOCUMENTOS FISCAIS"
					checked={permissions.fiscal.emitir}
					handleChange={(value) => updateUserPermissions({ fiscal: { ...permissions.fiscal, emitir: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CANCELAR DOCUMENTOS FISCAIS"
					labelFalse="APTO A CANCELAR DOCUMENTOS FISCAIS"
					checked={permissions.fiscal.cancelar}
					handleChange={(value) => updateUserPermissions({ fiscal: { ...permissions.fiscal, cancelar: value } })}
				/>
			</div>
		</div>
	);
}

type FinancesPermissionsProps = {
	permissions: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
function FinancesPermissions({ permissions, updateUserPermissions }: FinancesPermissionsProps) {
	// A ausência da chave `financeiro` (JSONB antigo) cai para as permissões de empresa, mesma regra de lib/permissions/finances.ts
	const financeiro = {
		visualizar: permissions.financeiro?.visualizar ?? permissions.empresa.visualizar,
		criar: permissions.financeiro?.criar ?? permissions.empresa.editar,
		editar: permissions.financeiro?.editar ?? permissions.empresa.editar,
		conciliar: permissions.financeiro?.conciliar ?? permissions.empresa.editar,
	};
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DO FINANCEIRO</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR O FINANCEIRO"
					labelFalse="APTO A VISUALIZAR O FINANCEIRO"
					checked={financeiro.visualizar}
					handleChange={(value) => updateUserPermissions({ financeiro: { ...financeiro, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CRIAR LANÇAMENTOS FINANCEIROS"
					labelFalse="APTO A CRIAR LANÇAMENTOS FINANCEIROS"
					checked={financeiro.criar}
					handleChange={(value) => updateUserPermissions({ financeiro: { ...financeiro, criar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR LANÇAMENTOS FINANCEIROS"
					labelFalse="APTO A EDITAR LANÇAMENTOS FINANCEIROS"
					checked={financeiro.editar}
					handleChange={(value) => updateUserPermissions({ financeiro: { ...financeiro, editar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A REALIZAR CONCILIAÇÃO BANCÁRIA"
					labelFalse="APTO A REALIZAR CONCILIAÇÃO BANCÁRIA"
					checked={financeiro.conciliar}
					handleChange={(value) => updateUserPermissions({ financeiro: { ...financeiro, conciliar: value } })}
				/>
			</div>
		</div>
	);
}
