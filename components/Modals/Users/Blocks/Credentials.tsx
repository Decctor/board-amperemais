import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseUserState } from "@/hooks/use-user-state";
import { Shield } from "lucide-react";

type UsersCredentialsBlockProps = {
	infoHolder: TUseUserState["state"]["user"];
	updateInfoHolder: TUseUserState["updateUser"];
};
export default function UsersCredentialsBlock({ infoHolder, updateInfoHolder }: UsersCredentialsBlockProps) {
	return (
		<ResponsiveMenuSection title="CREDENCIAIS DE ACESSO" icon={<Shield className="h-4 min-h-4 w-4 min-w-4" />}>
			<TextInput
				label="USUÁRIO DE ACESSO"
				value={infoHolder.usuario}
				placeholder="Preencha aqui o usuário de acesso..."
				handleChange={(value) => updateInfoHolder({ usuario: value })}
				width="100%"
			/>
			<TextInput
				label="SENHA DE ACESSO"
				value={infoHolder.senha}
				placeholder="Preencha aqui a senha de acesso..."
				handleChange={(value) => updateInfoHolder({ senha: value })}
				width="100%"
			/>
		</ResponsiveMenuSection>
	);
}
