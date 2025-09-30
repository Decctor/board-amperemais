import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export default function Teste() {
	const [userIdApp, setUserIdApp] = useState("user-teste-001");
	const [userName, setUserName] = useState("Usuário Teste");
	const [userEmail, setUserEmail] = useState("usuario@teste.com");

	const [clientName, setClientName] = useState("Cliente Teste");
	const [clientEmail, setClientEmail] = useState("cliente@teste.com");
	const [clientPhone, setClientPhone] = useState("+5511999999999");

	const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
	const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);
	const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(null);

	const [messageText, setMessageText] = useState("");
	const [messageSender, setMessageSender] = useState<"USUARIO" | "CLIENTE">("USUARIO");

	// Queries
	const allUsers = useQuery(api.queries.chats.getAllUsers);
	const allClients = useQuery(api.queries.chats.getAllClients);
	const allChats = useQuery(api.queries.chats.getAllChats);
	const chatMessages = useQuery(api.queries.chats.getChatMessagesByChatId, selectedChatId ? { chatId: selectedChatId } : "skip");

	// Mutations
	const createUser = useMutation(api.mutations.users.createUser);
	const createClient = useMutation(api.mutations.clients.createClient);
	const createChat = useMutation(api.mutations.chats.createChat);
	const sendMessage = useMutation(api.mutations.chatMessages.sendMessage);

	const handleCreateUser = async () => {
		try {
			const userId = await createUser({
				idApp: userIdApp,
				nome: userName,
				email: userEmail,
				senha: "senha123",
			});
			toast.success("Usuário criado com sucesso!");
			setSelectedUserId(userId);
		} catch (error) {
			toast.error(`Erro ao criar usuário: ${error}`);
		}
	};

	const handleCreateClient = async () => {
		try {
			const clientId = await createClient({
				idApp: `client-${Date.now()}`,
				nome: clientName,
				email: clientEmail,
				telefone: clientPhone,
				telefoneBase: clientPhone.replace(/\D/g, ""),
			});
			toast.success("Cliente criado com sucesso!");
			setSelectedClientId(clientId);
		} catch (error) {
			toast.error(`Erro ao criar cliente: ${error}`);
		}
	};

	const handleCreateChat = async () => {
		if (!selectedClientId) {
			toast.error("Selecione um cliente primeiro!");
			return;
		}

		try {
			const chatId = await createChat({
				clienteId: selectedClientId,
				agenteId: selectedUserId || undefined,
				canal: "WHATSAPP",
			});
			toast.success("Chat criado com sucesso!");
			setSelectedChatId(chatId);
		} catch (error) {
			toast.error(`Erro ao criar chat: ${error}`);
		}
	};

	const handleSendMessage = async () => {
		if (!selectedChatId) {
			toast.error("Selecione um chat primeiro!");
			return;
		}

		if (!messageText.trim()) {
			toast.error("Digite uma mensagem!");
			return;
		}

		try {
			await sendMessage({
				chatId: selectedChatId,
				autorTipo: messageSender,
				autorUsuarioId: messageSender === "USUARIO" && selectedUserId ? selectedUserId : undefined,
				autorClienteId: messageSender === "CLIENTE" && selectedClientId ? selectedClientId : undefined,
				tipo: "TEXTO",
				conteudoTexto: messageText,
			});
			toast.success("Mensagem enviada!");
			setMessageText("");
		} catch (error) {
			toast.error(`Erro ao enviar mensagem: ${error}`);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-7xl mx-auto">
				<h1 className="text-3xl font-bold mb-8 text-gray-900">🧪 Teste do Módulo de Atendimentos</h1>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Seção de Criação */}
					<div className="space-y-6">
						{/* Criar Usuário */}
						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-semibold mb-4 text-blue-600">👤 Criar Usuário</h2>
							<div className="space-y-3">
								<input
									type="text"
									placeholder="ID App"
									value={userIdApp}
									onChange={(e) => setUserIdApp(e.target.value)}
									className="w-full px-3 py-2 border rounded"
								/>
								<input
									type="text"
									placeholder="Nome"
									value={userName}
									onChange={(e) => setUserName(e.target.value)}
									className="w-full px-3 py-2 border rounded"
								/>
								<input
									type="email"
									placeholder="Email"
									value={userEmail}
									onChange={(e) => setUserEmail(e.target.value)}
									className="w-full px-3 py-2 border rounded"
								/>
								<button type="button" onClick={handleCreateUser} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
									Criar Usuário
								</button>
							</div>
						</div>

						{/* Criar Cliente */}
						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-semibold mb-4 text-green-600">👥 Criar Cliente</h2>
							<div className="space-y-3">
								<input
									type="text"
									placeholder="Nome"
									value={clientName}
									onChange={(e) => setClientName(e.target.value)}
									className="w-full px-3 py-2 border rounded"
								/>
								<input
									type="email"
									placeholder="Email"
									value={clientEmail}
									onChange={(e) => setClientEmail(e.target.value)}
									className="w-full px-3 py-2 border rounded"
								/>
								<input
									type="text"
									placeholder="Telefone"
									value={clientPhone}
									onChange={(e) => setClientPhone(e.target.value)}
									className="w-full px-3 py-2 border rounded"
								/>
								<button type="button" onClick={handleCreateClient} className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
									Criar Cliente
								</button>
							</div>
						</div>

						{/* Criar Chat */}
						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-semibold mb-4 text-purple-600">💬 Criar Chat</h2>
							<div className="space-y-3">
								<select
									value={selectedUserId || ""}
									onChange={(e) => setSelectedUserId(e.target.value as Id<"users">)}
									className="w-full px-3 py-2 border rounded"
								>
									<option value="">Sem agente</option>
									{allUsers?.map((user) => (
										<option key={user._id} value={user._id}>
											{user.nome}
										</option>
									))}
								</select>
								<select
									value={selectedClientId || ""}
									onChange={(e) => setSelectedClientId(e.target.value as Id<"clients">)}
									className="w-full px-3 py-2 border rounded"
								>
									<option value="">Selecione um cliente</option>
									{allClients?.map((client) => (
										<option key={client._id} value={client._id}>
											{client.nome}
										</option>
									))}
								</select>
								<button type="button" onClick={handleCreateChat} className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
									Criar Chat
								</button>
							</div>
						</div>

						{/* Enviar Mensagem */}
						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-semibold mb-4 text-orange-600">📨 Enviar Mensagem</h2>
							<div className="space-y-3">
								<select
									value={selectedChatId || ""}
									onChange={(e) => setSelectedChatId(e.target.value as Id<"chats">)}
									className="w-full px-3 py-2 border rounded"
								>
									<option value="">Selecione um chat</option>
									{allChats?.map((chat) => (
										<option key={chat._id} value={chat._id}>
											{chat.cliente?.nome || "Cliente desconhecido"} - {chat.agente?.nome || "Sem agente"}
										</option>
									))}
								</select>
								<select
									value={messageSender}
									onChange={(e) => setMessageSender(e.target.value as "USUARIO" | "CLIENTE")}
									className="w-full px-3 py-2 border rounded"
								>
									<option value="USUARIO">Enviar como Usuário</option>
									<option value="CLIENTE">Enviar como Cliente</option>
								</select>
								<textarea
									placeholder="Digite sua mensagem..."
									value={messageText}
									onChange={(e) => setMessageText(e.target.value)}
									className="w-full px-3 py-2 border rounded h-24"
								/>
								<button type="button" onClick={handleSendMessage} className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
									Enviar Mensagem
								</button>
							</div>
						</div>
					</div>

					{/* Seção de Visualização */}
					<div className="space-y-6">
						{/* Usuários */}
						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-semibold mb-4 text-gray-800">👥 Usuários ({allUsers?.length || 0})</h2>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{allUsers?.map((user) => (
									<div key={user._id} className="p-3 bg-blue-50 rounded border border-blue-200">
										<div className="font-semibold">{user.nome}</div>
										<div className="text-sm text-gray-600">{user.email}</div>
										<div className="text-xs text-gray-500">ID: {user._id}</div>
									</div>
								))}
							</div>
						</div>

						{/* Clientes */}
						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-semibold mb-4 text-gray-800">🎯 Clientes ({allClients?.length || 0})</h2>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{allClients?.map((client) => (
									<div key={client._id} className="p-3 bg-green-50 rounded border border-green-200">
										<div className="font-semibold">{client.nome}</div>
										<div className="text-sm text-gray-600">{client.email}</div>
										<div className="text-sm text-gray-600">{client.telefone}</div>
										<div className="text-xs text-gray-500">ID: {client._id}</div>
									</div>
								))}
							</div>
						</div>

						{/* Chats */}
						<div className="bg-white rounded-lg shadow p-6">
							<h2 className="text-xl font-semibold mb-4 text-gray-800">💬 Chats ({allChats?.length || 0})</h2>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{allChats?.map((chat) => (
									<button
										type="button"
										key={chat._id}
										className={`w-full p-3 rounded border cursor-pointer text-left ${
											selectedChatId === chat._id ? "bg-purple-100 border-purple-400" : "bg-purple-50 border-purple-200"
										}`}
										onClick={() => setSelectedChatId(chat._id)}
									>
										<div className="font-semibold">{chat.cliente?.nome || "Cliente desconhecido"}</div>
										<div className="text-sm text-gray-600">Agente: {chat.agente?.nome || "Sem agente"}</div>
										<div className="text-sm text-gray-600">
											Não lidas: Usuário({chat.nMensagensNaoLidasUsuario || 0}) | Cliente(
											{chat.nMensagensNaoLidasCliente || 0})
										</div>
										{chat.ultimaMensagemConteudo && <div className="text-xs text-gray-500 mt-1 truncate">Última: {chat.ultimaMensagemConteudo}</div>}
										<div className="text-xs text-gray-500">ID: {chat._id}</div>
									</button>
								))}
							</div>
						</div>

						{/* Mensagens do Chat Selecionado */}
						{selectedChatId && (
							<div className="bg-white rounded-lg shadow p-6">
								<h2 className="text-xl font-semibold mb-4 text-gray-800">📩 Mensagens ({chatMessages?.length || 0})</h2>
								<div className="space-y-2 max-h-96 overflow-y-auto">
									{chatMessages?.map((message) => (
										<div
											key={message._id}
											className={`p-3 rounded ${
												message.autorTipo === "USUARIO" ? "bg-blue-50 border-l-4 border-blue-500" : "bg-green-50 border-l-4 border-green-500"
											}`}
										>
											<div className="text-xs font-semibold text-gray-600">
												{message.autorTipo === "USUARIO" ? "🧑‍💼 Usuário" : "👤 Cliente"}: {message.autor?.nome || "Desconhecido"}
											</div>
											<div className="mt-1">{message.conteudoTexto}</div>
											<div className="text-xs text-gray-500 mt-1">{new Date(message.envioData).toLocaleString("pt-BR")}</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
