import CheckboxInput from "@/components/Inputs/CheckboxInput";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useUsers } from "@/lib/queries/users";
import type { TUseUserState } from "@/state-hooks/use-user-state";
import { Shield } from "lucide-react";
import PermissionsScope from "./Utils/PermissionsScope";

type UsersPermissionsBlockProps = {
	userId?: string;
	infoHolder: TUseUserState["state"]["user"];
	updateUserPermissions: TUseUserState["updateUserPermissions"];
};
export default function UsersPermissionsBlock({ userId, infoHolder, updateUserPermissions }: UsersPermissionsBlockProps) {
	return (
		<ResponsiveMenuSection title="PERMISSÕES" icon={<Shield className="h-4 min-h-4 w-4 min-w-4" />}>
			<CompanyPermissions infoHolder={infoHolder} updateUserPermissions={updateUserPermissions} />
			<ResultsPermissions userId={userId} infoHolder={infoHolder} updateUserPermissions={updateUserPermissions} />
			<GoalsPermissions infoHolder={infoHolder} updateUserPermissions={updateUserPermissions} />
			<UsersPermissions infoHolder={infoHolder} updateUserPermissions={updateUserPermissions} />
			<ChatServicesPermissions infoHolder={infoHolder} updateUserPermissions={updateUserPermissions} />
		</ResponsiveMenuSection>
	);
}

type CompanyPermissionsProps = {
	infoHolder: TUseUserState["state"]["user"];
	updateUserPermissions: TUseUserState["updateUserPermissions"];
};
function CompanyPermissions({ infoHolder, updateUserPermissions }: CompanyPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-1">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE EMPRESA</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR EMPRESA"
					labelFalse="APTO A VISUALIZAR EMPRESA"
					checked={infoHolder.permissoes.empresa.visualizar}
					handleChange={(value) => updateUserPermissions({ empresa: { ...infoHolder.permissoes.empresa, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR EMPRESA"
					labelFalse="APTO A EDITAR EMPRESA"
					checked={infoHolder.permissoes.empresa.editar}
					handleChange={(value) => updateUserPermissions({ empresa: { ...infoHolder.permissoes.empresa, editar: value } })}
				/>
			</div>
		</div>
	);
}
type ResultsPermissionsProps = {
	userId?: string;
	infoHolder: TUseUserState["state"]["user"];
	updateUserPermissions: TUseUserState["updateUserPermissions"];
};
function ResultsPermissions({ userId, infoHolder, updateUserPermissions }: ResultsPermissionsProps) {
	const { data: users } = useUsers({ initialFilters: {} });
	return (
		<div className="w-full flex flex-col gap-1">
			<div className="w-full flex items-center justify-between gap-2">
				<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE RESULTADOS</h2>
				<PermissionsScope
					referenceId={userId || null}
					options={users?.map((user) => ({ id: user.id, label: user.nome, value: user.id })) || []}
					selected={infoHolder.permissoes.resultados.escopo ?? null}
					handleScopeSelection={(value) => updateUserPermissions({ resultados: { ...infoHolder.permissoes.resultados, escopo: value as string[] } })}
				/>
			</div>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR RESULTADOS"
					labelFalse="APTO A VISUALIZAR RESULTADOS"
					checked={infoHolder.permissoes.resultados.visualizar}
					handleChange={(value) => updateUserPermissions({ resultados: { ...infoHolder.permissoes.resultados, visualizar: value } })}
				/>
			</div>
		</div>
	);
}

type GoalsPermissionsProps = {
	infoHolder: TUseUserState["state"]["user"];
	updateUserPermissions: TUseUserState["updateUserPermissions"];
};
function GoalsPermissions({ infoHolder, updateUserPermissions }: GoalsPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-1">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE METAS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A CRIAR METAS"
					labelFalse="APTO A CRIAR METAS"
					checked={infoHolder.permissoes.resultados.criarMetas}
					handleChange={(value) => updateUserPermissions({ resultados: { ...infoHolder.permissoes.resultados, criarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR METAS"
					labelFalse="APTO A VISUALIZAR METAS"
					checked={infoHolder.permissoes.resultados.visualizarMetas}
					handleChange={(value) => updateUserPermissions({ resultados: { ...infoHolder.permissoes.resultados, visualizarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR METAS"
					labelFalse="APTO A EDITAR METAS"
					checked={infoHolder.permissoes.resultados.editarMetas}
					handleChange={(value) => updateUserPermissions({ resultados: { ...infoHolder.permissoes.resultados, editarMetas: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR METAS"
					labelFalse="APTO A EXCLUIR METAS"
					checked={infoHolder.permissoes.resultados.excluirMetas}
					handleChange={(value) => updateUserPermissions({ resultados: { ...infoHolder.permissoes.resultados, excluirMetas: value } })}
				/>
			</div>
		</div>
	);
}

type UsersPermissionsProps = {
	infoHolder: TUseUserState["state"]["user"];
	updateUserPermissions: TUseUserState["updateUserPermissions"];
};
function UsersPermissions({ infoHolder, updateUserPermissions }: UsersPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-1">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE USUÁRIOS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR USUÁRIOS"
					labelFalse="APTO A VISUALIZAR USUÁRIOS"
					checked={infoHolder.permissoes.usuarios.visualizar}
					handleChange={(value) => updateUserPermissions({ usuarios: { ...infoHolder.permissoes.usuarios, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A CRIAR USUÁRIOS"
					labelFalse="APTO A CRIAR USUÁRIOS"
					checked={infoHolder.permissoes.usuarios.criar}
					handleChange={(value) => updateUserPermissions({ usuarios: { ...infoHolder.permissoes.usuarios, criar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EDITAR USUÁRIOS"
					labelFalse="APTO A EDITAR USUÁRIOS"
					checked={infoHolder.permissoes.usuarios.editar}
					handleChange={(value) => updateUserPermissions({ usuarios: { ...infoHolder.permissoes.usuarios, editar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A EXCLUIR USUÁRIOS"
					labelFalse="APTO A EXCLUIR USUÁRIOS"
					checked={infoHolder.permissoes.usuarios.excluir}
					handleChange={(value) => updateUserPermissions({ usuarios: { ...infoHolder.permissoes.usuarios, excluir: value } })}
				/>
			</div>
		</div>
	);
}

type ChatServicesPermissionsProps = {
	infoHolder: TUseUserState["state"]["user"];
	updateUserPermissions: TUseUserState["updateUserPermissions"];
};
function ChatServicesPermissions({ infoHolder, updateUserPermissions }: ChatServicesPermissionsProps) {
	return (
		<div className="w-full flex flex-col gap-1">
			<h2 className="text-xs tracking-tight font-medium text-start w-fit">PERMISSÕES DE ATENDIMENTOS</h2>
			<div className="w-full flex flex-col gap-2">
				<CheckboxInput
					labelTrue="APTO A VISUALIZAR ATENDIMENTOS"
					labelFalse="APTO A VISUALIZAR ATENDIMENTOS"
					checked={infoHolder.permissoes.atendimentos.visualizar}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...infoHolder.permissoes.atendimentos, visualizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A INICIAR ATENDIMENTOS"
					labelFalse="APTO A INICIAR ATENDIMENTOS"
					checked={infoHolder.permissoes.atendimentos.iniciar}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...infoHolder.permissoes.atendimentos, iniciar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A RESPONDER ATENDIMENTOS"
					labelFalse="APTO A RESPONDER ATENDIMENTOS"
					checked={infoHolder.permissoes.atendimentos.responder}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...infoHolder.permissoes.atendimentos, responder: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A FINALIZAR ATENDIMENTOS"
					labelFalse="APTO A FINALIZAR ATENDIMENTOS"
					checked={infoHolder.permissoes.atendimentos.finalizar}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...infoHolder.permissoes.atendimentos, finalizar: value } })}
				/>
				<CheckboxInput
					labelTrue="APTO A RECEBER TRANSFERÊNCIAS DE ATENDIMENTOS"
					labelFalse="APTO A RECEBER TRANSFERÊNCIAS DE ATENDIMENTOS"
					checked={!!infoHolder.permissoes.atendimentos.receberTransferencias}
					handleChange={(value) => updateUserPermissions({ atendimentos: { ...infoHolder.permissoes.atendimentos, receberTransferencias: value } })}
				/>
			</div>
		</div>
	);
}
