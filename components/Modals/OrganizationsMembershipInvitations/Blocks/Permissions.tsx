import CheckboxInput from "@/components/Inputs/CheckboxInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useUsers } from "@/lib/queries/users";
import type { TUseOrganizationMembershipInvitationState } from "@/state-hooks/use-organization-membership-invitation-state";
import { Shield } from "lucide-react";
import PermissionsScope from "../../Users/Blocks/Utils/PermissionsScope";

type OrganizationsMembershipInvitationsPermissionsBlockProps = {
	permissions: TUseOrganizationMembershipInvitationState["state"]["invitation"]["permissoes"];
	updateInvitationPermissions: TUseOrganizationMembershipInvitationState["updateInvitationPermissions"];
};
export default function OrganizationsMembershipInvitationsPermissionsBlock({
	permissions,
	updateInvitationPermissions,
}: OrganizationsMembershipInvitationsPermissionsBlockProps) {
	return (
		<ResponsiveMenuSection title="PERMISSÕES" icon={<Shield className="h-4 min-h-4 w-4 min-w-4" />}>
			<CompanyPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			<ResultsPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			<GoalsPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			<UsersPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
			<ChatServicesPermissions permissions={permissions} updateInvitationPermissions={updateInvitationPermissions} />
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
