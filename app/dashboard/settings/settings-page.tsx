"use client";
import Header from "@/components/Layouts/HeaderApp";
import SettingsMain from "@/components/Admin/SettingsMain";
import type { TUserSession } from "@/schemas/users";

type SettingsPageProps = {
	user: TUserSession;
};
export default function SettingsPage({ user }: SettingsPageProps) {
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6">
				<h1 className="text-2xl font-black text-primary">Configurações</h1>
				<SettingsMain session={user} />
			</div>
		</div>
	);
}
