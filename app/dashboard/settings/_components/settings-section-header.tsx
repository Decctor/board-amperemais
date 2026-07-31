import { type TSettingsView, getSettingsLocation } from "./settings-navigation";

type SettingsSectionHeaderProps = {
	view: TSettingsView;
};

/**
 * O grupo entra como eyebrow em vez de trilha de navegação: o AppHeader do layout já rotula a
 * página como "Configurações", e repetir isso numa breadcrumb só gastaria uma linha para dizer o
 * que já está na tela.
 */
export default function SettingsSectionHeader({ view }: SettingsSectionHeaderProps) {
	const { group, section } = getSettingsLocation(view);
	return (
		<div className="border-border flex w-full flex-col gap-1.5 border-b pb-4">
			<div className="flex flex-col gap-0.5">
				<p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.08em] uppercase">{group.label}</p>
				<h2 className="text-lg font-extrabold tracking-tight">{section.label}</h2>
			</div>
			<p className="text-muted-foreground text-sm">{section.description}</p>
		</div>
	);
}
