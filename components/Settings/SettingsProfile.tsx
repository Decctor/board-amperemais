"use client";

import type { TGetUsersOutputById, TUpdateUserInput } from "@/app/api/users/route";
import TextInput from "@/components/Inputs/TextInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import SectionWrapper from "@/components/ui/section-wrapper";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { formatDateForInputValue, formatDateOnInputChange, formatToCEP, formatToPhone } from "@/lib/formatting";
import { updateProfile } from "@/lib/mutations/users";
import { useUserById } from "@/lib/queries/users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, CircleUser, Loader2, MapPin, Save, Undo2, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import DateInput from "../Inputs/DateInput";

type SettingsProfileProps = {
	sessionUser: TAuthUserSession["user"];
};

export default function SettingsProfile({ sessionUser }: SettingsProfileProps) {
	const queryClient = useQueryClient();
	const { data: user, queryKey, isLoading, isError, isSuccess, error } = useUserById(sessionUser.id);

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });
	if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!isSuccess) return <ErrorComponent msg={getErrorMessage(error)} />;
	return <SettingsProfileContent user={user} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />;
}

type SettingsProfileContentProps = {
	user: TGetUsersOutputById;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

function SettingsProfileContent({ user, callbacks }: SettingsProfileContentProps) {
	const [userState, setUserState] = useState<TUpdateUserInput["user"]>({
		...user,
		dataNascimento: user.dataNascimento,
	});

	const [avatarFile, setAvatarFile] = useState<{ file: File; previewUrl: string } | null>(null);

	const { mutate: updateUserMutation, isPending } = useMutation({
		mutationKey: ["update-profile"],
		mutationFn: async () => {
			let avatarUrl = userState.avatarUrl;

			if (avatarFile) {
				const { url } = await uploadFile({
					file: avatarFile.file,
					fileName: `${user.id}-avatar`,
					prefix: "avatars",
				});
				avatarUrl = url;
			}

			const payload: TUpdateUserInput = {
				user: {
					nome: userState.nome,
					email: userState.email,
					telefone: userState.telefone,
					usuario: userState.usuario,
					avatarUrl: avatarUrl,
					dataNascimento: userState.dataNascimento,
					// Location
					localizacaoCep: userState.localizacaoCep,
					localizacaoLogradouro: userState.localizacaoLogradouro,
					localizacaoNumero: userState.localizacaoNumero,
					localizacaoComplemento: userState.localizacaoComplemento,
					localizacaoBairro: userState.localizacaoBairro,
					localizacaoCidade: userState.localizacaoCidade,
					localizacaoEstado: userState.localizacaoEstado,
				},
			};

			return await updateProfile(payload);
		},
		onMutate: () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: () => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success("Perfil atualizado com sucesso!");
			// Ideally we should reload the session or invalidate queries here if we had a user query
			// window.location.reload(); // Simple way to refresh session data if needed
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});

	const handleReset = () => {
		setUserState({
			...user,
			dataNascimento: user.dataNascimento,
		});
		setAvatarFile(null);
	};

	const updateUserState = (updates: Partial<typeof userState>) => {
		setUserState((prev) => ({ ...prev, ...updates }));
	};

	return (
		<div className="flex w-full flex-col gap-6">
			{/* Header Section */}
			<div className="flex flex-col lg:flex-row items-center justify-between border-b pb-4">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold tracking-tight">Meu Perfil</h2>
					<p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e de contato.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={handleReset} disabled={isPending} className="flex items-center gap-2">
						<Undo2 className="h-4 w-4" />
						RESTAURAR
					</Button>
					<Button size="sm" onClick={() => updateUserMutation()} disabled={isPending} className="flex items-center gap-2">
						{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
						SALVAR ALTERAÇÕES
					</Button>
				</div>
			</div>

			<SectionWrapper title="INFORMAÇÕES PESSOAIS" icon={<UserIcon className="h-4 w-4" />}>
				<div className="flex flex-col md:flex-row gap-8">
					{/* Avatar Upload */}
					<div className="flex flex-col gap-2 items-center md:items-start min-w-fit">
						<Label className="text-xs font-medium text-muted-foreground">FOTO DE PERFIL</Label>
						<div className="relative group">
							<div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted">
								{avatarFile?.previewUrl ? (
									<Image src={avatarFile.previewUrl} alt="Avatar" fill className="object-cover" />
								) : userState.avatarUrl ? (
									<Image src={userState.avatarUrl} alt="Avatar" fill className="object-cover" />
								) : (
									<div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
										<CircleUser className="h-10 w-10 opacity-50" />
									</div>
								)}
								<label
									htmlFor="avatar-upload"
									className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 rounded-full"
								>
									<Camera className="h-6 w-6 text-white" />
									<span className="mt-1 text-[10px] font-medium text-white">ALTERAR</span>
									<input
										id="avatar-upload"
										type="file"
										accept="image/png, image/jpeg, image/jpg"
										className="sr-only"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												setAvatarFile({
													file,
													previewUrl: URL.createObjectURL(file),
												});
											}
										}}
									/>
								</label>
							</div>
						</div>
					</div>

					{/* Personal Info Fields */}
					<div className="flex-1 flex flex-col gap-4">
						<div className="w-full flex flex-col items-center lg:flex-row gap-2">
							<div className="w-full lg:w-1/2">
								<TextInput
									label="NOME COMPLETO"
									value={userState.nome}
									placeholder="Seu nome completo"
									handleChange={(val) => updateUserState({ nome: val })}
									width="100%"
								/>
							</div>
							<div className="w-full lg:w-1/2">
								<DateInput
									label="DATA DE NASCIMENTO"
									value={formatDateForInputValue(userState.dataNascimento)}
									handleChange={(val) => updateUserState({ dataNascimento: formatDateOnInputChange(val, "date") })}
									width="100%"
								/>
							</div>
						</div>
						<div className="w-full flex flex-col items-center lg:flex-row gap-2">
							<div className="w-full lg:w-1/2">
								<TextInput
									label="EMAIL"
									value={userState.email}
									placeholder="seu.email@exemplo.com"
									handleChange={(val) => updateUserState({ email: val })}
									width="100%"
								/>
							</div>
							<div className="w-full lg:w-1/2">
								<TextInput
									label="TELEFONE"
									value={userState.telefone}
									placeholder="(00) 00000-0000"
									handleChange={(val) => updateUserState({ telefone: formatToPhone(val) })}
									width="100%"
								/>
							</div>
						</div>
					</div>
				</div>
			</SectionWrapper>

			<SectionWrapper title="ENDEREÇO" icon={<MapPin className="h-4 w-4" />}>
				<div className="w-full flex flex-col items-center lg:flex-row gap-2">
					<div className="w-full lg:w-1/3">
						<TextInput
							label="CEP"
							value={userState.localizacaoCep || ""}
							placeholder="00000-000"
							handleChange={(val) => updateUserState({ localizacaoCep: formatToCEP(val) })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-2/3">
						<TextInput
							label="LOGRADOURO"
							value={userState.localizacaoLogradouro || ""}
							placeholder="Rua, Avenida, etc."
							handleChange={(val) => updateUserState({ localizacaoLogradouro: val })}
							width="100%"
						/>
					</div>
				</div>
				<div className="w-full flex flex-col items-center lg:flex-row gap-2">
					<div className="w-full lg:w-1/3">
						<TextInput
							label="NÚMERO"
							value={userState.localizacaoNumero || ""}
							placeholder="123"
							handleChange={(val) => updateUserState({ localizacaoNumero: val })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="COMPLEMENTO"
							value={userState.localizacaoComplemento || ""}
							placeholder="Apto 101"
							handleChange={(val) => updateUserState({ localizacaoComplemento: val })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="BAIRRO"
							value={userState.localizacaoBairro || ""}
							placeholder="Centro"
							handleChange={(val) => updateUserState({ localizacaoBairro: val })}
							width="100%"
						/>
					</div>
				</div>
				<div className="w-full flex flex-col items-center lg:flex-row gap-2">
					<div className="w-full lg:w-2/3">
						<TextInput
							label="CIDADE"
							value={userState.localizacaoCidade || ""}
							placeholder="São Paulo"
							handleChange={(val) => updateUserState({ localizacaoCidade: val })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/3">
						<TextInput
							label="ESTADO (UF)"
							value={userState.localizacaoEstado || ""}
							placeholder="SP"
							handleChange={(val) => updateUserState({ localizacaoEstado: val ? val.toUpperCase().slice(0, 2) : "" })}
							width="100%"
						/>
					</div>
				</div>
			</SectionWrapper>
		</div>
	);
}
