import DateInput from "@/components/Inputs/DateInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateForInputValue, formatDateOnInputChange, formatToCPF, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import type { TUser } from "@/schemas/users";
import type { TUseUserState } from "@/state-hooks/use-user-state";
import { Calendar, ImageIcon, LayoutGrid, Mail, Phone, UserRound } from "lucide-react";
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
			<UsersGeneralBlockAvatar imageUrl={infoHolder.avatarUrl} imageHolder={avatarHolder} updateImageHolder={updateAvatarHolder} />
			<div className="w-full flex items-center flex-col  gap-2">
				<div className="w-full flex items-center gap-1.5">
					<UserRound className="h-4 min-h-4 w-4 min-w-4" />
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">NOME</h3>
					<h3 className="text-sm font-semibold tracking-tight">{infoHolder.nome}</h3>
				</div>
				<div className="w-full flex items-center gap-1.5">
					<Mail className="h-4 min-h-4 w-4 min-w-4" />
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">EMAIL</h3>
					<h3 className="text-sm font-semibold tracking-tight">{infoHolder.email}</h3>
				</div>
				<div className="w-full flex items-center gap-1.5">
					<Phone className="h-4 min-h-4 w-4 min-w-4" />
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">TELEFONE</h3>
					<h3 className="text-sm font-semibold tracking-tight">{infoHolder.telefone}</h3>
				</div>
				<div className="w-full flex items-center gap-1.5">
					<Calendar className="h-4 min-h-4 w-4 min-w-4" />
					<h3 className="text-sm font-semibold tracking-tighter text-primary/80">DATA DE NASCIMENTO</h3>
					<h3 className="text-sm font-semibold tracking-tight">
						{infoHolder.dataNascimento ? formatDateForInputValue(infoHolder.dataNascimento) : "NÃO INFORMADO"}
					</h3>
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
