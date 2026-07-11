import DateInput from "@/components/Inputs/DateInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { formatDateForInputValue, formatDateOnInputChange, formatToPhone } from "@/lib/formatting";
import { updateUserAsAdmin } from "@/lib/mutations/admin";
import { useAdminUserById } from "@/lib/queries/admin";
import { type TUseAdminUserState, useAdminUserState } from "@/state-hooks/use-admin-user-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { toast } from "sonner";

type AdminControlUserProps = {
	userId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

export function AdminControlUser({ userId, closeModal, callbacks }: AdminControlUserProps) {
	const queryClient = useQueryClient();
	const { state, updateUser, updateAvatarHolder, redefineState } = useAdminUserState();
	const { data: user, queryKey, isLoading, error } = useAdminUserById({ id: userId });

	async function handleUpdateUserMutation(state: TUseAdminUserState["state"]) {
		let userAvatarUrl = state.user.avatarUrl;
		if (state.avatarHolder.file) {
			const { url } = await uploadFile({ file: state.avatarHolder.file, fileName: state.user.nome, prefix: "avatars" });
			userAvatarUrl = url;
		}
		return await updateUserAsAdmin({ userId, user: { ...state.user, avatarUrl: userAvatarUrl } });
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["admin-update-user", userId],
		mutationFn: handleUpdateUserMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	useEffect(() => {
		if (user)
			redefineState({
				user: {
					nome: user.nome,
					email: user.email,
					telefone: user.telefone,
					avatarUrl: user.avatarUrl,
					usuario: user.usuario,
					dataNascimento: user.dataNascimento,
				},
				avatarHolder: { file: null, previewUrl: null },
			});
	}, [user, redefineState]);

	return (
		<ResponsiveMenu
			menuTitle="EDITAR USUÁRIO"
			menuDescription="Atualize manualmente as informações do usuário"
			menuActionButtonText="ATUALIZAR USUÁRIO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
				<AdminControlUserAvatar imageUrl={state.user.avatarUrl} avatarHolder={state.avatarHolder} updateAvatarHolder={updateAvatarHolder} />
				<div className="w-full flex flex-col gap-2">
					<TextInput
						label="NOME"
						placeholder="Preencha o nome do usuário..."
						value={state.user.nome}
						handleChange={(value) => updateUser({ nome: value })}
					/>
					<TextInput
						label="EMAIL"
						placeholder="Preencha o email do usuário..."
						value={state.user.email}
						handleChange={(value) => updateUser({ email: value })}
					/>
					<TextInput
						label="TELEFONE"
						placeholder="Preencha o telefone do usuário..."
						value={state.user.telefone}
						handleChange={(value) => updateUser({ telefone: formatToPhone(value) })}
						inputType="tel"
					/>
					<TextInput
						label="USUÁRIO"
						placeholder="Preencha o usuário de acesso..."
						value={state.user.usuario}
						handleChange={(value) => updateUser({ usuario: value })}
					/>
					<DateInput
						label="DATA DE NASCIMENTO"
						value={formatDateForInputValue(state.user.dataNascimento)}
						handleChange={(value) => updateUser({ dataNascimento: formatDateOnInputChange(value, "date") })}
					/>
				</div>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}

function AdminControlUserAvatar({
	imageUrl,
	avatarHolder,
	updateAvatarHolder,
}: {
	imageUrl: TUseAdminUserState["state"]["user"]["avatarUrl"];
	avatarHolder: TUseAdminUserState["state"]["avatarHolder"];
	updateAvatarHolder: TUseAdminUserState["updateAvatarHolder"];
}) {
	return (
		<div className="flex w-full items-center justify-center">
			<label className="relative aspect-square w-full max-w-[180px] cursor-pointer overflow-hidden rounded-lg" htmlFor="admin-user-avatar-file">
				<AdminControlUserAvatarPreview avatarHolder={avatarHolder} imageUrl={imageUrl} />
				<input
					accept=".png,.jpeg,.jpg"
					className="absolute h-full w-full cursor-pointer opacity-0"
					id="admin-user-avatar-file"
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
	);
}

function AdminControlUserAvatarPreview({
	imageUrl,
	avatarHolder,
}: {
	imageUrl: TUseAdminUserState["state"]["user"]["avatarUrl"];
	avatarHolder: TUseAdminUserState["state"]["avatarHolder"];
}) {
	if (avatarHolder.previewUrl) {
		return <Image alt="Avatar do usuário." fill={true} className="object-cover" src={avatarHolder.previewUrl} />;
	}
	if (imageUrl) {
		return <Image alt="Avatar do usuário." fill={true} className="object-cover" src={imageUrl} />;
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/20">
			<ImageIcon className="h-6 w-6" />
			<p className="text-center font-medium text-xs">DEFINIR AVATAR</p>
		</div>
	);
}
