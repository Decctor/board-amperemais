"use client";
import SettingsMain from "@/components/Admin/SettingsMain";
import type { TUserSession } from "@/schemas/users";

type SettingsPageProps = {
	user: TUserSession;
};
export default function SettingsPage({ user }: SettingsPageProps) {
	return (
		<div className="flex w-full h-full grow flex-col">
			<SettingsMain session={user} />
		</div>
	);
}
