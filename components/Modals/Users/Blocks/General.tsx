import DateInput from "@/components/Inputs/DateInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateForInputValue, formatDateOnInputChange, formatToCPF, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import type { TUser } from "@/schemas/users";
import type { TUseUserState } from "@/state-hooks/use-user-state";
import { ImageIcon, LayoutGrid } from "lucide-react";
import Image from "next/image";

type UsersGeneralBlockProps = {
	infoHolder: TUseUserState["state"]["user"];
	updateInfoHolder: TUseUserState["updateUser"];
	avatarHolder: TUseUserState["state"]["avatarHolder"];
	updateAvatarHolder: TUseUserState["updateAvatarHolder"];
};
export default function UsersGeneralBlock({ infoHolder, updateInfoHolder, avatarHolder, updateAvatarHolder }: UsersGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center lg:items-start flex-col lg:flex-row gap-2">
				<UsersGeneralBlockAvatar imageUrl={infoHolder.avatarUrl} imageHolder={avatarHolder} updateImageHolder={updateAvatarHolder} />
				<div className="h-full w-full lg:grow flex flex-col items-center gap-2">
					<TextInput
						label="NOME (*)"
						value={infoHolder.nome}
						placeholder="Preencha aqui o nome do cliente."
						handleChange={(value) => updateInfoHolder({ nome: value })}
						width="100%"
					/>
					<DateInput
						label={"DATA DE NASCIMENTO"}
						editable={true}
						value={infoHolder.dataNascimento ? formatDateForInputValue(infoHolder.dataNascimento) : undefined}
						handleChange={(value) => updateInfoHolder({ dataNascimento: formatDateOnInputChange(value, "date") })}
						width={"100%"}
					/>
				</div>
			</div>

			<div className="flex w-full flex-col items-center gap-2 lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="TELEFONE"
						value={infoHolder.telefone ?? ""}
						placeholder="Preencha aqui o telefone do usuário."
						handleChange={(value) => updateInfoHolder({ telefone: formatToPhone(value) })}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="EMAIL"
						value={infoHolder.email ?? ""}
						placeholder="Preencha aqui o email do usuário."
						handleChange={(value) => updateInfoHolder({ email: value })}
						width="100%"
					/>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}

function UsersGeneralBlockAvatar({
	imageUrl,
	imageHolder,
	updateImageHolder,
}: {
	imageUrl: TUseUserState["state"]["user"]["avatarUrl"];
	imageHolder: TUseUserState["state"]["avatarHolder"];
	updateImageHolder: TUseUserState["updateAvatarHolder"];
}) {
	return (
		<div className="flex items-center justify-center min-h-[250px] min-w-[250px]">
			<label className="relative aspect-square w-full max-w-[250px] cursor-pointer overflow-hidden rounded-lg" htmlFor="dropzone-file">
				<UsersGeneralBlockAvatarPreview imageHolder={imageHolder} imageUrl={imageUrl} />
				<input
					accept=".png,.jpeg,.jpg"
					className="absolute h-full w-full cursor-pointer opacity-0"
					id="dropzone-file"
					multiple={false}
					onChange={(e) => {
						const file = e.target.files?.[0] ?? null;
						updateImageHolder({
							file,
							previewUrl: file ? URL.createObjectURL(file) : null,
						});
					}}
					tabIndex={-1}
					type="file"
				/>
			</label>
		</div>
	);
}

function UsersGeneralBlockAvatarPreview({
	imageUrl,
	imageHolder,
}: {
	imageUrl: TUseUserState["state"]["user"]["avatarUrl"];
	imageHolder: TUseUserState["state"]["avatarHolder"];
}) {
	if (imageHolder.previewUrl) {
		return <Image alt="Avatar do usuário." fill={true} objectFit="cover" src={imageHolder.previewUrl} />;
	}
	if (imageUrl) {
		return <Image alt="Avatar do usuário." fill={true} objectFit="cover" src={imageUrl} />;
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/20">
			<ImageIcon className="h-6 w-6" />
			<p className="text-center font-medium text-xs">DEFINIR AVATAR</p>
		</div>
	);
}
