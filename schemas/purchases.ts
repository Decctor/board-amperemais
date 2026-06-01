import { z } from "zod";
import { PurchaseStatusEnum } from "./enums";

export const PurchaseSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	idExterno: z.string({ invalid_type_error: "Tipo não válido para o ID externo da compra." }).optional().nullable(),
	status: PurchaseStatusEnum.default("RASCUNHO"),
	titulo: z.string({
		required_error: "Título da compra não informado.",
		invalid_type_error: "Tipo não válido para o título da compra.",
	}),
	lancamentoContabilId: z.string({ invalid_type_error: "Tipo não válido para o ID do lançamento contábil." }).optional().nullable(),
	pedidoData: z
		.string({ invalid_type_error: "Tipo não válido para a data do pedido." })
		.datetime({ message: "Tipo não válido para a data do pedido." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	pedidoFornecedorNome: z.string({ invalid_type_error: "Tipo não válido para o nome do fornecedor do pedido." }).optional().nullable(),
	pedidoFornecedorCnpj: z.string({ invalid_type_error: "Tipo não válido para o CNPJ do fornecedor do pedido." }).optional().nullable(),
	pedidoFornecedorTelefone: z.string({ invalid_type_error: "Tipo não válido para o telefone do fornecedor do pedido." }).optional().nullable(),
	pedidoFornecedorEmail: z.string({ invalid_type_error: "Tipo não válido para o email do fornecedor do pedido." }).optional().nullable(),
	transporteTransportadoraNome: z.string({ invalid_type_error: "Tipo não válido para o nome da transportadora." }).optional().nullable(),
	transporteTransportadoraCnpj: z.string({ invalid_type_error: "Tipo não válido para o CNPJ da transportadora." }).optional().nullable(),
	transporteTransportadoraTelefone: z.string({ invalid_type_error: "Tipo não válido para o telefone da transportadora." }).optional().nullable(),
	transporteTransportadoraEmail: z.string({ invalid_type_error: "Tipo não válido para o email da transportadora." }).optional().nullable(),
	transporteLinkRastreio: z.string({ invalid_type_error: "Tipo não válido para o link de rastreio." }).optional().nullable(),
	entregaDataEnvio: z
		.string({ invalid_type_error: "Tipo não válido para a data de envio." })
		.datetime({ message: "Tipo não válido para a data de envio." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	entregaDataRecebimentoPrevisao: z
		.string({ invalid_type_error: "Tipo não válido para a data prevista de recebimento." })
		.datetime({ message: "Tipo não válido para a data prevista de recebimento." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	entregaDataRecebimentoEfetivacao: z
		.string({ invalid_type_error: "Tipo não válido para a data de efetivação do recebimento." })
		.datetime({ message: "Tipo não válido para a data de efetivação do recebimento." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para a data de inserção." })
		.datetime({ message: "Tipo não válido para a data de inserção." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
	dataEfetivacao: z
		.string({ invalid_type_error: "Tipo não válido para a data de efetivação." })
		.datetime({ message: "Tipo não válido para a data de efetivação." })
		.nullable()
		.default(new Date().toISOString())
		.transform((val) => (val ? new Date(val) : null)),
	dataUltimaAtualizacao: z
		.string({ invalid_type_error: "Tipo não válido para a data da última atualização." })
		.datetime({ message: "Tipo não válido para a data da última atualização." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
	autorId: z.string({ invalid_type_error: "Tipo não válido para o ID do autor." }).optional().nullable(),
});
export type TPurchase = z.infer<typeof PurchaseSchema>;

export function refinePurchaseStatusAndDeliveryDate(
	data: { status?: unknown; entregaDataRecebimentoEfetivacao?: unknown },
	ctx: z.RefinementCtx,
) {
	const isReceived = data.status === "RECEBIDA";
	const hasReceiptDate = !!data.entregaDataRecebimentoEfetivacao;
	if (isReceived && !hasReceiptDate) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Compras com status RECEBIDA precisam ter a data de recebimento informada.",
			path: ["entregaDataRecebimentoEfetivacao"],
		});
	}
	if (!isReceived && hasReceiptDate) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Data de recebimento só pode ser preenchida quando o status for RECEBIDA.",
			path: ["entregaDataRecebimentoEfetivacao"],
		});
	}
}

export const PurchaseItemSchema = z.object({
	organizacaoId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para o ID da organização.",
	}),
	compraId: z.string({
		required_error: "ID da compra não informado.",
		invalid_type_error: "Tipo não válido para o ID da compra.",
	}),
	produtoId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo não válido para o ID do produto.",
	}),
	produtoVarianteId: z.string({ invalid_type_error: "Tipo não válido para o ID da variante do produto." }).optional().nullable(),
	snapshotProdutoDescricao: z.string({
		required_error: "Descrição do snapshot do produto não informada.",
		invalid_type_error: "Tipo não válido para a descrição do snapshot do produto.",
	}),
	snapshotProdutoCodigo: z.string({
		required_error: "Código do snapshot do produto não informado.",
		invalid_type_error: "Tipo não válido para o código do snapshot do produto.",
	}),
	quantidade: z.number({
		required_error: "Quantidade do item da compra não informada.",
		invalid_type_error: "Tipo não válido para a quantidade do item da compra.",
	}),
	valorUnitarioBruto: z.number({
		required_error: "Valor unitário bruto não informado.",
		invalid_type_error: "Tipo não válido para o valor unitário bruto.",
	}),
	valorUnitarioLiquido: z.number({ invalid_type_error: "Tipo não válido para o valor unitário líquido." }).optional().nullable(),
	valorTotalBruto: z.number({
		required_error: "Valor total bruto não informado.",
		invalid_type_error: "Tipo não válido para o valor total bruto.",
	}),
	valorTotalLiquido: z.number({ invalid_type_error: "Tipo não válido para o valor total líquido." }).optional().nullable(),
	descontosTotal: z.number({ invalid_type_error: "Tipo não válido para o total de descontos." }).optional().nullable(),
	acrescimosTotal: z.number({ invalid_type_error: "Tipo não válido para o total de acréscimos." }).optional().nullable(),
	externoQtde: z.number({ invalid_type_error: "Tipo não válido para a quantidade externa." }).optional().nullable(),
	externoValor: z.number({ invalid_type_error: "Tipo não válido para o valor externo." }).optional().nullable(),
	externoUnidade: z.string({ invalid_type_error: "Tipo não válido para a unidade externa." }).optional().nullable(),
	externoFatorConversao: z.number({ invalid_type_error: "Tipo não válido para o fator de conversão externo." }).optional().nullable(),
	anotacoes: z.string({ invalid_type_error: "Tipo não válido para as anotações do item da compra." }).optional().nullable(),
	dataInsercao: z
		.string({ invalid_type_error: "Tipo não válido para a data de inserção." })
		.datetime({ message: "Tipo não válido para a data de inserção." })
		.default(new Date().toISOString())
		.transform((val) => new Date(val)),
});
export type TPurchaseItem = z.infer<typeof PurchaseItemSchema>;
