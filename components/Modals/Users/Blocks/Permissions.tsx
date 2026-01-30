import CheckboxInput from "@/components/Inputs/CheckboxInput";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useUsers } from "@/lib/queries/users";
import type { TUseUserState } from "@/state-hooks/use-user-state";
import { Shield } from "lucide-react";
import PermissionsScope from "./Utils/PermissionsScope";

type UsersPermissionsBlockProps = {
	userId?: string;
	permissionsHolder: TUseUserState["state"]["membership"]["permissoes"];
	updateUserPermissions: TUseUserState["updateMembershipPermissions"];
};
export default function UsersPermissionsBlock({ userId, permissionsHolder, updateUserPermissions }: UsersPermissionsBlockProps) {
	return (
		<ResponsiveMenuSection title="PERMISSÕES" icon={<Shield className="h-4 min-h-4 w-4 min-w-4" />}>
			<CompanyPermissions permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			<ResultsPermissions userId={userId} permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			<GoalsPermissions permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			<UsersPermissions permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
			<ChatServicesPermissions permissionsHolder={permissionsHolder} updateUserPermissions={updateUserPermissions} />
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
