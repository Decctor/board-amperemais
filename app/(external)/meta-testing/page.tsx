import ChatsMain from "@/components/Chats/ChatsMain";

export default function MetaTestingPage() {
	const user = {
		id: "123",
		nome: "Meta Testing User",
		telefone: "1234567890",
		email: "testinguser@meta.com",
		avatarUrl: null,
		permissoes: {
			resultados: {
				visualizar: true,
				criarMetas: true,
				visualizarMetas: true,
				editarMetas: true,
				excluirMetas: true,
				escopo: undefined,
			},
			usuarios: {
				visualizar: true,
				criar: true,
				editar: true,
				excluir: true,
			},
			atendimentos: {
				visualizar: true,
				iniciar: true,
				responder: true,
				finalizar: true,
			},
		},
		vendedorId: "123",
	};

	return (
		<div className="flex w-full h-full grow items-center justify-center flex-col">
			<ChatsMain user={user} />
		</div>
	);
}
