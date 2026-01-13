"use client";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseOrganizationState } from "@/state-hooks/use-organization-state";
import { Upload, User } from "lucide-react";
import Image from "next/image";

type MainUserBlockProps = {
	mainUser: TUseOrganizationState["state"]["mainUser"];
	updateMainUser: TUseOrganizationState["updateMainUser"];
	avatarHolder: TUseOrganizationState["state"]["mainUserAvatarHolder"];
	updateAvatarHolder: TUseOrganizationState["updateMainUserAvatarHolder"];
};

export default function MainUserBlock({ mainUser, updateMainUser, avatarHolder, updateAvatarHolder }: MainUserBlockProps) {
	return (
		<ResponsiveMenuSection title="USUÁRIO PRINCIPAL" icon={<User className="w-4 h-4" />}>
			<div className="flex flex-col lg:flex-row gap-4">
				{/* Avatar Upload */}
				<div className="flex items-center justify-center min-h-[150px] min-w-[150px]">
					<label
						className="relative aspect-square w-full max-w-[150px] cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors"
						htmlFor="user-avatar-file"
					>
						<AvatarPreview avatarHolder={avatarHolder} avatarUrl={mainUser.avatarUrl} />
						<input
							accept=".png,.jpeg,.jpg"
							className="absolute h-full w-full cursor-pointer opacity-0"
							id="user-avatar-file"
							multiple={false}
							onChange={(e) => {
								const file = e.target.files?.[0] ?? null;
								updateAvatarHolder({
									file,
									previewUrl: file ? URL.createObjectURL(file) : null,
								});
							}}
							tabIndex={-1}
							type="file"
						/>
					</label>
				</div>

				{/* Form Fields */}
				<div className="flex flex-col gap-3 flex-1">
					<TextInput
						label="Nome"
						placeholder="Preencha aqui o nome do usuário principal."
						value={mainUser.nome}
						handleChange={(value) => updateMainUser({ nome: value })}
					/>
					<TextInput
						label="Email"
						placeholder="Preencha aqui o email do usuário principal."
						value={mainUser.email}
						handleChange={(value) => updateMainUser({ email: value })}
					/>
					<TextInput
						label="Telefone"
						placeholder="Preencha aqui o telefone do usuário principal."
						value={mainUser.telefone}
						handleChange={(value) => updateMainUser({ telefone: value })}
					/>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
						<TextInput
							label="Usuário"
							placeholder="Preencha aqui o usuário do usuário principal."
							value={mainUser.usuario}
							handleChange={(value) => updateMainUser({ usuario: value })}
						/>
						<TextInput
							label="Senha"
							placeholder="Preencha aqui a senha do usuário principal."
							value={mainUser.senha}
							handleChange={(value) => updateMainUser({ senha: value })}
						/>
					</div>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}

function AvatarPreview({
	avatarHolder,
	avatarUrl,
}: {
	avatarHolder: TUseOrganizationState["state"]["mainUserAvatarHolder"];
	avatarUrl: string | null | undefined;
}) {
	const displayUrl = avatarHolder.previewUrl || avatarUrl;

	if (displayUrl) {
		return <Image src={displayUrl} alt="Avatar do usuário" fill className="object-cover" />;
	}

	return (
		<div className="flex flex-col items-center justify-center h-full w-full gap-2 p-4">
			<User className="w-10 h-10 text-primary/40" />
			<Upload className="w-5 h-5 text-primary/40" />
			<p className="text-xs text-primary/60 text-center">Avatar</p>
		</div>
	);
}
