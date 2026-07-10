import CheckboxInput from "@/components/Inputs/CheckboxInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useUsers } from "@/lib/queries/users";
import { resolveDiscountAuthority } from "@/lib/permissions/discounts";
import type { TDiscountLimitTypeEnum } from "@/schemas/enums";
import type { TUseOrganizationMembershipInvitationState } from "@/state-hooks/use-organization-membership-invitation-state";
import { Shield } from "lucide-react";
import PermissionsScope from "../../Users/Blocks/Utils/PermissionsScope";

type OrganizationsMembershipInvitationsPermissionsBlockProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
	organizationHasERPAccess: boolean;
};
export default function OrganizationsMembershipInvitationsPermissionsBlock({
	permissions,
	updateInvitationPermissions,
	organizationHasERPAccess,
}: OrganizationsMembershipInvitationsPermissionsBlockProps) {
	return (
		<ResponsiveMenuSection title="PERMISSÕES" icon={<Shield className="h-4 min-h-4 w-4 min-w-4" />}>
			<CompanyPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			<ResultsPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			<GoalsPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			<UsersPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			<ChatServicesPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			{organizationHasERPAccess ? (
				<>
					<SalesPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
					<SalesDiscountsPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
					<PurchasesPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
					<FiscalPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
				</>
			) : null}
		</ResponsiveMenuSection>
	);
}

type CompanyPermissionsProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function CompanyPermissions({ permissions, updateInvitationPermissions }: CompanyPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE EMPRESA</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR EMPRESA"
					labelFalse="APTO A VISUALIZAR EMPRESA"
					checked={permissions.empresa.visualizar}
					handleChange={(value) => updateInvitationPermissions({ empresa: { ...permissions.empresa, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR EMPRESA"
					labelFalse="APTO A EDITAR EMPRESA"
					checked={permissions.empresa.editar}
					handleChange={(value) => updateInvitationPermissions({ empresa: { ...permissions.empresa, editar: value } })}
				/>
			</div>
		</div>
	);
}
type ResultsPermissionsProps = {
	userId?: string;
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function ResultsPermissions({ userId, permissions, updateInvitationPermissions }: ResultsPermissionsProps) {
	const { data: users } = useUsers({ initialFilters: {} });
	return (
		<div className="w-full flex flex-col gap-2">
			<div className="w-full flex flex-col items-start gap-1">
				<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE RESULTADOS</h2>
				<PermissionsScope
					referenceId={userId || null}
					options={users?.map((user) => ({ id: user.id, label: user.nome, value: user.id })) || []}
					selected={permissions.resultados.escopo ?? null}
					handleScopeSelection={(value) => updateInvitationPermissions({ resultados: { ...permissions.resultados, escopo: value as string[] } })}
				/>
			</div>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR RESULTADOS"
					labelFalse="APTO A VISUALIZAR RESULTADOS"
					checked={permissions.resultados.visualizar}
					handleChange={(value) => updateInvitationPermissions({ resultados: { ...permissions.resultados, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR DADOS SENSÍVEIS"
					labelFalse="APTO A VISUALIZAR DADOS SENSÍVEIS"
					checked={permissions.resultados.visualizarSensiveis}
					handleChange={(value) => updateInvitationPermissions({ resultados: { ...permissions.resultados, visualizarSensiveis: value } })}
				/>
			</div>
		</div>
	);
}

type GoalsPermissionsProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function GoalsPermissions({ permissions, updateInvitationPermissions }: GoalsPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE METAS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A CRIAR METAS"
					labelFalse="APTO A CRIAR METAS"
					checked={permissions.resultados.criarMetas}
					handleChange={(value) => updateInvitationPermissions({ resultados: { ...permissions.resultados, criarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR METAS"
					labelFalse="APTO A VISUALIZAR METAS"
					checked={permissions.resultados.visualizarMetas}
					handleChange={(value) => updateInvitationPermissions({ resultados: { ...permissions.resultados, visualizarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR METAS"
					labelFalse="APTO A EDITAR METAS"
					checked={permissions.resultados.editarMetas}
					handleChange={(value) => updateInvitationPermissions({ resultados: { ...permissions.resultados, editarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR METAS"
					labelFalse="APTO A EXCLUIR METAS"
					checked={permissions.resultados.excluirMetas}
					handleChange={(value) => updateInvitationPermissions({ resultados: { ...permissions.resultados, excluirMetas: value } })}
				/>
			</div>
		</div>
	);
}

type UsersPermissionsProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function UsersPermissions({ permissions, updateInvitationPermissions }: UsersPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE USUÁRIOS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR USUÁRIOS"
					labelFalse="APTO A VISUALIZAR USUÁRIOS"
					checked={permissions.usuarios.visualizar}
					handleChange={(value) => updateInvitationPermissions({ usuarios: { ...permissions.usuarios, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CRIAR USUÁRIOS"
					labelFalse="APTO A CRIAR USUÁRIOS"
					checked={permissions.usuarios.criar}
					handleChange={(value) => updateInvitationPermissions({ usuarios: { ...permissions.usuarios, criar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR USUÁRIOS"
					labelFalse="APTO A EDITAR USUÁRIOS"
					checked={permissions.usuarios.editar}
					handleChange={(value) => updateInvitationPermissions({ usuarios: { ...permissions.usuarios, editar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR USUÁRIOS"
					labelFalse="APTO A EXCLUIR USUÁRIOS"
					checked={permissions.usuarios.excluir}
					handleChange={(value) => updateInvitationPermissions({ usuarios: { ...permissions.usuarios, excluir: value } })}
				/>
			</div>
		</div>
	);
}

type ChatServicesPermissionsProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function ChatServicesPermissions({ permissions, updateInvitationPermissions }: ChatServicesPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE ATENDIMENTOS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR ATENDIMENTOS"
					labelFalse="APTO A VISUALIZAR ATENDIMENTOS"
					checked={permissions.atendimentos.visualizar}
					handleChange={(value) => updateInvitationPermissions({ atendimentos: { ...permissions.atendimentos, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A INICIAR ATENDIMENTOS"
					labelFalse="APTO A INICIAR ATENDIMENTOS"
					checked={permissions.atendimentos.iniciar}
					handleChange={(value) => updateInvitationPermissions({ atendimentos: { ...permissions.atendimentos, iniciar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A RESPONDER ATENDIMENTOS"
					labelFalse="APTO A RESPONDER ATENDIMENTOS"
					checked={permissions.atendimentos.responder}
					handleChange={(value) => updateInvitationPermissions({ atendimentos: { ...permissions.atendimentos, responder: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A FINALIZAR ATENDIMENTOS"
					labelFalse="APTO A FINALIZAR ATENDIMENTOS"
					checked={permissions.atendimentos.finalizar}
					handleChange={(value) => updateInvitationPermissions({ atendimentos: { ...permissions.atendimentos, finalizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A RECEBER TRANSFERÊNCIAS DE ATENDIMENTOS"
					labelFalse="APTO A RECEBER TRANSFERÊNCIAS DE ATENDIMENTOS"
					checked={!!permissions.atendimentos.receberTransferencias}
					handleChange={(value) => updateInvitationPermissions({ atendimentos: { ...permissions.atendimentos, receberTransferencias: value } })}
				/>
			</div>
		</div>
	);
}

type SalesPermissionsProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function SalesPermissions({ permissions, updateInvitationPermissions }: SalesPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE VENDAS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR VENDAS"
					labelFalse="APTO A VISUALIZAR VENDAS"
					checked={permissions.vendas.visualizar}
					handleChange={(value) => updateInvitationPermissions({ vendas: { ...permissions.vendas, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CRIAR VENDAS"
					labelFalse="APTO A CRIAR VENDAS"
					checked={permissions.vendas.criar}
					handleChange={(value) => updateInvitationPermissions({ vendas: { ...permissions.vendas, criar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR VENDAS"
					labelFalse="APTO A EDITAR VENDAS"
					checked={permissions.vendas.editar}
					handleChange={(value) => updateInvitationPermissions({ vendas: { ...permissions.vendas, editar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR VENDAS"
					labelFalse="APTO A EXCLUIR VENDAS"
					checked={permissions.vendas.excluir}
					handleChange={(value) => updateInvitationPermissions({ vendas: { ...permissions.vendas, excluir: value } })}
				/>
			</div>
		</div>
	);
}

type SalesDiscountsPermissionsProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function SalesDiscountsPermissions({ permissions, updateInvitationPermissions }: SalesDiscountsPermissionsProps) {
	// Resolve a semântica de ausência do bloco `descontos` (liberado sem teto) e materializa o
	// bloco completo ao primeiro toque em qualquer campo.
	const descontos = resolveDiscountAuthority(permissions);
	const updateDescontos = (updates: Partial<typeof descontos>) =>
		updateInvitationPermissions({ vendas: { ...permissions.vendas, descontos: { ...descontos, ...updates } } });
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
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function PurchasesPermissions({ permissions, updateInvitationPermissions }: PurchasesPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE COMPRAS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR COMPRAS"
					labelFalse="APTO A VISUALIZAR COMPRAS"
					checked={permissions.compras.visualizar}
					handleChange={(value) => updateInvitationPermissions({ compras: { ...permissions.compras, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CRIAR COMPRAS"
					labelFalse="APTO A CRIAR COMPRAS"
					checked={permissions.compras.criar}
					handleChange={(value) => updateInvitationPermissions({ compras: { ...permissions.compras, criar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR COMPRAS"
					labelFalse="APTO A EDITAR COMPRAS"
					checked={permissions.compras.editar}
					handleChange={(value) => updateInvitationPermissions({ compras: { ...permissions.compras, editar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR COMPRAS"
					labelFalse="APTO A EXCLUIR COMPRAS"
					checked={permissions.compras.excluir}
					handleChange={(value) => updateInvitationPermissions({ compras: { ...permissions.compras, excluir: value } })}
				/>
			</div>
		</div>
	);
}

type FiscalPermissionsProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
function FiscalPermissions({ permissions, updateInvitationPermissions }: FiscalPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-2">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DO MÓDULO FISCAL</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR RECURSOS"
					labelFalse="APTO A VISUALIZAR RECURSOS"
					checked={permissions.fiscal.visualizar}
					handleChange={(value) => updateInvitationPermissions({ fiscal: { ...permissions.fiscal, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CONFIGURAR RECURSOS"
					labelFalse="APTO A CONFIGURAR RECURSOS"
					checked={permissions.fiscal.configurar}
					handleChange={(value) => updateInvitationPermissions({ fiscal: { ...permissions.fiscal, configurar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EMISSÃO DE DOCUMENTOS FISCAIS"
					labelFalse="APTO A EMISSÃO DE DOCUMENTOS FISCAIS"
					checked={permissions.fiscal.emitir}
					handleChange={(value) => updateInvitationPermissions({ fiscal: { ...permissions.fiscal, emitir: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CANCELAR DOCUMENTOS FISCAIS"
					labelFalse="APTO A CANCELAR DOCUMENTOS FISCAIS"
					checked={permissions.fiscal.cancelar}
					handleChange={(value) => updateInvitationPermissions({ fiscal: { ...permissions.fiscal, cancelar: value } })}
				/>
			</div>
		</div>
	);
}
