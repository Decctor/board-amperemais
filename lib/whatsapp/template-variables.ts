export type TWhatsappTemplateVariables = {
	clientName: string;
	clientPhoneNumber: string;
	clientEmail: string;
	clientSegmentation: string | null;
	clientFavoriteProduct: string | null;
	clientFavoriteProductGroup: string | null;
	clientSuggestedProduct: string | null;
};

export const WhatsappTemplateVariables: {
	id: string;
	label: string;
	value: keyof TWhatsappTemplateVariables;
	description: string;
}[] = [
	{
		id: "client_name",
		label: "Nome do Cliente",
		value: "clientName",
		description: "Nome completo do cliente registrado no banco de dados.",
	},
	{
		id: "client_phone_number",
		label: "Número de Telefone do Cliente",
		value: "clientPhoneNumber",
		description: "Número de telefone do cliente registrado no banco de dados.",
	},
	{
		id: "client_email",
		label: "Email do Cliente",
		value: "clientEmail",
		description: "Email do cliente registrado no banco de dados.",
	},
	{
		id: "client_segmentation",
		label: "Segmentação do Cliente",
		value: "clientSegmentation",
		description: "Segmentação do cliente registrado no banco de dados.",
	},
	{
		id: "client_favorite_product",
		label: "Produto Favorito do Cliente",
		value: "clientFavoriteProduct",
		description: "Produto favorito do cliente registrado no banco de dados.",
	},
	{
		id: "client_favorite_product_group",
		label: "Grupo de Produtos Favorito do Cliente",
		value: "clientFavoriteProductGroup",
		description: "Grupo de produtos favorito do cliente registrado no banco de dados.",
	},
	{
		id: "client_suggested_product",
		label: "Produto Sugerido para o Cliente",
		value: "clientSuggestedProduct",
		description: "Produto sugerido para o cliente registrado no banco de dados.",
	},
];
