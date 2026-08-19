import { Switch } from "@/components/ui/switch";
import {
	ACCESS_SCOPE_GROUP_LABELS,
	ACCESS_SCOPE_GROUP_ORDER,
	describeAccessScope,
	type TAccessScopeGroup,
} from "@/lib/access/scope-catalog";
import { getErrorMessage } from "@/lib/errors";
import { updateAccessGrant } from "@/lib/mutations/access";
import type { TAccessPrincipalById } from "@/lib/queries/access";
import type { TAccessScopeEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import { useId, useMemo } from "react";
import { toast } from "sonner";

type DevicePermissionsBlockProps = {
	principalId: string;
	grants: TAccessPrincipalById["grants"];
	escoposPermitidos: string[];
	readOnly: boolean;
	onChanged: () => Promise<unknown>;
};

export function DevicePermissionsBlock({ principalId, grants, escoposPermitidos, readOnly, onChanged }: DevicePermissionsBlockProps) {
	const { mutate: mutateGrant, isPending, variables } = useMutation({
		mutationKey: ["update-access-grant", principalId],
		mutationFn: updateAccessGrant,
		onSuccess: async (data) => {
			toast.success(data.message);
			await onChanged();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const { activeScopes, groups } = useMemo(() => {
		const active = new Set(grants.filter((grant) => !grant.dataRevogacao).map((grant) => grant.scope));
		// Teto do cliente + grants ativos fora do teto (o teto pode ter encolhido — ainda precisam
		// ser revogáveis). Ordem estável por grupo, não pela ordem de chegada da API.
		const manageable = Array.from(new Set([...escoposPermitidos, ...active]));
		const grouped = new Map<TAccessScopeGroup, string[]>();
		for (const scope of manageable) {
			const { group } = describeAccessScope(scope);
			const bucket = grouped.get(group);
			if (bucket) bucket.push(scope);
			else grouped.set(group, [scope]);
		}
		return {
			activeScopes: active,
			groups: ACCESS_SCOPE_GROUP_ORDER.filter((group) => grouped.has(group)).map((group) => ({ group, scopes: grouped.get(group) ?? [] })),
		};
	}, [grants, escoposPermitidos]);

	if (groups.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma permissão disponível para este tipo de dispositivo.</p>;

	return (
		<div className="flex w-full flex-col gap-5">
			<p className="max-w-[52ch] text-xs text-muted-foreground">
				O aparelho só consegue fazer o que estiver ligado aqui. Desligar tem efeito imediato, sem precisar reativar o dispositivo.
			</p>

			{groups.map(({ group, scopes }) => (
				<div key={group} className="flex w-full flex-col gap-2">
					{groups.length > 1 ? (
						<h4 className="text-[0.65rem] font-bold tracking-[0.08em] text-muted-foreground">{ACCESS_SCOPE_GROUP_LABELS[group].toUpperCase()}</h4>
					) : null}
					<div className="flex w-full flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
						{scopes.map((scope) => (
							<ScopeRow
								key={scope}
								scope={scope}
								isActive={activeScopes.has(scope)}
								disabled={readOnly || (isPending && variables?.scope === scope)}
								onToggle={(isActive) =>
									mutateGrant({ principalId, scope: scope as TAccessScopeEnum, acao: isActive ? "REVOGAR" : "CONCEDER" })
								}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

type ScopeRowProps = {
	scope: string;
	isActive: boolean;
	disabled: boolean;
	onToggle: (isActive: boolean) => void;
};
// htmlFor em vez de <label> envolvendo o Switch: o Switch da Radix é um <button>, e aninhá-lo
// num label dispararia o clique duas vezes — conceder e revogar no mesmo toque.
function ScopeRow({ scope, isActive, disabled, onToggle }: ScopeRowProps) {
	const switchId = useId();
	const { label, description } = describeAccessScope(scope);

	return (
		<div className="flex w-full items-center justify-between gap-3 p-3" title={scope}>
			<label htmlFor={switchId} className="flex min-w-0 cursor-pointer flex-col gap-0.5">
				<span className="text-sm font-semibold">{label}</span>
				<span className="text-xs text-muted-foreground">{description}</span>
			</label>
			<Switch id={switchId} className="shrink-0" checked={isActive} disabled={disabled} onCheckedChange={() => onToggle(isActive)} />
		</div>
	);
}

export default DevicePermissionsBlock;
